from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class SystemClockState(Base):
    """Stores the current simulated Time-Travel offset and configurable Priority Index weights."""
    __tablename__ = "system_clock_state"

    id = Column(Integer, primary_key=True, default=1)
    offset_days = Column(Float, nullable=False, default=0.0)
    w_deadline = Column(Float, nullable=False, default=0.40)
    w_ageing = Column(Float, nullable=False, default=0.35)
    w_blocker = Column(Float, nullable=False, default=0.25)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Jurisdiction(Base):
    """AICTE Regulation Bureau HQ + 8 Regional Offices + Camp Offices."""
    __tablename__ = "jurisdictions"

    code = Column(String(16), primary_key=True)  # e.g., 'HQ', 'NRO', 'NWRO', 'WRO', 'SWRO', 'SCRO', 'SRO', 'ERO', 'CRO'
    name = Column(String(120), nullable=False)
    city = Column(String(80), nullable=False)
    office_type = Column(String(32), nullable=False, default="REGIONAL_OFFICE")  # 'HQ', 'REGIONAL_OFFICE', 'CAMP_OFFICE'


class User(Base):
    """Role-Based & Jurisdiction-Scoped Users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    role = Column(String(40), nullable=False, index=True)
    # Roles: 'INSTITUTION', 'SCRUTINY_OFFICER', 'EVC_COMMITTEE', 'SAC_SHC_COMMITTEE', 'REGIONAL_OFFICER', 'COMPETENT_AUTHORITY', 'BUREAU_ADMIN'
    jurisdiction_code = Column(String(16), ForeignKey("jurisdictions.code"), nullable=False)
    institution_id = Column(Integer, nullable=True, index=True)
    institution_name = Column(String(200), nullable=True)
    password_hash = Column(Text, nullable=False)


class WorkflowRuleVersion(Base):
    """
    Versioned APH Rule-to-Workflow DAG Definitions.
    Explicitly separates STATUTORY_PS_APH routes from CONFIGURABLE_SLA_POLICY timelines.
    """
    __tablename__ = "workflow_rule_versions"
    __table_args__ = (UniqueConstraint("rule_code", "version_num", name="uq_rule_code_version"),)

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(64), nullable=False, index=True)
    version_num = Column(Integer, nullable=False, default=1)
    application_type = Column(String(80), nullable=False, index=True)
    route_pattern = Column(String(64), nullable=False)  # 'ONLY_SCRUTINY', 'SCRUTINY_PLUS_EVC', 'EVC_PLUS_SAC_SHC', 'ONLY_EVC'
    authority_type = Column(String(40), nullable=False, default="STATUTORY_PS_APH")
    sla_policy_label = Column(String(80), nullable=False, default="CONFIGURABLE_SLA_POLICY (Admin Default)")
    source_citation = Column(String(200), nullable=False)
    stages_dag_json = Column(JSON, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    status = Column(String(24), nullable=False, default="AUTHORISED")  # 'DRAFT', 'AUTHORISED', 'ARCHIVED'
    effective_from = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_by = Column(String(120), nullable=False, default="AICTE Regulation Bureau HQ")


class Application(Base):
    """Master Approval Case Record."""
    __tablename__ = "applications"
    __table_args__ = (
        Index("idx_apps_region_stage_status", "jurisdiction_code", "current_stage", "overall_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(40), unique=True, nullable=False, index=True)
    institution_id = Column(Integer, nullable=False, index=True)
    institution_name = Column(String(200), nullable=False)
    jurisdiction_code = Column(String(16), ForeignKey("jurisdictions.code"), nullable=False, index=True)
    application_type = Column(String(80), nullable=False, index=True)
    academic_year = Column(String(16), nullable=False, default="2026-27")
    programme_name = Column(String(120), nullable=False, default="B.Tech Computer Science & Engineering")
    rule_version_id = Column(Integer, ForeignKey("workflow_rule_versions.id"), nullable=False)
    current_stage = Column(String(64), nullable=False, index=True)
    overall_status = Column(String(40), nullable=False, default="IN_PROGRESS", index=True)
    # Statuses: 'IN_PROGRESS', 'REVERTED_DEFICIENT', 'CONDITIONAL_APPROVED', 'APPROVED_FINAL', 'REJECTED_STATUTORY'
    submitted_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_action_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    competent_authority_decision_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    competent_authority_decision_at = Column(DateTime(timezone=True), nullable=True)
    decision_order_ref = Column(String(100), nullable=True)

    rule_version = relationship("WorkflowRuleVersion")
    obligations = relationship("Obligation", back_populates="application", cascade="all, delete-orphan")
    deficiency_cycles = relationship("DeficiencyCycle", back_populates="application", cascade="all, delete-orphan")
    evc_schedule = relationship("EvcSchedule", back_populates="application", uselist=False, cascade="all, delete-orphan")


class Obligation(Base):
    """
    Unified Rule-Driven Obligation Node.
    Models Pre-Approval Workflow Stages, EVC Readiness, Post-Approval Time-Bound Undertakings, and Lease/NOC Validity.
    Enforces the 5-State Lifecycle: REQUIRED -> SUBMITTED -> UNDER_VERIFICATION -> VERIFIED / DEFICIENT -> CLOSED.
    """
    __tablename__ = "obligations"
    __table_args__ = (
        Index("idx_ob_app_type_state", "application_id", "obligation_type", "state"),
    )

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    obligation_type = Column(String(40), nullable=False, index=True)
    # Types: 'WORKFLOW_STAGE', 'EVC_SCHEDULING', 'TIME_BOUND_UNDERTAKING', 'LEASE_DOCUMENT_VALIDITY'
    stage_code = Column(String(64), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=1)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    assigned_role = Column(String(40), nullable=False, index=True)
    prerequisite_codes = Column(JSON, nullable=False, default=list)

    # 5-State Lifecycle: 'REQUIRED', 'SUBMITTED', 'UNDER_VERIFICATION', 'VERIFIED', 'DEFICIENT', 'CLOSED'
    state = Column(String(32), nullable=False, default="REQUIRED", index=True)
    blocker_reason_code = Column(String(64), nullable=True)
    # Structured codes: 'AWAITING_PREREQUISITE', 'SCRUTINY_REVIEW_PENDING', 'INSTITUTION_CLARIFICATION_AWAITED',
    # 'EVC_SCHEDULING_INCOMPLETE', 'EVIDENCE_VERIFICATION_PENDING', 'REQUIRED_DOC_MISSING', 'UNKNOWN_NEEDS_REVIEW'

    sla_days = Column(Integer, nullable=False, default=7)
    sla_policy_source = Column(String(80), nullable=False, default="CONFIGURABLE_SLA_POLICY")
    started_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Specific to Lease & Document Validity Monitoring (Section E)
    document_type = Column(String(64), nullable=True)  # 'LAND_LEASE_DEED', 'FIRE_SAFETY_NOC', 'BUILDING_COMPLETION_CERT', 'BANK_FDR'
    document_issue_date = Column(Date, nullable=True)
    document_expiry_date = Column(Date, nullable=True, index=True)

    # Latest Verification Metadata
    current_evidence_version = Column(Integer, nullable=False, default=0)
    human_verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    human_verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_remarks = Column(Text, nullable=True)
    is_statutory_override = Column(Boolean, nullable=False, default=False)
    override_order_ref = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    application = relationship("Application", back_populates="obligations")
    submissions = relationship("EvidenceSubmission", back_populates="obligation", cascade="all, delete-orphan")


class DeficiencyCycle(Base):
    """
    Non-Destructive Return/Revert & Re-Scrutiny History (PS Section A Bullet 3).
    Never overwrites prior scrutiny observations; increments cycle_no on each revert.
    """
    __tablename__ = "deficiency_cycles"
    __table_args__ = (UniqueConstraint("application_id", "obligation_id", "cycle_no", name="uq_app_ob_cycle"),)

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)
    cycle_no = Column(Integer, nullable=False, default=1)
    reverted_from_stage = Column(String(64), nullable=False)
    reverted_to_stage = Column(String(64), nullable=False, default="INSTITUTION_CLARIFICATION")
    deficiency_code = Column(String(64), nullable=False)
    officer_observations = Column(Text, nullable=False)
    raised_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raised_by_name = Column(String(120), nullable=False)
    raised_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    institution_clarification = Column(Text, nullable=True)
    responded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    resolution_status = Column(String(40), nullable=False, default="OPEN_AWAITING_INSTITUTION")
    # 'OPEN_AWAITING_INSTITUTION', 'RESUBMITTED_FOR_RESCRUTINY', 'RESOLVED_VERIFIED'

    application = relationship("Application", back_populates="deficiency_cycles")


class EvcSchedule(Base):
    """
    Dedicated EVC Queue & Readiness Tracker (PS Section C).
    Strictly separates 'EVC Required (Waiting Scrutiny)' from 'Queued for Scheduling', 'Scheduled', and 'Completed'.
    """
    __tablename__ = "evc_schedules"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_new_institution = Column(Boolean, nullable=False, default=False)
    queue_status = Column(String(48), nullable=False, default="WAITING_PRELIMINARY_SCRUTINY", index=True)
    # States: 'WAITING_PRELIMINARY_SCRUTINY' -> 'QUEUED_FOR_SCHEDULING' -> 'COMMITTEE_ASSIGNED_SCHEDULED' -> 'VISIT_CONDUCTED_REPORT_UPLOADED' -> 'VERIFIED_COMPLETE'
    queued_at = Column(DateTime(timezone=True), nullable=True)
    scheduling_sla_due_at = Column(DateTime(timezone=True), nullable=True)
    completion_sla_due_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_visit_date = Column(Date, nullable=True)
    inspection_mode = Column(String(32), nullable=False, default="ONLINE_APH")  # 'ONLINE_APH', 'PHYSICAL_EXCEPTIONAL'
    committee_chair_ref = Column(String(100), nullable=True)
    evc_observations_summary = Column(Text, nullable=True)
    scheduled_by_ro_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    application = relationship("Application", back_populates="evc_schedule")


class EvidenceSubmission(Base):
    """
    Multi-Version Document Lineage & Verification Ledger (Sections D & E).
    Preserves v1, v2, v3 hashes, assistive OCR date suggestions, and mandatory human verification check.
    """
    __tablename__ = "evidence_submissions"
    __table_args__ = (UniqueConstraint("obligation_id", "version_no", name="uq_obligation_doc_version"),)

    id = Column(Integer, primary_key=True, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    version_no = Column(Integer, nullable=False, default=1)
    document_category = Column(String(64), nullable=False)
    original_filename = Column(String(255), nullable=False)
    vault_storage_path = Column(Text, nullable=False)
    file_sha256_hash = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, nullable=False, default=1024)

    claimed_issue_date = Column(Date, nullable=True)
    claimed_expiry_date = Column(Date, nullable=True)
    assistive_ocr_expiry_date = Column(Date, nullable=True)
    ocr_match_status = Column(String(40), nullable=False, default="EXACT_MATCH")
    # 'EXACT_MATCH', 'MISMATCH_FLAGGED', 'MANUAL_ENTRY_ONLY'

    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_by_name = Column(String(120), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    verification_decision = Column(String(32), nullable=False, default="PENDING_REVIEW")
    # 'PENDING_REVIEW', 'ACCEPTED_VERIFIED', 'REJECTED_DEFICIENT'
    human_confirmed_checkbox = Column(Boolean, nullable=False, default=False)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by_name = Column(String(120), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verifier_remarks = Column(Text, nullable=True)

    obligation = relationship("Obligation", back_populates="submissions")


class EscalationAlert(Base):
    """
    Idempotent Multi-Tier Alerts & Escalation Records (Section F).
    Database UniqueConstraint guarantees zero duplicate alerts across repeated SLA sweeps.
    """
    __tablename__ = "escalation_alerts"
    __table_args__ = (UniqueConstraint("obligation_id", "alert_band", name="uq_idempotent_obligation_alert_band"),)

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    obligation_id = Column(Integer, ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False, index=True)
    case_number = Column(String(40), nullable=False)
    jurisdiction_code = Column(String(16), nullable=False, index=True)
    alert_band = Column(String(40), nullable=False)
    # Bands: 'L1_APPROACHING_48H', 'L2_RO_SLA_BREACH', 'L3_BUREAU_HQ_ESCALATION',
    # 'LEASE_T_MINUS_90D', 'LEASE_T_MINUS_60D', 'LEASE_T_MINUS_30D', 'LEASE_T_MINUS_7D', 'LEASE_EXPIRED_ESCALATION'
    severity = Column(String(20), nullable=False, default="WARNING")  # 'INFO', 'WARNING', 'CRITICAL_ESCALATION'
    recipient_role = Column(String(40), nullable=False, index=True)
    explanation_text = Column(Text, nullable=False)
    next_permitted_action = Column(String(160), nullable=False)
    rule_citation = Column(String(160), nullable=False)
    triggered_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    is_acknowledged = Column(Boolean, nullable=False, default=False)
    acknowledged_by_name = Column(String(120), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledgement_note = Column(Text, nullable=True)


class NotificationLog(Base):
    """Tracks notification channel delivery, retry count, and deduplication status."""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    escalation_alert_id = Column(Integer, ForeignKey("escalation_alerts.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String(24), nullable=False, default="IN_APP_AND_EMAIL")
    recipient_role = Column(String(40), nullable=False)
    delivery_status = Column(String(24), nullable=False, default="DELIVERED")
    retry_count = Column(Integer, nullable=False, default=0)
    dispatched_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


class AuditEvent(Base):
    """
    Tamper-Evident SHA-256 Hash-Chained Audit Ledger.
    Serialized via PostgreSQL pg_advisory_xact_lock(26262) on insert.
    """
    __tablename__ = "audit_events"

    seq_id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True)
    case_number = Column(String(40), nullable=True, index=True)
    actor_id = Column(Integer, nullable=False)
    actor_name = Column(String(120), nullable=False)
    actor_role = Column(String(40), nullable=False)
    jurisdiction_code = Column(String(16), nullable=False)
    action_type = Column(String(64), nullable=False, index=True)
    entity_type = Column(String(40), nullable=False, default="APPLICATION")
    old_state = Column(String(64), nullable=True)
    new_state = Column(String(64), nullable=True)
    reason_code = Column(String(64), nullable=True)
    remarks = Column(Text, nullable=True)
    rule_version_id = Column(Integer, nullable=True)
    timestamp_iso = Column(String(40), nullable=False)
    prev_hash = Column(String(64), nullable=False)
    row_hash = Column(String(64), nullable=False, index=True)


class AuditAnchorCheckpoint(Base):
    """
    External Checkpoint Anchor Receipt to detect privileged DBA hash-chain rewrite or tail truncation.
    """
    __tablename__ = "audit_anchor_checkpoints"

    id = Column(Integer, primary_key=True, index=True)
    upto_seq_id = Column(Integer, nullable=False)
    head_hash = Column(String(64), nullable=False)
    hmac_signature = Column(String(64), nullable=False)
    anchored_by = Column(String(120), nullable=False, default="SYSTEM_WATCHDOG")
    anchored_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)