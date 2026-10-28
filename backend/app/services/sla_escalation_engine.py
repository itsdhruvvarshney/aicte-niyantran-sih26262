from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import get_simulated_now
from ..models import (
    Application,
    DeficiencyCycle,
    EscalationAlert,
    EvcSchedule,
    NotificationLog,
    Obligation,
    SystemClockState,
    User,
)
from .audit_engine import append_audit_event
from .workflow_engine import ensure_utc


def compute_priority_index_for_case(
    app: Application,
    obligations: List[Obligation],
    now: datetime,
    clock_state: Optional[SystemClockState] = None,
) -> Dict[str, Any]:
    """
    Computes the Critique-Hardened Operational Priority Index (P):
        P = (w1 * D + w2 * A + w3 * B) + O
    Where:
    - D in [0, 100]: Deadline Proximity Ratio
    - A in [0, 100]: Stage Inactivity / Ageing Ratio
    - B in [0, 100]: Downstream Dependency Blocker Score (25 pts per blocked stage)
    - O in [0, 100]: Overdue Breach Boost = min(100, 10 + 5 * days_overdue) when now > due_at
    """
    w1 = clock_state.w_deadline if clock_state else 0.40
    w2 = clock_state.w_ageing if clock_state else 0.35
    w3 = clock_state.w_blocker if clock_state else 0.25

    now_utc = ensure_utc(now)

    active_ob = next(
        (o for o in obligations if o.stage_code == app.current_stage and o.state not in ("VERIFIED", "CLOSED")),
        None,
    )
    if not active_ob:
        active_ob = next(
            (o for o in obligations if o.state not in ("VERIFIED", "CLOSED")),
            None,
        )

    if not active_ob:
        return {
            "priority_score": 0.0,
            "risk_band": "COMPLETED",
            "D_deadline_proximity": 0.0,
            "A_stage_ageing": 0.0,
            "B_dependency_blocking": 0.0,
            "O_overdue_boost": 0.0,
            "hours_remaining": 0.0,
            "days_overdue": 0.0,
            "weights": {"w1": w1, "w2": w2, "w3": w3},
            "label": "Configurable Operational Priority Score (Decision-Support Heuristic)",
        }

    due_utc = ensure_utc(active_ob.due_at)
    start_utc = ensure_utc(active_ob.started_at or app.submitted_at)
    last_act_utc = ensure_utc(app.last_action_at)

    total_sla_hours = max(24.0, float(active_ob.sla_days) * 24.0)
    elapsed_hours = max(0.0, (now_utc - start_utc).total_seconds() / 3600.0)
    inactive_hours = max(0.0, (now_utc - last_act_utc).total_seconds() / 3600.0)
    hours_remaining = (due_utc - now_utc).total_seconds() / 3600.0

    D = min(100.0, max(0.0, 100.0 * (elapsed_hours / total_sla_hours)))
    A = min(100.0, max(0.0, 100.0 * (inactive_hours / total_sla_hours)))

    blocked_downstream_count = sum(
        1 for o in obligations
        if o.obligation_type == "WORKFLOW_STAGE" and o.order_index > active_ob.order_index
    )
    B = min(100.0, 25.0 * float(blocked_downstream_count))

    base_score = (w1 * D) + (w2 * A) + (w3 * B)

    if now_utc > due_utc:
        days_overdue = (now_utc - due_utc).total_seconds() / 86400.0
        O = min(100.0, 10.0 + 5.0 * days_overdue)
        risk_band = "CRITICAL_OVERDUE"
    else:
        days_overdue = 0.0
        O = 0.0
        if base_score >= 75.0 or hours_remaining <= 48.0:
            risk_band = "AT_RISK_APPROACHING"
        elif base_score >= 45.0:
            risk_band = "MODERATE_WATCH"
        else:
            risk_band = "ON_TRACK"

    total_p = round(base_score + O, 1)
    return {
        "priority_score": total_p,
        "risk_band": risk_band,
        "D_deadline_proximity": round(D, 1),
        "A_stage_ageing": round(A, 1),
        "B_dependency_blocking": round(B, 1),
        "O_overdue_boost": round(O, 1),
        "hours_remaining": round(hours_remaining, 1),
        "days_overdue": round(days_overdue, 1),
        "active_obligation_title": active_ob.title,
        "due_at_iso": due_utc.isoformat(),
        "weights": {"w1": w1, "w2": w2, "w3": w3},
        "label": "Configurable Operational Priority Score (Decision-Support Heuristic)",
    }


def _create_idempotent_alert(
    db: Session,
    app: Application,
    ob: Obligation,
    alert_band: str,
    severity: str,
    recipient_role: str,
    explanation_text: str,
    next_permitted_action: str,
    rule_citation: str,
    triggered_at: datetime,
) -> int:
    exists = (
        db.query(EscalationAlert)
        .filter_by(obligation_id=ob.id, alert_band=alert_band)
        .first()
    )
    if exists:
        return 0

    try:
        with db.begin_nested():
            alert = EscalationAlert(
                application_id=app.id,
                obligation_id=ob.id,
                case_number=app.case_number,
                jurisdiction_code=app.jurisdiction_code,
                alert_band=alert_band,
                severity=severity,
                recipient_role=recipient_role,
                explanation_text=explanation_text,
                next_permitted_action=next_permitted_action,
                rule_citation=rule_citation,
                triggered_at=triggered_at,
                is_acknowledged=False,
            )
            db.add(alert)
            db.flush()

            db.add(
                NotificationLog(
                    escalation_alert_id=alert.id,
                    channel="IN_APP_AND_EMAIL",
                    recipient_role=recipient_role,
                    delivery_status="DELIVERED",
                    retry_count=0,
                    dispatched_at=triggered_at,
                )
            )
        return 1
    except IntegrityError:
        return 0


def run_sla_and_expiry_sweep(db: Session, simulated_now: Optional[datetime] = None) -> Dict[str, Any]:
    now = ensure_utc(simulated_now or get_simulated_now(db))
    open_obligations = (
        db.query(Obligation)
        .filter(Obligation.state.notin_(["VERIFIED", "CLOSED"]))
        .all()
    )

    new_alerts_created = 0
    total_overdue_obligations = 0

    for ob in open_obligations:
        app = db.query(Application).filter_by(id=ob.application_id).first()
        if not app:
            continue

        due_utc = ensure_utc(ob.due_at)
        hours_remaining = (due_utc - now).total_seconds() / 3600.0
        days_remaining = hours_remaining / 24.0

        if hours_remaining < 0:
            total_overdue_obligations += 1

        if ob.obligation_type == "LEASE_DOCUMENT_VALIDITY" and ob.document_expiry_date:
            days_to_expiry = (ob.document_expiry_date - now.date()).days
            thresholds = [
                (90, "LEASE_T_MINUS_90D", "INFO", "INSTITUTION", "Prepare & upload renewed Lease Deed / NOC"),
                (60, "LEASE_T_MINUS_60D", "WARNING", "INSTITUTION", "Upload renewed Lease Deed / Fire NOC before 60-day window"),
                (30, "LEASE_T_MINUS_30D", "WARNING", "REGIONAL_OFFICER", "Follow up with Institution on 30-day expiring document"),
                (7, "LEASE_T_MINUS_7D", "CRITICAL_ESCALATION", "REGIONAL_OFFICER", "Urgent 7-day expiry notice; verify renewal submission"),
                (0, "LEASE_EXPIRED_ESCALATION", "CRITICAL_ESCALATION", "BUREAU_ADMIN", "Document EXPIRED: Escalate to Competent Authority for regulatory action"),
            ]
            for limit_days, band, sev, role, next_act in thresholds:
                if days_to_expiry <= limit_days:
                    new_alerts_created += _create_idempotent_alert(
                        db=db,
                        app=app,
                        ob=ob,
                        alert_band=band,
                        severity=sev,
                        recipient_role=role,
                        explanation_text=(
                            f"[{band}] Prescribed document '{ob.title}' for {app.institution_name} "
                            f"expires on {ob.document_expiry_date} ({days_to_expiry} days remaining)."
                        ),
                        next_permitted_action=next_act,
                        rule_citation=f"PS 26262 Sec E · {ob.sla_policy_source}",
                        triggered_at=now,
                    )
        else:
            if 0.0 < hours_remaining <= 48.0:
                new_alerts_created += _create_idempotent_alert(
                    db=db,
                    app=app,
                    ob=ob,
                    alert_band="L1_APPROACHING_48H",
                    severity="WARNING",
                    recipient_role=ob.assigned_role,
                    explanation_text=(
                        f"[Level-1 Reminder] Obligation '{ob.title}' ({app.case_number}) is approaching deadline "
                        f"({round(hours_remaining, 1)} hours remaining)."
                    ),
                    next_permitted_action=f"{ob.assigned_role} must complete review or record deficiency.",
                    rule_citation=f"PS 26262 Sec B/F · {ob.sla_policy_source}",
                    triggered_at=now,
                )
            elif hours_remaining <= 0.0:
                days_over = abs(round(days_remaining, 1))
                new_alerts_created += _create_idempotent_alert(
                    db=db,
                    app=app,
                    ob=ob,
                    alert_band="L2_RO_SLA_BREACH",
                    severity="CRITICAL_ESCALATION",
                    recipient_role="REGIONAL_OFFICER",
                    explanation_text=(
                        f"[Level-2 RO Escalation] SLA breached on '{ob.title}' ({app.case_number} in {app.jurisdiction_code}). "
                        f"Overdue by {days_over} days."
                    ),
                    next_permitted_action="Regional Officer to intervene, schedule EVC, or expedite committee review.",
                    rule_citation=f"PS 26262 Sec C/D/F · {ob.sla_policy_source}",
                    triggered_at=now,
                )
                if hours_remaining < -72.0:
                    new_alerts_created += _create_idempotent_alert(
                        db=db,
                        app=app,
                        ob=ob,
                        alert_band="L3_BUREAU_HQ_ESCALATION",
                        severity="CRITICAL_ESCALATION",
                        recipient_role="BUREAU_ADMIN",
                        explanation_text=(
                            f"[Level-3 HQ Escalation] Severe SLA breach (>72h overdue: {days_over} days) on '{ob.title}' "
                            f"for {app.institution_name} ({app.jurisdiction_code}). Escalated to Regulation Bureau HQ."
                        ),
                        next_permitted_action="Regulation Bureau HQ Director oversight / SAC-SHC directive.",
                        rule_citation=f"PS 26262 Sec F Escalation Hierarchy · {ob.sla_policy_source}",
                        triggered_at=now,
                    )

    db.commit()
    total_active_alerts = db.query(EscalationAlert).count()
    return {
        "simulated_clock_utc": now.isoformat(),
        "new_alerts_created": new_alerts_created,
        "total_overdue_obligations": total_overdue_obligations,
        "total_alerts_in_ledger": total_active_alerts,
    }


def advance_or_reset_simulated_clock(
    db: Session,
    delta_days: Optional[float],
    reset_to_zero: bool,
    w_deadline: Optional[float],
    w_ageing: Optional[float],
    w_blocker: Optional[float],
    current_user: User,
) -> Dict[str, Any]:
    clock = db.query(SystemClockState).filter_by(id=1).first()
    if not clock:
        clock = SystemClockState(id=1, offset_days=0.0, w_deadline=0.40, w_ageing=0.35, w_blocker=0.25)
        db.add(clock)
        db.flush()

    old_offset = clock.offset_days
    if reset_to_zero:
        clock.offset_days = 0.0
    elif delta_days is not None:
        clock.offset_days = round(clock.offset_days + float(delta_days), 2)

    if w_deadline is not None and w_ageing is not None and w_blocker is not None:
        total_w = w_deadline + w_ageing + w_blocker
        if total_w > 0:
            clock.w_deadline = round(w_deadline / total_w, 2)
            clock.w_ageing = round(w_ageing / total_w, 2)
            clock.w_blocker = round(w_blocker / total_w, 2)

    db.flush()
    sim_now = get_simulated_now(db)

    append_audit_event(
        db,
        actor=current_user,
        action_type="TIME_TRAVEL_CLOCK_OR_WEIGHTS_UPDATED",
        entity_type="SYSTEM_CLOCK",
        old_state=f"offset={old_offset}d",
        new_state=f"offset={clock.offset_days}d",
        reason_code="LIVE_SLA_SIMULATION",
        remarks=(
            f"Simulated clock offset changed from +{old_offset}d to +{clock.offset_days}d "
            f"(Weights: w1={clock.w_deadline}, w2={clock.w_ageing}, w3={clock.w_blocker})."
        ),
        simulated_now=sim_now,
    )
    sweep_result = run_sla_and_expiry_sweep(db, simulated_now=sim_now)
    return {
        "offset_days": clock.offset_days,
        "simulated_now_utc": sim_now.isoformat(),
        "weights": {
            "w_deadline": clock.w_deadline,
            "w_ageing": clock.w_ageing,
            "w_blocker": clock.w_blocker,
        },
        "sweep_result": sweep_result,
    }


def acknowledge_escalation_alert(
    db: Session,
    alert_id: int,
    note: str,
    current_user: User,
) -> EscalationAlert:
    alert = db.query(EscalationAlert).filter_by(id=alert_id).first()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Escalation alert not found.")

    now = get_simulated_now(db)
    alert.is_acknowledged = True
    alert.acknowledged_by_name = current_user.full_name
    alert.acknowledged_at = now
    alert.acknowledgement_note = note or "Acknowledged by responsible officer."

    append_audit_event(
        db,
        actor=current_user,
        action_type="ESCALATION_ALERT_ACKNOWLEDGED",
        application_id=alert.application_id,
        case_number=alert.case_number,
        entity_type="ESCALATION_ALERT",
        old_state="UNACKNOWLEDGED",
        new_state="ACKNOWLEDGED",
        reason_code=alert.alert_band,
        remarks=alert.acknowledgement_note,
        simulated_now=now,
    )
    db.commit()
    db.refresh(alert)
    return alert


def get_regional_and_bottleneck_analytics(db: Session) -> Dict[str, Any]:
    now = get_simulated_now(db)
    clock = db.query(SystemClockState).filter_by(id=1).first()
    apps = db.query(Application).all()
    all_obs = db.query(Obligation).all()
    obs_by_app: Dict[int, List[Obligation]] = {}
    for o in all_obs:
        obs_by_app.setdefault(o.application_id, []).append(o)

    backlog_root_causes = {
        "AWAITING_OFFICER_SCRUTINY_OR_DECISION": 0,
        "AWAITING_INSTITUTION_DEFICIENCY_RESPONSE": 0,
        "AWAITING_RO_EVC_SCHEDULING_OR_VISIT": 0,
        "AWAITING_OFFICER_EVIDENCE_VERIFICATION": 0,
        "BLOCKED_BY_UNRESOLVED_PREREQUISITE": 0,
        "COMPLIANT_OR_CLOSED": 0,
    }

    ageing_buckets = {"0_TO_3_DAYS": 0, "4_TO_7_DAYS": 0, "8_TO_15_DAYS": 0, "OVER_15_DAYS": 0}
    region_summary: Dict[str, Dict[str, int]] = {}
    stage_distribution: Dict[str, int] = {}

    for app in apps:
        stage_distribution[app.current_stage] = stage_distribution.get(app.current_stage, 0) + 1
        reg = region_summary.setdefault(
            app.jurisdiction_code,
            {"total": 0, "in_progress": 0, "reverted_deficient": 0, "conditional_approved": 0, "overdue": 0},
        )
        reg["total"] += 1
        if app.overall_status == "IN_PROGRESS":
            reg["in_progress"] += 1
        elif app.overall_status == "REVERTED_DEFICIENT":
            reg["reverted_deficient"] += 1
        elif app.overall_status == "CONDITIONAL_APPROVED":
            reg["conditional_approved"] += 1

        app_obs = obs_by_app.get(app.id, [])
        p_info = compute_priority_index_for_case(app, app_obs, now, clock)
        if p_info["risk_band"] == "CRITICAL_OVERDUE":
            reg["overdue"] += 1

        age_days = max(0.0, (ensure_utc(now) - ensure_utc(app.last_action_at)).total_seconds() / 86400.0)
        if age_days <= 3:
            ageing_buckets["0_TO_3_DAYS"] += 1
        elif age_days <= 7:
            ageing_buckets["4_TO_7_DAYS"] += 1
        elif age_days <= 15:
            ageing_buckets["8_TO_15_DAYS"] += 1
        else:
            ageing_buckets["OVER_15_DAYS"] += 1

        has_submitted_evidence = any(o.state == "SUBMITTED" for o in app_obs)
        if app.overall_status == "REVERTED_DEFICIENT":
            backlog_root_causes["AWAITING_INSTITUTION_DEFICIENCY_RESPONSE"] += 1
        elif has_submitted_evidence:
            backlog_root_causes["AWAITING_OFFICER_EVIDENCE_VERIFICATION"] += 1
        elif app.current_stage in ("EVC_QUEUE", "EVC_VISIT") and app.overall_status == "IN_PROGRESS":
            backlog_root_causes["AWAITING_RO_EVC_SCHEDULING_OR_VISIT"] += 1
        elif app.overall_status == "IN_PROGRESS":
            backlog_root_causes["AWAITING_OFFICER_SCRUTINY_OR_DECISION"] += 1
        elif app.overall_status == "CONDITIONAL_APPROVED":
            backlog_root_causes["BLOCKED_BY_UNRESOLVED_PREREQUISITE"] += 1
        else:
            backlog_root_causes["COMPLIANT_OR_CLOSED"] += 1

    evc_records = db.query(EvcSchedule).all()
    evc_breakdown = {
        "WAITING_PRELIMINARY_SCRUTINY": 0,
        "QUEUED_FOR_SCHEDULING": 0,
        "COMMITTEE_ASSIGNED_SCHEDULED": 0,
        "VERIFIED_COMPLETE": 0,
    }
    for e in evc_records:
        evc_breakdown[e.queue_status] = evc_breakdown.get(e.queue_status, 0) + 1

    return {
        "simulated_now_utc": now.isoformat(),
        "total_applications": len(apps),
        "backlog_root_causes_6_buckets": backlog_root_causes,
        "ageing_buckets": ageing_buckets,
        "region_wise_summary": region_summary,
        "stage_distribution": stage_distribution,
        "evc_queue_breakdown": evc_breakdown,
    }