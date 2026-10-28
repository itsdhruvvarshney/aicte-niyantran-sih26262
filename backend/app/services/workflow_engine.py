from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..auth import enforce_role_and_jurisdiction, get_simulated_now
from ..models import (
    Application,
    DeficiencyCycle,
    EvcSchedule,
    Obligation,
    User,
    WorkflowRuleVersion,
)
from .audit_engine import append_audit_event


def ensure_utc(dt: Optional[datetime]) -> datetime:
    """Ensures datetime objects are timezone-aware UTC across both PostgreSQL and SQLite."""
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def create_application_and_spawn_dag(
    db: Session,
    institution_name: str,
    jurisdiction_code: str,
    application_type: str,
    programme_name: str,
    academic_year: str,
    include_post_approval_trackers: bool,
    lease_expiry_days_from_now: int,
    current_user: User,
) -> Application:
    """
    Dynamically selects the active APH workflow route for the application category
    and spawns all stage obligations + EVC queue trackers + post-approval obligations.
    """
    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=["INSTITUTION", "REGIONAL_OFFICER", "BUREAU_ADMIN"],
    )

    rule = (
        db.query(WorkflowRuleVersion)
        .filter_by(application_type=application_type, is_active=True)
        .first()
    )
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No active workflow rule configured for application_type '{application_type}'.",
        )

    now = get_simulated_now(db)
    total_count = db.query(Application).count() + 1060
    case_number = f"AICTE-2026-{jurisdiction_code}-{total_count}"

    stages_spec = rule.stages_dag_json.get("stages", [])
    if not stages_spec:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Configured workflow rule contains no stage definitions.",
        )

    first_stage_code = stages_spec[0]["code"]
    inst_id = current_user.institution_id or (200 + total_count)

    app_record = Application(
        case_number=case_number,
        institution_id=inst_id,
        institution_name=institution_name,
        jurisdiction_code=jurisdiction_code,
        application_type=application_type,
        academic_year=academic_year,
        programme_name=programme_name,
        rule_version_id=rule.id,
        current_stage=first_stage_code,
        overall_status="IN_PROGRESS",
        submitted_at=now,
        last_action_at=now,
    )
    db.add(app_record)
    db.flush()

    cumulative_days = 0
    for idx, st in enumerate(stages_spec):
        sla_days = int(st.get("sla_days", 7))
        prereqs = st.get("prerequisites", [])
        is_first = idx == 0

        if is_first:
            initial_state = "UNDER_VERIFICATION"
            blocker = (
                "EVC_SCHEDULING_INCOMPLETE"
                if st["code"] == "EVC_QUEUE"
                else "SCRUTINY_REVIEW_PENDING"
            )
            due_dt = now + timedelta(days=sla_days)
        else:
            initial_state = "REQUIRED"
            blocker = f"AWAITING_PREREQUISITE_{prereqs[0]}" if prereqs else "AWAITING_PREREQUISITE"
            due_dt = now + timedelta(days=cumulative_days + sla_days)

        cumulative_days += sla_days
        db.add(
            Obligation(
                application_id=app_record.id,
                obligation_type="WORKFLOW_STAGE",
                stage_code=st["code"],
                order_index=int(st.get("order", idx + 1)),
                title=st["title"],
                description=f"Governed by {rule.rule_code} v{rule.version_num} ({rule.source_citation})",
                assigned_role=st["assigned_role"],
                prerequisite_codes=prereqs,
                state=initial_state,
                blocker_reason_code=blocker,
                sla_days=sla_days,
                sla_policy_source=rule.sla_policy_label,
                started_at=now if is_first else None,
                due_at=due_dt,
            )
        )

    if rule.stages_dag_json.get("requires_evc"):
        starts_at_evc = first_stage_code in ("EVC_QUEUE", "EVC_VISIT")
        db.add(
            EvcSchedule(
                application_id=app_record.id,
                is_new_institution=(application_type == "NEW_INSTITUTION"),
                queue_status=(
                    "QUEUED_FOR_SCHEDULING"
                    if starts_at_evc
                    else "WAITING_PRELIMINARY_SCRUTINY"
                ),
                queued_at=now if starts_at_evc else None,
                scheduling_sla_due_at=(now + timedelta(days=4)) if starts_at_evc else None,
                completion_sla_due_at=(now + timedelta(days=11)) if starts_at_evc else None,
                inspection_mode="ONLINE_APH",
            )
        )

    if include_post_approval_trackers:
        db.add(
            Obligation(
                application_id=app_record.id,
                obligation_type="TIME_BOUND_UNDERTAKING",
                stage_code="UNDERTAKING_COMPLIANCE",
                order_index=len(stages_spec) + 1,
                title="Time-Bound Undertaking: Faculty Cadre & Lab Equipment Fulfilment Affidavit",
                description="Post-approval conditional undertaking requiring documentary evidence and officer verification.",
                assigned_role="SCRUTINY_OFFICER",
                prerequisite_codes=["COMPETENT_AUTHORITY"],
                state="REQUIRED",
                blocker_reason_code="REQUIRED_DOC_MISSING",
                sla_days=45,
                sla_policy_source="CONDITIONAL_UNDERTAKING_SLA_POLICY",
                due_at=now + timedelta(days=45),
                document_type="UNDERTAKING_AFFIDAVIT",
            )
        )
        expiry_dt = (now + timedelta(days=lease_expiry_days_from_now)).date()
        db.add(
            Obligation(
                application_id=app_record.id,
                obligation_type="LEASE_DOCUMENT_VALIDITY",
                stage_code="LEASE_DEED_RENEWAL",
                order_index=len(stages_spec) + 2,
                title="Registered Land Lease Deed & Fire Safety NOC Validity",
                description="Continuous tracking of prescribed lease expiry and renewal verification.",
                assigned_role="REGIONAL_OFFICER",
                prerequisite_codes=[],
                state="REQUIRED",
                blocker_reason_code="REQUIRED_DOC_MISSING",
                sla_days=lease_expiry_days_from_now,
                sla_policy_source="PRESCRIBED_DOC_VALIDITY_POLICY (T-90/60/30/7d)",
                due_at=now + timedelta(days=lease_expiry_days_from_now),
                document_type="LAND_LEASE_DEED",
                document_issue_date=date(2021, 6, 1),
                document_expiry_date=expiry_dt,
            )
        )

    append_audit_event(
        db,
        actor=current_user,
        action_type="APPLICATION_SUBMITTED_AND_ROUTED",
        application_id=app_record.id,
        case_number=app_record.case_number,
        old_state="NONE",
        new_state=first_stage_code,
        reason_code=rule.rule_code,
        remarks=(
            f"Application routed to '{rule.stages_dag_json.get('route_name')}' "
            f"under {rule.rule_code} v{rule.version_num}."
        ),
        rule_version_id=rule.id,
        simulated_now=now,
    )
    db.commit()
    db.refresh(app_record)
    return app_record


def complete_stage_and_advance(
    db: Session,
    application_id: int,
    target_stage_code: Optional[str],
    remarks: str,
    decision_order_ref: Optional[str],
    is_statutory_override: bool,
    override_order_ref: Optional[str],
    current_user: User,
) -> Application:
    """
    Verifies the current stage and advances the workflow to the next stage in the configured DAG.
    Enforces HTTP 403 (RBAC/Jurisdiction/Statutory Lock), HTTP 409 (Unmet Prerequisites/Open Deficiency), and HTTP 422.
    """
    app = db.query(Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    stage_obs = (
        db.query(Obligation)
        .filter_by(application_id=app.id, obligation_type="WORKFLOW_STAGE")
        .order_by(Obligation.order_index.asc())
        .all()
    )
    ob_map = {o.stage_code: o for o in stage_obs}

    stage_to_check = target_stage_code or app.current_stage
    if stage_to_check not in ob_map:
        raise HTTPException(status_code=422, detail=f"Stage '{stage_to_check}' does not exist in this route.")

    target_ob = ob_map[stage_to_check]

    if target_stage_code and target_stage_code != app.current_stage and not is_statutory_override:
        unmet = [
            p for p in target_ob.prerequisite_codes
            if ob_map.get(p) and ob_map[p].state not in ("VERIFIED", "CLOSED")
        ]
        if unmet:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Workflow Guardrail Violation (HTTP 409): Cannot transition to '{target_stage_code}' "
                    f"because prerequisite stage(s) {unmet} are not yet VERIFIED."
                ),
            )

    active_ob = ob_map[app.current_stage]

    if is_statutory_override:
        if current_user.role != "BUREAU_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Regulation Bureau HQ Admin ('BUREAU_ADMIN') can execute a statutory override.",
            )
        if not override_order_ref or len(override_order_ref.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Mandatory 'override_order_ref' is required when executing a statutory override.",
            )
    else:
        allowed_roles = {active_ob.assigned_role, "BUREAU_ADMIN"}
        if active_ob.stage_code == "COMPETENT_AUTHORITY":
            allowed_roles = {"COMPETENT_AUTHORITY"}
        enforce_role_and_jurisdiction(current_user, allowed_roles=allowed_roles, app_record=app)

        open_def = (
            db.query(DeficiencyCycle)
            .filter_by(application_id=app.id, resolution_status="OPEN_AWAITING_INSTITUTION")
            .first()
        )
        if open_def:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot advance stage '{app.current_stage}': Open Deficiency Cycle #{open_def.cycle_no} "
                    f"({open_def.deficiency_code}) is still awaiting institution clarification."
                ),
            )

        unmet_prereqs = [
            p for p in active_ob.prerequisite_codes
            if ob_map.get(p) and ob_map[p].state not in ("VERIFIED", "CLOSED")
        ]
        if unmet_prereqs:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Prerequisite stage(s) {unmet_prereqs} must be VERIFIED before completing '{active_ob.stage_code}'.",
            )

    if not remarks or len(remarks.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Verification remarks (minimum 5 characters) are mandatory.",
        )

    now = get_simulated_now(db)
    old_stage = app.current_stage

    active_ob.state = "VERIFIED"
    active_ob.blocker_reason_code = None
    active_ob.human_verified_by = current_user.id
    active_ob.human_verified_at = now
    active_ob.verification_remarks = remarks
    active_ob.is_statutory_override = is_statutory_override
    active_ob.override_order_ref = override_order_ref
    active_ob.updated_at = now

    resub_cycles = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app.id, obligation_id=active_ob.id, resolution_status="RESUBMITTED_FOR_RESCRUTINY")
        .all()
    )
    for cyc in resub_cycles:
        cyc.resolution_status = "RESOLVED_VERIFIED"

    ordered_codes = [o.stage_code for o in stage_obs]
    curr_idx = ordered_codes.index(old_stage)

    if curr_idx + 1 < len(stage_obs):
        next_ob = stage_obs[curr_idx + 1]
        next_ob.state = "UNDER_VERIFICATION"
        next_ob.started_at = now
        next_ob.due_at = now + timedelta(days=next_ob.sla_days)
        next_ob.blocker_reason_code = (
            "EVC_SCHEDULING_INCOMPLETE"
            if next_ob.stage_code in ("EVC_QUEUE", "EVC_VISIT")
            else "SCRUTINY_REVIEW_PENDING"
        )
        app.current_stage = next_ob.stage_code
        app.overall_status = "IN_PROGRESS"

        if next_ob.stage_code in ("EVC_QUEUE", "EVC_VISIT"):
            evc = db.query(EvcSchedule).filter_by(application_id=app.id).first()
            if evc and evc.queue_status == "WAITING_PRELIMINARY_SCRUTINY":
                evc.queue_status = "QUEUED_FOR_SCHEDULING"
                evc.queued_at = now
                evc.scheduling_sla_due_at = now + timedelta(days=5)
                evc.completion_sla_due_at = now + timedelta(
                    days=12 if evc.is_new_institution else 18
                )
    else:
        pending_post_ob = (
            db.query(Obligation)
            .filter(
                Obligation.application_id == app.id,
                Obligation.obligation_type.in_(["TIME_BOUND_UNDERTAKING", "LEASE_DOCUMENT_VALIDITY"]),
                Obligation.state.notin_(["VERIFIED", "CLOSED"]),
            )
            .count()
        )
        app.overall_status = "CONDITIONAL_APPROVED" if pending_post_ob > 0 else "APPROVED_FINAL"
        app.competent_authority_decision_by = current_user.id
        app.competent_authority_decision_at = now
        app.decision_order_ref = decision_order_ref or f"F.No.AICTE/{app.jurisdiction_code}/2026/{app.id}"

        evc = db.query(EvcSchedule).filter_by(application_id=app.id).first()
        if evc:
            evc.queue_status = "VERIFIED_COMPLETE"

    app.last_action_at = now

    action_label = "STATUTORY_OVERRIDE_ADVANCE" if is_statutory_override else "STAGE_VERIFIED_AND_ADVANCED"
    append_audit_event(
        db,
        actor=current_user,
        action_type=action_label,
        application_id=app.id,
        case_number=app.case_number,
        old_state=old_stage,
        new_state=app.current_stage if app.overall_status == "IN_PROGRESS" else app.overall_status,
        reason_code=override_order_ref if is_statutory_override else "PREREQUISITES_VERIFIED",
        remarks=remarks,
        rule_version_id=app.rule_version_id,
        simulated_now=now,
    )
    db.commit()
    db.refresh(app)
    return app


def revert_application_with_deficiency(
    db: Session,
    application_id: int,
    deficiency_code: str,
    officer_observations: str,
    current_user: User,
) -> DeficiencyCycle:
    if not deficiency_code or not deficiency_code.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mandatory 'deficiency_code' is required when reverting an application.",
        )
    if not officer_observations or len(officer_observations.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Detailed 'officer_observations' (minimum 10 characters) must be recorded for a revert.",
        )

    app = db.query(Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    active_ob = (
        db.query(Obligation)
        .filter_by(application_id=app.id, stage_code=app.current_stage)
        .first()
    )
    if not active_ob:
        raise HTTPException(status_code=409, detail="Active workflow stage obligation not found.")

    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=[active_ob.assigned_role, "REGIONAL_OFFICER", "BUREAU_ADMIN"],
        app_record=app,
    )

    now = get_simulated_now(db)
    existing_cycles = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app.id, obligation_id=active_ob.id)
        .count()
    )
    next_cycle_no = existing_cycles + 1

    cycle = DeficiencyCycle(
        application_id=app.id,
        obligation_id=active_ob.id,
        cycle_no=next_cycle_no,
        reverted_from_stage=app.current_stage,
        reverted_to_stage="INSTITUTION_CLARIFICATION",
        deficiency_code=deficiency_code.strip(),
        officer_observations=officer_observations.strip(),
        raised_by_id=current_user.id,
        raised_by_name=current_user.full_name,
        raised_at=now,
        resolution_status="OPEN_AWAITING_INSTITUTION",
    )
    db.add(cycle)

    active_ob.state = "DEFICIENT"
    active_ob.blocker_reason_code = "INSTITUTION_CLARIFICATION_AWAITED"
    active_ob.updated_at = now
    app.overall_status = "REVERTED_DEFICIENT"
    app.last_action_at = now

    append_audit_event(
        db,
        actor=current_user,
        action_type="APPLICATION_REVERTED_FOR_DEFICIENCY",
        application_id=app.id,
        case_number=app.case_number,
        old_state=app.current_stage,
        new_state="REVERTED_DEFICIENT",
        reason_code=deficiency_code.strip(),
        remarks=f"Cycle #{next_cycle_no} Revert: {officer_observations.strip()}",
        rule_version_id=app.rule_version_id,
        simulated_now=now,
    )
    db.commit()
    db.refresh(cycle)
    return cycle


def submit_deficiency_clarification(
    db: Session,
    application_id: int,
    clarification_text: str,
    current_user: User,
) -> DeficiencyCycle:
    if not clarification_text or len(clarification_text.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Clarification response (minimum 10 characters) is required.",
        )

    app = db.query(Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=["INSTITUTION", "BUREAU_ADMIN"],
        app_record=app,
    )

    open_cycle = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app.id, resolution_status="OPEN_AWAITING_INSTITUTION")
        .order_by(DeficiencyCycle.cycle_no.desc())
        .first()
    )
    if not open_cycle:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No open deficiency cycle awaiting clarification for this application.",
        )

    now = get_simulated_now(db)
    open_cycle.institution_clarification = clarification_text.strip()
    open_cycle.responded_by_id = current_user.id
    open_cycle.responded_at = now
    open_cycle.resolution_status = "RESUBMITTED_FOR_RESCRUTINY"

    active_ob = db.query(Obligation).filter_by(id=open_cycle.obligation_id).first()
    if active_ob:
        active_ob.state = "UNDER_VERIFICATION"
        active_ob.blocker_reason_code = "SCRUTINY_REVIEW_PENDING"
        active_ob.due_at = now + timedelta(days=active_ob.sla_days)
        active_ob.updated_at = now

    app.overall_status = "IN_PROGRESS"
    app.last_action_at = now

    append_audit_event(
        db,
        actor=current_user,
        action_type="DEFICIENCY_CLARIFICATION_RESUBMITTED",
        application_id=app.id,
        case_number=app.case_number,
        old_state="REVERTED_DEFICIENT",
        new_state=f"{app.current_stage}_RESCRUTINY_CYCLE_{open_cycle.cycle_no}",
        reason_code=open_cycle.deficiency_code,
        remarks=f"Institution submitted Re-Scrutiny clarification for Cycle #{open_cycle.cycle_no}: {clarification_text.strip()}",
        rule_version_id=app.rule_version_id,
        simulated_now=now,
    )
    db.commit()
    db.refresh(open_cycle)
    return open_cycle


def schedule_evc_visit(
    db: Session,
    application_id: int,
    scheduled_visit_date: date,
    committee_chair_ref: str,
    inspection_mode: str,
    current_user: User,
) -> EvcSchedule:
    app = db.query(Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=["REGIONAL_OFFICER", "BUREAU_ADMIN"],
        app_record=app,
    )

    evc = db.query(EvcSchedule).filter_by(application_id=app.id).first()
    if not evc:
        raise HTTPException(status_code=409, detail="This application route does not require an EVC.")

    if evc.queue_status == "WAITING_PRELIMINARY_SCRUTINY":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="EVC Scheduling Blocked (HTTP 409): Preliminary Scrutiny stage is not yet VERIFIED.",
        )

    now = get_simulated_now(db)
    evc.queue_status = "COMMITTEE_ASSIGNED_SCHEDULED"
    evc.scheduled_visit_date = scheduled_visit_date
    evc.committee_chair_ref = committee_chair_ref
    evc.inspection_mode = inspection_mode
    evc.scheduled_by_ro_id = current_user.id
    evc.updated_at = now

    if app.current_stage == "EVC_QUEUE":
        complete_stage_and_advance(
            db=db,
            application_id=app.id,
            target_stage_code="EVC_QUEUE",
            remarks=f"EVC Panel {committee_chair_ref} scheduled for {scheduled_visit_date} ({inspection_mode}).",
            decision_order_ref=None,
            is_statutory_override=False,
            override_order_ref=None,
            current_user=current_user,
        )
    else:
        append_audit_event(
            db,
            actor=current_user,
            action_type="EVC_COMMITTEE_SCHEDULED",
            application_id=app.id,
            case_number=app.case_number,
            entity_type="EVC_SCHEDULE",
            old_state="QUEUED_FOR_SCHEDULING",
            new_state="COMMITTEE_ASSIGNED_SCHEDULED",
            reason_code=committee_chair_ref,
            remarks=f"EVC scheduled on {scheduled_visit_date} ({inspection_mode}) by Regional Officer.",
            rule_version_id=app.rule_version_id,
            simulated_now=now,
        )
        db.commit()

    db.refresh(evc)
    return evc


def diagnose_case_blocker_and_recovery(db: Session, application_id: int) -> Dict[str, Any]:
    app = db.query(Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    rule = db.query(WorkflowRuleVersion).filter_by(id=app.rule_version_id).first()
    obligations = (
        db.query(Obligation)
        .filter_by(application_id=app.id)
        .order_by(Obligation.order_index.asc())
        .all()
    )
    ob_map = {o.stage_code: o for o in obligations}

    open_def = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app.id, resolution_status="OPEN_AWAITING_INSTITUTION")
        .order_by(DeficiencyCycle.cycle_no.desc())
        .first()
    )

    if open_def:
        return {
            "case_number": app.case_number,
            "current_stage": app.current_stage,
            "overall_status": app.overall_status,
            "is_blocked": True,
            "blocker_code": "INSTITUTION_CLARIFICATION_AWAITED",
            "deficiency_code": open_def.deficiency_code,
            "headline": f"Blocked at {app.current_stage} (Deficiency Cycle #{open_def.cycle_no}: {open_def.deficiency_code})",
            "explanation": (
                f"Application was reverted by {open_def.raised_by_name} with observation: "
                f"'{open_def.officer_observations}'. Downstream stages cannot proceed until clarification is submitted and re-scrutinized."
            ),
            "owner_role": "INSTITUTION",
            "rule_citation": f"{rule.rule_code} v{rule.version_num} · {rule.source_citation}",
            "authority_badge": rule.authority_type,
            "permitted_recovery_actions": [
                {
                    "action_code": "SUBMIT_DEFICIENCY_CLARIFICATION",
                    "label": "Submit Deficiency Clarification & Supporting Proof (Move to Re-Scrutiny)",
                    "permitted_role": "INSTITUTION",
                    "api_endpoint": f"POST /api/applications/{app.id}/clarification",
                }
            ],
        }

    if app.overall_status in ("CONDITIONAL_APPROVED", "APPROVED_FINAL"):
        submitted_obs = [
            o for o in obligations
            if o.obligation_type in ("TIME_BOUND_UNDERTAKING", "LEASE_DOCUMENT_VALIDITY")
            and o.state == "SUBMITTED"
        ]
        if submitted_obs:
            target = submitted_obs[0]
            return {
                "case_number": app.case_number,
                "current_stage": target.stage_code,
                "overall_status": app.overall_status,
                "is_blocked": True,
                "blocker_code": "EVIDENCE_VERIFICATION_PENDING",
                "headline": f"Upload != Verified: '{target.title}' Awaiting Officer Sign-Off",
                "explanation": (
                    f"Institution uploaded evidence (v{target.current_evidence_version}), "
                    f"but compliance remains unverified until {target.assigned_role} inspects the document and confirms expiry metadata."
                ),
                "owner_role": target.assigned_role,
                "rule_citation": f"PS 26262 Sec D/E · {target.sla_policy_source}",
                "authority_badge": "STATUTORY_HUMAN_VERIFICATION_GATE",
                "permitted_recovery_actions": [
                    {
                        "action_code": "VERIFY_COMPLIANCE_EVIDENCE",
                        "label": f"Inspect & Verify Uploaded Evidence v{target.current_evidence_version}",
                        "permitted_role": target.assigned_role,
                        "api_endpoint": f"POST /api/obligations/{target.id}/verify",
                    }
                ],
            }

        pending_post = [
            o for o in obligations
            if o.obligation_type in ("TIME_BOUND_UNDERTAKING", "LEASE_DOCUMENT_VALIDITY")
            and o.state in ("REQUIRED", "DEFICIENT")
        ]
        if pending_post:
            target = pending_post[0]
            return {
                "case_number": app.case_number,
                "current_stage": target.stage_code,
                "overall_status": app.overall_status,
                "is_blocked": True,
                "blocker_code": "REQUIRED_DOC_MISSING",
                "headline": f"Post-Approval Obligation Pending: '{target.title}'",
                "explanation": (
                    f"Approval granted subject to time-bound compliance ({target.title}). "
                    f"Institution must upload documentary evidence before due date {target.due_at.date()}."
                ),
                "owner_role": "INSTITUTION",
                "rule_citation": f"PS 26262 Sec D/E · {target.sla_policy_source}",
                "authority_badge": "CONFIGURABLE_SLA_POLICY",
                "permitted_recovery_actions": [
                    {
                        "action_code": "UPLOAD_COMPLIANCE_DOCUMENT",
                        "label": "Upload Undertaking / Renewed Lease PDF to Vault",
                        "permitted_role": "INSTITUTION",
                        "api_endpoint": f"POST /api/obligations/{target.id}/upload",
                    }
                ],
            }

    active_ob = ob_map.get(app.current_stage)
    if not active_ob:
        return {
            "case_number": app.case_number,
            "current_stage": app.current_stage,
            "overall_status": app.overall_status,
            "is_blocked": False,
            "blocker_code": "NONE",
            "headline": "All Workflow & Post-Approval Obligations Verified",
            "explanation": "No pending blockers detected.",
            "owner_role": "NONE",
            "rule_citation": rule.source_citation,
            "authority_badge": rule.authority_type,
            "permitted_recovery_actions": [],
        }

    unmet_prereqs = [
        p for p in active_ob.prerequisite_codes
        if ob_map.get(p) and ob_map[p].state not in ("VERIFIED", "CLOSED")
    ]
    downstream_blocked = [
        o.stage_code for o in obligations
        if o.obligation_type == "WORKFLOW_STAGE" and o.order_index > active_ob.order_index
    ]

    actions: List[Dict[str, str]] = []
    if active_ob.stage_code == "EVC_QUEUE":
        actions.append(
            {
                "action_code": "SCHEDULE_EVC_COMMITTEE",
                "label": "Assign EVC Panel & Schedule Inspection Date",
                "permitted_role": "REGIONAL_OFFICER",
                "api_endpoint": f"POST /api/applications/{app.id}/evc-schedule",
            }
        )
    else:
        actions.append(
            {
                "action_code": "COMPLETE_AND_VERIFY_STAGE",
                "label": f"Complete & Verify '{active_ob.title}'",
                "permitted_role": active_ob.assigned_role,
                "api_endpoint": f"POST /api/applications/{app.id}/advance",
            }
        )
        actions.append(
            {
                "action_code": "REVERT_WITH_DEFICIENCY",
                "label": "Revert Application for Deficiency / Clarification",
                "permitted_role": active_ob.assigned_role,
                "api_endpoint": f"POST /api/applications/{app.id}/revert",
            }
        )

    return {
        "case_number": app.case_number,
        "current_stage": app.current_stage,
        "overall_status": app.overall_status,
        "is_blocked": True,
        "blocker_code": active_ob.blocker_reason_code or "SCRUTINY_REVIEW_PENDING",
        "headline": f"Awaiting {active_ob.assigned_role} Action at '{active_ob.title}'",
        "explanation": (
            f"Stage '{active_ob.stage_code}' is currently in '{active_ob.state}' state. "
            f"Downstream stage(s) {downstream_blocked or ['FINAL_CLOSURE']} are held until this stage is verified. "
            f"Unmet prerequisites: {unmet_prereqs or 'None (Ready for Execution)'}."
        ),
        "owner_role": active_ob.assigned_role,
        "rule_citation": f"{rule.rule_code} v{rule.version_num} · {rule.source_citation}",
        "authority_badge": rule.authority_type,
        "permitted_recovery_actions": actions,
    }