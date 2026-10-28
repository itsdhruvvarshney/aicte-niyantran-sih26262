from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .auth import (
    create_access_token,
    enforce_role_and_jurisdiction,
    generate_signed_vault_url,
    get_current_user,
    get_simulated_now,
    verify_password,
    verify_signed_vault_url,
)
from .database import Base, SessionLocal, engine, get_db
from .models import (
    Application,
    AuditAnchorCheckpoint,
    AuditEvent,
    DeficiencyCycle,
    EscalationAlert,
    EvcSchedule,
    EvidenceSubmission,
    Jurisdiction,
    Obligation,
    SystemClockState,
    User,
    WorkflowRuleVersion,
)
from .seed import seed_initial_data
from .services.audit_engine import (
    restore_tampered_row_for_demo,
    simulate_db_tamper_for_demo,
    verify_audit_chain_and_anchor,
)
from .services.compliance_vault import (
    VAULT_STORAGE_DIR,
    upload_compliance_evidence,
    verify_compliance_evidence,
)
from .services.intelligence_simulator import (
    activate_draft_rule_version,
    generate_citation_ebrief,
    simulate_rule_version_impact,
)
from .services.sla_escalation_engine import (
    acknowledge_escalation_alert,
    advance_or_reset_simulated_clock,
    compute_priority_index_for_case,
    get_regional_and_bottleneck_analytics,
    run_sla_and_expiry_sweep,
)
from .services.workflow_engine import (
    complete_stage_and_advance,
    create_application_and_spawn_dag,
    diagnose_case_blocker_and_recovery,
    revert_application_with_deficiency,
    schedule_evc_visit,
    submit_deficiency_clarification,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
        run_sla_and_expiry_sweep(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AICTE-NIYANTRAN (SIH 2026 PS 26262)",
    description="Rule-Grounded APH Workflow Automation, Dependency Recovery & Post-Approval Compliance Control System",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Pydantic Request Schemas --------------------
class QuickLoginRequest(BaseModel):
    email: str


class StandardLoginRequest(BaseModel):
    email: str
    password: str


class CreateApplicationRequest(BaseModel):
    institution_name: str
    jurisdiction_code: str = "NRO"
    application_type: str = "NEW_INSTITUTION"
    programme_name: str = "B.Tech Computer Science & Engineering (AI & ML)"
    academic_year: str = "2026-27"
    include_post_approval_trackers: bool = True
    lease_expiry_days_from_now: int = 55


class StageAdvanceRequest(BaseModel):
    target_stage_code: Optional[str] = None
    remarks: str
    decision_order_ref: Optional[str] = None
    is_statutory_override: bool = False
    override_order_ref: Optional[str] = None


class StageRevertRequest(BaseModel):
    deficiency_code: str
    officer_observations: str


class ClarificationRequest(BaseModel):
    clarification_text: str


class EvcScheduleRequest(BaseModel):
    scheduled_visit_date: date
    committee_chair_ref: str = "EVC-PANEL-2026-NRO-09"
    inspection_mode: str = "ONLINE_APH"


class VerifyEvidenceRequest(BaseModel):
    decision: str  # 'ACCEPTED_VERIFIED' or 'REJECTED_DEFICIENT'
    human_confirmed_checkbox: bool = False
    verifier_remarks: str
    confirmed_expiry_date: Optional[date] = None


class TimeTravelRequest(BaseModel):
    delta_days: Optional[float] = None
    reset_to_zero: bool = False
    w_deadline: Optional[float] = None
    w_ageing: Optional[float] = None
    w_blocker: Optional[float] = None


class AcknowledgeAlertRequest(BaseModel):
    note: str = "Reviewed and action initiated by responsible officer."


class RuleSimulateRequest(BaseModel):
    base_rule_id: int
    draft_rule_id: int


# -------------------- Auth & Role Switcher Endpoints --------------------
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    clock = db.query(SystemClockState).filter_by(id=1).first()
    return {
        "status": "ok",
        "system": "AICTE-NIYANTRAN",
        "problem_statement_id": "26262",
        "simulated_now_utc": get_simulated_now(db).isoformat(),
        "clock_offset_days": clock.offset_days if clock else 0.0,
    }


@app.get("/api/auth/demo-users")
def list_demo_users(db: Session = Depends(get_db)):
    """Returns all seeded role accounts for the 1-Click Real JWT Quick-Login Switcher."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "jurisdiction_code": u.jurisdiction_code,
            "institution_id": u.institution_id,
            "institution_name": u.institution_name,
        }
        for u in users
    ]


@app.post("/api/auth/quick-login")
def quick_login_as_role(req: QuickLoginRequest, db: Session = Depends(get_db)):
    """Issues a real cryptographically signed JWT token for seamless role switching during the Finale demo."""
    user = db.query(User).filter_by(email=req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found.")
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "jurisdiction_code": user.jurisdiction_code,
            "institution_id": user.institution_id,
            "institution_name": user.institution_name,
        },
    }


@app.post("/api/auth/login")
def standard_login(req: StandardLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "jurisdiction_code": user.jurisdiction_code,
            "institution_id": user.institution_id,
        },
    }


# -------------------- Dashboard & Control Tower Endpoints --------------------
@app.get("/api/dashboard/overview")
def get_dashboard_overview(
    jurisdiction: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Role-Scoped Dashboard & Control Tower Overview.
    - Enforces ABAC visibility: Institutions only see their own cases; Regional Officers default to their Region.
    - Returns Priority Index (P) sorted applications, 6-Bucket Bottleneck analytics, EVC queue, and alerts.
    """
    now = get_simulated_now(db)
    clock = db.query(SystemClockState).filter_by(id=1).first()

    q = db.query(Application)
    if current_user.role == "INSTITUTION":
        q = q.filter(Application.institution_id == current_user.institution_id)
    elif jurisdiction and jurisdiction != "ALL":
        q = q.filter(Application.jurisdiction_code == jurisdiction)
    elif current_user.jurisdiction_code != "HQ":
        q = q.filter(Application.jurisdiction_code == current_user.jurisdiction_code)

    if stage and stage != "ALL":
        q = q.filter(Application.current_stage == stage)

    apps = q.order_by(Application.id.asc()).all()
    all_obs = db.query(Obligation).all()
    obs_by_app = {}
    for o in all_obs:
        obs_by_app.setdefault(o.application_id, []).append(o)

    rules_map = {r.id: r for r in db.query(WorkflowRuleVersion).all()}
    evc_map = {e.application_id: e for e in db.query(EvcSchedule).all()}

    cases_list = []
    for a in apps:
        a_obs = obs_by_app.get(a.id, [])
        p_info = compute_priority_index_for_case(a, a_obs, now, clock)
        blocker = diagnose_case_blocker_and_recovery(db, a.id)
        rule = rules_map.get(a.rule_version_id)
        evc = evc_map.get(a.id)

        cases_list.append(
            {
                "id": a.id,
                "case_number": a.case_number,
                "institution_id": a.institution_id,
                "institution_name": a.institution_name,
                "jurisdiction_code": a.jurisdiction_code,
                "application_type": a.application_type,
                "programme_name": a.programme_name,
                "route_pattern": rule.route_pattern if rule else "",
                "rule_code": f"{rule.rule_code} v{rule.version_num}" if rule else "",
                "authority_type": rule.authority_type if rule else "STATUTORY_PS_APH",
                "current_stage": a.current_stage,
                "overall_status": a.overall_status,
                "priority": p_info,
                "blocker_headline": blocker["headline"],
                "blocker_code": blocker["blocker_code"],
                "next_owner_role": blocker["owner_role"],
                "evc_queue_status": evc.queue_status if evc else "NOT_APPLICABLE",
                "submitted_at": a.submitted_at.isoformat(),
                "last_action_at": a.last_action_at.isoformat(),
            }
        )

    # Sort cases by Operational Priority Index (P) descending so highest-risk / overdue cases appear at top
    cases_list.sort(key=lambda x: x["priority"]["priority_score"], reverse=True)

    alerts_q = db.query(EscalationAlert).order_by(EscalationAlert.id.desc())
    if current_user.role == "INSTITUTION":
        app_ids = [a.id for a in apps]
        alerts_q = alerts_q.filter(EscalationAlert.application_id.in_(app_ids))
    elif current_user.jurisdiction_code != "HQ":
        alerts_q = alerts_q.filter(EscalationAlert.jurisdiction_code == current_user.jurisdiction_code)

    alerts_list = [
        {
            "id": al.id,
            "application_id": al.application_id,
            "obligation_id": al.obligation_id,
            "case_number": al.case_number,
            "jurisdiction_code": al.jurisdiction_code,
            "alert_band": al.alert_band,
            "severity": al.severity,
            "recipient_role": al.recipient_role,
            "explanation_text": al.explanation_text,
            "next_permitted_action": al.next_permitted_action,
            "rule_citation": al.rule_citation,
            "triggered_at": al.triggered_at.isoformat(),
            "is_acknowledged": al.is_acknowledged,
            "acknowledged_by_name": al.acknowledged_by_name,
        }
        for al in alerts_q.limit(50).all()
    ]

    analytics = get_regional_and_bottleneck_analytics(db)
    jurisdictions = [
        {"code": j.code, "name": j.name, "city": j.city, "office_type": j.office_type}
        for j in db.query(Jurisdiction).all()
    ]

    return {
        "simulated_now_utc": now.isoformat(),
        "clock_offset_days": clock.offset_days if clock else 0.0,
        "priority_weights": {
            "w_deadline": clock.w_deadline if clock else 0.40,
            "w_ageing": clock.w_ageing if clock else 0.35,
            "w_blocker": clock.w_blocker if clock else 0.25,
        },
        "current_user_scope": {
            "role": current_user.role,
            "jurisdiction_code": current_user.jurisdiction_code,
            "full_name": current_user.full_name,
        },
        "jurisdictions": jurisdictions,
        "analytics": analytics,
        "cases": cases_list,
        "alerts": alerts_list,
    }


# -------------------- Case Detail & Workflow Execution Endpoints --------------------
@app.get("/api/applications/{application_id}")
def get_application_detail(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_rec = db.query(Application).filter_by(id=application_id).first()
    if not app_rec:
        raise HTTPException(status_code=404, detail="Application not found.")

    if current_user.role == "INSTITUTION":
        enforce_role_and_jurisdiction(current_user, ["INSTITUTION"], app_rec)

    now = get_simulated_now(db)
    clock = db.query(SystemClockState).filter_by(id=1).first()
    rule = db.query(WorkflowRuleVersion).filter_by(id=app_rec.rule_version_id).first()
    obs = (
        db.query(Obligation)
        .filter_by(application_id=app_rec.id)
        .order_by(Obligation.order_index.asc())
        .all()
    )
    cycles = (
        db.query(DeficiencyCycle)
        .filter_by(application_id=app_rec.id)
        .order_by(DeficiencyCycle.cycle_no.asc())
        .all()
    )
    subs = (
        db.query(EvidenceSubmission)
        .filter_by(application_id=app_rec.id)
        .order_by(EvidenceSubmission.version_no.asc())
        .all()
    )
    evc = db.query(EvcSchedule).filter_by(application_id=app_rec.id).first()
    events = (
        db.query(AuditEvent)
        .filter_by(application_id=app_rec.id)
        .order_by(AuditEvent.seq_id.desc())
        .all()
    )

    priority_info = compute_priority_index_for_case(app_rec, obs, now, clock)
    blocker_info = diagnose_case_blocker_and_recovery(db, app_rec.id)

    return {
        "application": {
            "id": app_rec.id,
            "case_number": app_rec.case_number,
            "institution_id": app_rec.institution_id,
            "institution_name": app_rec.institution_name,
            "jurisdiction_code": app_rec.jurisdiction_code,
            "application_type": app_rec.application_type,
            "programme_name": app_rec.programme_name,
            "academic_year": app_rec.academic_year,
            "current_stage": app_rec.current_stage,
            "overall_status": app_rec.overall_status,
            "decision_order_ref": app_rec.decision_order_ref,
            "submitted_at": app_rec.submitted_at.isoformat(),
            "last_action_at": app_rec.last_action_at.isoformat(),
        },
        "rule": {
            "id": rule.id,
            "rule_code": rule.rule_code,
            "version_num": rule.version_num,
            "route_pattern": rule.route_pattern,
            "authority_type": rule.authority_type,
            "sla_policy_label": rule.sla_policy_label,
            "source_citation": rule.source_citation,
            "stages_dag_json": rule.stages_dag_json,
        },
        "priority": priority_info,
        "blocker_diagnosis": blocker_info,
        "obligations": [
            {
                "id": o.id,
                "obligation_type": o.obligation_type,
                "stage_code": o.stage_code,
                "order_index": o.order_index,
                "title": o.title,
                "description": o.description,
                "assigned_role": o.assigned_role,
                "prerequisite_codes": o.prerequisite_codes,
                "state": o.state,
                "blocker_reason_code": o.blocker_reason_code,
                "sla_days": o.sla_days,
                "sla_policy_source": o.sla_policy_source,
                "due_at": o.due_at.isoformat(),
                "document_type": o.document_type,
                "document_expiry_date": str(o.document_expiry_date) if o.document_expiry_date else None,
                "current_evidence_version": o.current_evidence_version,
                "verification_remarks": o.verification_remarks,
                "is_statutory_override": o.is_statutory_override,
                "override_order_ref": o.override_order_ref,
            }
            for o in obs
        ],
        "deficiency_cycles": [
            {
                "id": c.id,
                "cycle_no": c.cycle_no,
                "reverted_from_stage": c.reverted_from_stage,
                "deficiency_code": c.deficiency_code,
                "officer_observations": c.officer_observations,
                "raised_by_name": c.raised_by_name,
                "raised_at": c.raised_at.isoformat(),
                "institution_clarification": c.institution_clarification,
                "responded_at": c.responded_at.isoformat() if c.responded_at else None,
                "resolution_status": c.resolution_status,
            }
            for c in cycles
        ],
        "evidence_submissions": [
            {
                "id": s.id,
                "obligation_id": s.obligation_id,
                "version_no": s.version_no,
                "document_category": s.document_category,
                "original_filename": s.original_filename,
                "file_sha256_hash": s.file_sha256_hash,
                "claimed_issue_date": str(s.claimed_issue_date) if s.claimed_issue_date else None,
                "claimed_expiry_date": str(s.claimed_expiry_date) if s.claimed_expiry_date else None,
                "assistive_ocr_expiry_date": str(s.assistive_ocr_expiry_date) if s.assistive_ocr_expiry_date else None,
                "ocr_match_status": s.ocr_match_status,
                "uploaded_by_name": s.uploaded_by_name,
                "uploaded_at": s.uploaded_at.isoformat(),
                "verification_decision": s.verification_decision,
                "human_confirmed_checkbox": s.human_confirmed_checkbox,
                "verified_by_name": s.verified_by_name,
                "verifier_remarks": s.verifier_remarks,
                "signed_download_url": generate_signed_vault_url(s.id),
            }
            for s in subs
        ],
        "evc_schedule": (
            {
                "id": evc.id,
                "is_new_institution": evc.is_new_institution,
                "queue_status": evc.queue_status,
                "queued_at": evc.queued_at.isoformat() if evc.queued_at else None,
                "scheduling_sla_due_at": evc.scheduling_sla_due_at.isoformat() if evc.scheduling_sla_due_at else None,
                "scheduled_visit_date": str(evc.scheduled_visit_date) if evc.scheduled_visit_date else None,
                "inspection_mode": evc.inspection_mode,
                "committee_chair_ref": evc.committee_chair_ref,
            }
            if evc
            else None
        ),
        "audit_trail": [
            {
                "seq_id": ev.seq_id,
                "actor_name": ev.actor_name,
                "actor_role": ev.actor_role,
                "action_type": ev.action_type,
                "old_state": ev.old_state,
                "new_state": ev.new_state,
                "reason_code": ev.reason_code,
                "remarks": ev.remarks,
                "timestamp_iso": ev.timestamp_iso,
                "prev_hash": ev.prev_hash,
                "row_hash": ev.row_hash,
            }
            for ev in events
        ],
    }


@app.post("/api/applications")
def api_create_application(
    req: CreateApplicationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_rec = create_application_and_spawn_dag(
        db=db,
        institution_name=req.institution_name,
        jurisdiction_code=req.jurisdiction_code,
        application_type=req.application_type,
        programme_name=req.programme_name,
        academic_year=req.academic_year,
        include_post_approval_trackers=req.include_post_approval_trackers,
        lease_expiry_days_from_now=req.lease_expiry_days_from_now,
        current_user=current_user,
    )
    return {
        "id": app_rec.id,
        "case_number": app_rec.case_number,
        "current_stage": app_rec.current_stage,
        "overall_status": app_rec.overall_status,
        "rule_version_id": app_rec.rule_version_id,
    }


@app.post("/api/applications/{application_id}/advance")
def api_advance_stage(
    application_id: int,
    req: StageAdvanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app_rec = complete_stage_and_advance(
        db=db,
        application_id=application_id,
        target_stage_code=req.target_stage_code,
        remarks=req.remarks,
        decision_order_ref=req.decision_order_ref,
        is_statutory_override=req.is_statutory_override,
        override_order_ref=req.override_order_ref,
        current_user=current_user,
    )
    return {
        "id": app_rec.id,
        "case_number": app_rec.case_number,
        "current_stage": app_rec.current_stage,
        "overall_status": app_rec.overall_status,
    }


@app.post("/api/applications/{application_id}/revert")
def api_revert_stage(
    application_id: int,
    req: StageRevertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cyc = revert_application_with_deficiency(
        db=db,
        application_id=application_id,
        deficiency_code=req.deficiency_code,
        officer_observations=req.officer_observations,
        current_user=current_user,
    )
    return {
        "cycle_id": cyc.id,
        "cycle_no": cyc.cycle_no,
        "deficiency_code": cyc.deficiency_code,
        "resolution_status": cyc.resolution_status,
    }


@app.post("/api/applications/{application_id}/clarification")
def api_submit_clarification(
    application_id: int,
    req: ClarificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cyc = submit_deficiency_clarification(
        db=db,
        application_id=application_id,
        clarification_text=req.clarification_text,
        current_user=current_user,
    )
    return {
        "cycle_id": cyc.id,
        "cycle_no": cyc.cycle_no,
        "resolution_status": cyc.resolution_status,
    }


@app.post("/api/applications/{application_id}/evc-schedule")
def api_schedule_evc(
    application_id: int,
    req: EvcScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    evc = schedule_evc_visit(
        db=db,
        application_id=application_id,
        scheduled_visit_date=req.scheduled_visit_date,
        committee_chair_ref=req.committee_chair_ref,
        inspection_mode=req.inspection_mode,
        current_user=current_user,
    )
    return {
        "application_id": evc.application_id,
        "queue_status": evc.queue_status,
        "scheduled_visit_date": str(evc.scheduled_visit_date),
        "committee_chair_ref": evc.committee_chair_ref,
    }


# -------------------- 5-State Compliance & Document Vault Endpoints --------------------
@app.post("/api/obligations/{obligation_id}/upload")
async def api_upload_evidence(
    obligation_id: int,
    claimed_issue_date: Optional[date] = Form(None),
    claimed_expiry_date: Optional[date] = Form(None),
    demo_filename: Optional[str] = Form("Renewed_Registered_Lease_Deed_2056-06-30.pdf"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file is not None:
        raw_bytes = await file.read()
        fname = file.filename or demo_filename
    else:
        exp_str = str(claimed_expiry_date) if claimed_expiry_date else "2056-06-30"
        raw_bytes = f"%PDF-1.4 AICTE Compliance Document | Valid Until Expiry: {exp_str}".encode("utf-8")
        fname = demo_filename or f"Compliance_Proof_{exp_str}.pdf"

    sub = upload_compliance_evidence(
        db=db,
        obligation_id=obligation_id,
        original_filename=fname,
        file_bytes=raw_bytes,
        claimed_issue_date=claimed_issue_date,
        claimed_expiry_date=claimed_expiry_date,
        current_user=current_user,
    )
    return {
        "submission_id": sub.id,
        "obligation_id": sub.obligation_id,
        "version_no": sub.version_no,
        "obligation_state": "SUBMITTED",
        "file_sha256_hash": sub.file_sha256_hash,
        "assistive_ocr_expiry_date": str(sub.assistive_ocr_expiry_date) if sub.assistive_ocr_expiry_date else None,
        "ocr_match_status": sub.ocr_match_status,
        "signed_download_url": generate_signed_vault_url(sub.id),
    }


@app.post("/api/obligations/{obligation_id}/verify")
def api_verify_evidence(
    obligation_id: int,
    req: VerifyEvidenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return verify_compliance_evidence(
        db=db,
        obligation_id=obligation_id,
        decision=req.decision,
        human_confirmed_checkbox=req.human_confirmed_checkbox,
        verifier_remarks=req.verifier_remarks,
        confirmed_expiry_date=req.confirmed_expiry_date,
        current_user=current_user,
    )


@app.get("/api/documents/{submission_id}/download")
def api_download_signed_document(
    submission_id: int,
    expires: int = Query(...),
    sig: str = Query(...),
    db: Session = Depends(get_db),
):
    if not verify_signed_vault_url(submission_id, expires, sig):
        raise HTTPException(status_code=403, detail="Signed document vault URL expired or invalid HMAC signature.")
    sub = db.query(EvidenceSubmission).filter_by(id=submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Document submission record not found.")

    fpath = VAULT_STORAGE_DIR / sub.vault_storage_path
    if not fpath.exists():
        fpath.write_bytes(
            f"%PDF-1.4 AICTE Vault Document {sub.original_filename} SHA256={sub.file_sha256_hash}".encode("utf-8")
        )
    return FileResponse(path=str(fpath), filename=sub.original_filename, media_type="application/pdf")


# -------------------- Citation e-Brief, Time-Travel, Rules & Audit Endpoints --------------------
@app.get("/api/applications/{application_id}/ebrief")
def api_get_citation_ebrief(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_citation_ebrief(db, application_id)


@app.post("/api/clock/time-travel")
def api_time_travel_clock(
    req: TimeTravelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return advance_or_reset_simulated_clock(
        db=db,
        delta_days=req.delta_days,
        reset_to_zero=req.reset_to_zero,
        w_deadline=req.w_deadline,
        w_ageing=req.w_ageing,
        w_blocker=req.w_blocker,
        current_user=current_user,
    )


@app.post("/api/alerts/{alert_id}/acknowledge")
def api_acknowledge_alert(
    alert_id: int,
    req: AcknowledgeAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    al = acknowledge_escalation_alert(db, alert_id, req.note, current_user)
    return {"id": al.id, "is_acknowledged": al.is_acknowledged, "acknowledged_by": al.acknowledged_by_name}


@app.get("/api/rules")
def api_list_workflow_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rules = db.query(WorkflowRuleVersion).order_by(WorkflowRuleVersion.id.asc()).all()
    return [
        {
            "id": r.id,
            "rule_code": r.rule_code,
            "version_num": r.version_num,
            "application_type": r.application_type,
            "route_pattern": r.route_pattern,
            "authority_type": r.authority_type,
            "sla_policy_label": r.sla_policy_label,
            "source_citation": r.source_citation,
            "is_active": r.is_active,
            "status": r.status,
            "stages_dag_json": r.stages_dag_json,
        }
        for r in rules
    ]


@app.post("/api/rules/simulate-impact")
def api_simulate_rule_impact(
    req: RuleSimulateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return simulate_rule_version_impact(db, req.base_rule_id, req.draft_rule_id)


@app.post("/api/rules/{draft_rule_id}/activate")
def api_activate_draft_rule(
    draft_rule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = activate_draft_rule_version(db, draft_rule_id, current_user)
    return {"id": r.id, "rule_code": r.rule_code, "version_num": r.version_num, "status": r.status, "is_active": r.is_active}


@app.get("/api/audit/ledger")
def api_get_audit_ledger(
    limit: int = Query(100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    events = db.query(AuditEvent).order_by(AuditEvent.seq_id.desc()).limit(limit).all()
    verification = verify_audit_chain_and_anchor(db)
    latest_checkpoint = db.query(AuditAnchorCheckpoint).order_by(AuditAnchorCheckpoint.id.desc()).first()
    return {
        "verification": verification,
        "latest_anchor_checkpoint": (
            {
                "id": latest_checkpoint.id,
                "upto_seq_id": latest_checkpoint.upto_seq_id,
                "head_hash": latest_checkpoint.head_hash,
                "hmac_signature": latest_checkpoint.hmac_signature,
                "anchored_by": latest_checkpoint.anchored_by,
            }
            if latest_checkpoint
            else None
        ),
        "events": [
            {
                "seq_id": ev.seq_id,
                "case_number": ev.case_number,
                "actor_name": ev.actor_name,
                "actor_role": ev.actor_role,
                "jurisdiction_code": ev.jurisdiction_code,
                "action_type": ev.action_type,
                "old_state": ev.old_state,
                "new_state": ev.new_state,
                "reason_code": ev.reason_code,
                "remarks": ev.remarks,
                "timestamp_iso": ev.timestamp_iso,
                "prev_hash": ev.prev_hash,
                "row_hash": ev.row_hash,
            }
            for ev in events
        ],
    }


@app.get("/api/audit/verify")
def api_verify_audit(db: Session = Depends(get_db)):
    return verify_audit_chain_and_anchor(db)


@app.post("/api/audit/simulate-tamper")
def api_simulate_tamper(
    seq_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return simulate_db_tamper_for_demo(db, seq_id)


@app.post("/api/audit/restore-tamper")
def api_restore_tamper(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return restore_tampered_row_for_demo(db)