from typing import Any, Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..auth import get_simulated_now
from ..models import (
    Application,
    AuditEvent,
    DeficiencyCycle,
    EscalationAlert,
    EvcSchedule,
    EvidenceSubmission,
    Obligation,
    SystemClockState,
    User,
    WorkflowRuleVersion,
)
from .audit_engine import append_audit_event
from .sla_escalation_engine import compute_priority_index_for_case
from .workflow_engine import diagnose_case_blocker_and_recovery


def generate_citation_ebrief(db: Session, application_id: int) -> Dict[str, Any]:
    """
    PS Section A Bullet 4: Electronic Case Summary (e-Brief) Generator.
    100% deterministic SQL template grounded in verified AuditEvent sequence IDs,
    DeficiencyCycle records, and EvidenceSubmission SHA-256 hashes (Zero Hallucination).
    """
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
    cycles = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app.id)
        .order_by(DeficiencyCycle.cycle_no.asc())
        .all()
    )
    submissions = (
        db.query(EvidenceSubmission)
        .filter_by(application_id=app.id)
        .order_by(EvidenceSubmission.version_no.asc())
        .all()
    )
    events = (
        db.query(AuditEvent)
        .filter_by(application_id=app.id)
        .order_by(AuditEvent.seq_id.asc())
        .all()
    )
    evc = db.query(EvcSchedule).filter_by(application_id=app.id).first()
    alerts = db.query(EscalationAlert).filter_by(application_id=app.id).all()

    now = get_simulated_now(db)
    clock = db.query(SystemClockState).filter_by(id=1).first()
    priority_info = compute_priority_index_for_case(app, obligations, now, clock)
    blocker_info = diagnose_case_blocker_and_recovery(db, app.id)

    valid_event_ids = {ev.seq_id for ev in events}
    cited_chronology: List[Dict[str, Any]] = []
    for ev in events:
        if ev.seq_id in valid_event_ids:
            cited_chronology.append(
                {
                    "citation_tag": f"[Event #{ev.seq_id}]",
                    "seq_id": ev.seq_id,
                    "timestamp": ev.timestamp_iso,
                    "actor": f"{ev.actor_name} ({ev.actor_role})",
                    "action_type": ev.action_type,
                    "transition": f"{ev.old_state} -> {ev.new_state}",
                    "remarks": ev.remarks,
                    "sha256_prefix": ev.row_hash[:16],
                }
            )

    stage_checklist = [
        {
            "stage_code": o.stage_code,
            "obligation_type": o.obligation_type,
            "title": o.title,
            "assigned_role": o.assigned_role,
            "state": o.state,
            "due_date": str(o.due_at.date()),
            "document_expiry": str(o.document_expiry_date) if o.document_expiry_date else None,
            "verified_by_id": o.human_verified_by,
        }
        for o in obligations
    ]

    deficiency_digest = [
        {
            "citation_tag": f"[Deficiency Cycle #{c.cycle_no}]",
            "deficiency_code": c.deficiency_code,
            "observations": c.officer_observations,
            "raised_by": c.raised_by_name,
            "clarification": c.institution_clarification or "Pending Institution Clarification",
            "status": c.resolution_status,
        }
        for c in cycles
    ]

    evidence_digest = [
        {
            "citation_tag": f"[Submission #{s.id} · v{s.version_no}]",
            "filename": s.original_filename,
            "category": s.document_category,
            "sha256_prefix": s.file_sha256_hash[:16],
            "claimed_expiry": str(s.claimed_expiry_date) if s.claimed_expiry_date else None,
            "assistive_ocr_expiry": str(s.assistive_ocr_expiry_date) if s.assistive_ocr_expiry_date else None,
            "ocr_match_status": s.ocr_match_status,
            "verification_decision": s.verification_decision,
            "verified_by": s.verified_by_name,
        }
        for s in submissions
    ]

    first_tag = f"[Event #{events[0].seq_id}]" if events else "[Genesis]"
    latest_tag = f"[Event #{events[-1].seq_id}]" if events else "[Latest]"

    executive_narrative = (
        f"Case {app.case_number} ({app.institution_name}, Region: {app.jurisdiction_code}) "
        f"for '{app.programme_name}' is routed under {rule.rule_code} v{rule.version_num} ({rule.source_citation}) {first_tag}. "
        f"Current workflow stage is '{app.current_stage}' with overall status '{app.overall_status}' {latest_tag}. "
        f"Operational Priority Index is P={priority_info['priority_score']} ({priority_info['risk_band']}). "
        f"Active Diagnosis: {blocker_info['headline']} — {blocker_info['explanation']}"
    )

    return {
        "ebrief_header": {
            "case_number": app.case_number,
            "institution_name": app.institution_name,
            "jurisdiction_code": app.jurisdiction_code,
            "application_type": app.application_type,
            "programme_name": app.programme_name,
            "governing_rule": f"{rule.rule_code} v{rule.version_num}",
            "rule_source_citation": rule.source_citation,
            "generated_at_utc": now.isoformat(),
            "generation_mode": "DETERMINISTIC_SQL_CITATION_VERIFIED",
            "regulatory_safeguard_notice": (
                "This Electronic Case Summary is an administrative compilation of verified stage records. "
                "Statutory scrutiny, inspection, and approval decisions remain strictly reserved for Competent Authorities."
            ),
        },
        "executive_narrative": executive_narrative,
        "priority_and_sla_telemetry": priority_info,
        "blocker_and_recovery_diagnosis": blocker_info,
        "evc_status": (
            {
                "queue_status": evc.queue_status,
                "is_new_institution": evc.is_new_institution,
                "scheduled_visit_date": str(evc.scheduled_visit_date) if evc.scheduled_visit_date else None,
                "committee_chair_ref": evc.committee_chair_ref,
                "inspection_mode": evc.inspection_mode,
            }
            if evc
            else None
        ),
        "stage_and_compliance_checklist": stage_checklist,
        "deficiency_cycles_summary": deficiency_digest,
        "evidence_lineage_summary": evidence_digest,
        "escalation_alerts_count": len(alerts),
        "cited_audit_chronology": cited_chronology,
    }


def simulate_rule_version_impact(
    db: Session,
    base_rule_id: int,
    draft_rule_id: int,
) -> Dict[str, Any]:
    """
    Features #18-20: Rule Change Impact Simulator (Rule v1 Active vs. Rule v2 Draft).
    Previews affected open cases, added/removed stages, and SLA changes before publishing.
    """
    v1 = db.query(WorkflowRuleVersion).filter_by(id=base_rule_id).first()
    v2 = db.query(WorkflowRuleVersion).filter_by(id=draft_rule_id).first()
    if not v1 or not v2:
        raise HTTPException(status_code=404, detail="Rule version not found for comparison.")

    v1_stages = {s["code"]: s for s in v1.stages_dag_json.get("stages", [])}
    v2_stages = {s["code"]: s for s in v2.stages_dag_json.get("stages", [])}

    added_stages = [code for code in v2_stages if code not in v1_stages]
    removed_stages = [code for code in v1_stages if code not in v2_stages]

    sla_diffs = []
    for code, s2 in v2_stages.items():
        if code in v1_stages:
            s1 = v1_stages[code]
            if s1.get("sla_days") != s2.get("sla_days"):
                sla_diffs.append(
                    {
                        "stage_code": code,
                        "title": s2["title"],
                        "v1_sla_days": s1["sla_days"],
                        "v2_sla_days": s2["sla_days"],
                        "delta_days": s2["sla_days"] - s1["sla_days"],
                    }
                )

    open_apps = db.query(Application).filter_by(application_type=v1.application_type).all()
    affected_cases = []
    for app in open_apps:
        curr_code = app.current_stage
        v1_sla = v1_stages.get(curr_code, {}).get("sla_days")
        v2_sla = v2_stages.get(curr_code, {}).get("sla_days")
        notes = []
        if v1_sla != v2_sla:
            notes.append(f"Active stage '{curr_code}' SLA changes from {v1_sla}d to {v2_sla}d")
        if added_stages:
            notes.append(f"New downstream gate(s) added: {added_stages}")

        affected_cases.append(
            {
                "case_number": app.case_number,
                "institution_name": app.institution_name,
                "jurisdiction_code": app.jurisdiction_code,
                "current_stage": curr_code,
                "overall_status": app.overall_status,
                "impact_summary": "; ".join(notes) if notes else "No active stage SLA shift",
                "transition_policy": "GRANDFATHER_IN_FLIGHT_CASES (Keep v1 on existing cases; apply v2 to new submissions)",
            }
        )

    return {
        "base_rule": {
            "id": v1.id,
            "code": v1.rule_code,
            "version": v1.version_num,
            "status": v1.status,
            "label": v1.sla_policy_label,
        },
        "draft_rule": {
            "id": v2.id,
            "code": v2.rule_code,
            "version": v2.version_num,
            "status": v2.status,
            "label": v2.sla_policy_label,
        },
        "structural_diff": {
            "added_stages": added_stages,
            "removed_stages": removed_stages,
            "sla_timeline_changes": sla_diffs,
        },
        "affected_open_cases_count": len(affected_cases),
        "affected_cases_preview": affected_cases,
        "safety_guardrail": (
            "Draft rules never silently alter live in-flight applications. Activating v2 applies to new submissions "
            "while preserving v1 audit lineage on existing cases."
        ),
    }


def activate_draft_rule_version(
    db: Session,
    draft_rule_id: int,
    current_user: User,
) -> WorkflowRuleVersion:
    """Safely activates a draft rule version for future applications while preserving v1 on existing cases."""
    if current_user.role != "BUREAU_ADMIN":
        raise HTTPException(status_code=403, detail="Only BUREAU_ADMIN can publish a workflow rule version.")

    draft = db.query(WorkflowRuleVersion).filter_by(id=draft_rule_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft rule not found.")

    # Archive previous active rules for the same application_type
    prev_rules = (
        db.query(WorkflowRuleVersion)
        .filter_by(application_type=draft.application_type, is_active=True)
        .all()
    )
    for pr in prev_rules:
        pr.is_active = False
        pr.status = "ARCHIVED"

    draft.is_active = True
    draft.status = "AUTHORISED"

    append_audit_event(
        db,
        actor=current_user,
        action_type="WORKFLOW_RULE_VERSION_PUBLISHED",
        entity_type="WORKFLOW_RULE",
        old_state="DRAFT",
        new_state=f"AUTHORISED_V{draft.version_num}",
        reason_code=draft.rule_code,
        remarks=f"Activated {draft.rule_code} v{draft.version_num} for future {draft.application_type} applications.",
        rule_version_id=draft.id,
        simulated_now=get_simulated_now(db),
    )
    db.commit()
    db.refresh(draft)
    return draft