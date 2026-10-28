import hashlib
import re
from datetime import date
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..auth import enforce_role_and_jurisdiction, generate_signed_vault_url, get_simulated_now
from ..models import Application, EvidenceSubmission, Obligation, User
from .audit_engine import append_audit_event

VAULT_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "vault"
VAULT_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _assistive_extract_expiry_date(
    raw_bytes: bytes,
    filename: str,
    claimed_expiry: Optional[date],
) -> tuple[Optional[date], str]:
    """
    Assistive OCR/Regex Expiry Date Extractor (Decision-Support Only).
    Scans PDF text stream or filename for YYYY-MM-DD expiry dates and compares against claimed_expiry.
    """
    text_sample = raw_bytes.decode("latin-1", errors="ignore") + " " + filename
    iso_matches = re.findall(r"(20[2-9]\d-[01]\d-[0-3]\d)", text_sample)
    for match_str in iso_matches:
        try:
            extracted_dt = date.fromisoformat(match_str)
            if claimed_expiry:
                if extracted_dt == claimed_expiry:
                    return extracted_dt, "EXACT_MATCH"
                return extracted_dt, "MISMATCH_FLAGGED"
            return extracted_dt, "EXACT_MATCH"
        except ValueError:
            continue

    if claimed_expiry:
        return claimed_expiry, "EXACT_MATCH"
    return None, "MANUAL_ENTRY_ONLY"


def upload_compliance_evidence(
    db: Session,
    obligation_id: int,
    original_filename: str,
    file_bytes: bytes,
    claimed_issue_date: Optional[date],
    claimed_expiry_date: Optional[date],
    current_user: User,
) -> EvidenceSubmission:
    """
    PS Sections D & E: Institution uploads supporting compliance evidence or renewed lease deed.
    CRITICAL RULE: Uploading sets state to 'SUBMITTED' (never 'VERIFIED').
    """
    ob = db.query(Obligation).filter_by(id=obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    app = db.query(Application).filter_by(id=ob.application_id).first()
    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=["INSTITUTION", "REGIONAL_OFFICER", "BUREAU_ADMIN"],
        app_record=app,
    )

    now = get_simulated_now(db)
    next_version = ob.current_evidence_version + 1
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", original_filename or "evidence.pdf")
    stored_filename = f"case_{app.id}_ob_{ob.id}_v{next_version}_{safe_name}"
    storage_path = VAULT_STORAGE_DIR / stored_filename
    storage_path.write_bytes(file_bytes)

    ocr_expiry, match_status = _assistive_extract_expiry_date(
        file_bytes, original_filename, claimed_expiry_date
    )

    submission = EvidenceSubmission(
        obligation_id=ob.id,
        application_id=app.id,
        version_no=next_version,
        document_category=ob.document_type or "COMPLIANCE_EVIDENCE",
        original_filename=original_filename,
        vault_storage_path=stored_filename,
        file_sha256_hash=file_hash,
        file_size_bytes=len(file_bytes),
        claimed_issue_date=claimed_issue_date,
        claimed_expiry_date=claimed_expiry_date,
        assistive_ocr_expiry_date=ocr_expiry,
        ocr_match_status=match_status,
        uploaded_by_id=current_user.id,
        uploaded_by_name=current_user.full_name,
        uploaded_at=now,
        verification_decision="PENDING_REVIEW",
        human_confirmed_checkbox=False,
    )
    db.add(submission)

    old_state = ob.state
    ob.state = "SUBMITTED"
    ob.current_evidence_version = next_version
    ob.blocker_reason_code = "EVIDENCE_VERIFICATION_PENDING"
    ob.updated_at = now
    app.last_action_at = now

    append_audit_event(
        db,
        actor=current_user,
        action_type="COMPLIANCE_EVIDENCE_UPLOADED",
        application_id=app.id,
        case_number=app.case_number,
        entity_type="OBLIGATION",
        old_state=old_state,
        new_state="SUBMITTED",
        reason_code=f"VERSION_{next_version}_{match_status}",
        remarks=(
            f"Uploaded '{original_filename}' (v{next_version}, SHA256={file_hash[:12]}...). "
            f"Status set to SUBMITTED awaiting human verification."
        ),
        rule_version_id=app.rule_version_id,
        simulated_now=now,
    )
    db.commit()
    db.refresh(submission)
    return submission


def verify_compliance_evidence(
    db: Session,
    obligation_id: int,
    decision: str,
    human_confirmed_checkbox: bool,
    verifier_remarks: str,
    confirmed_expiry_date: Optional[date],
    current_user: User,
) -> Dict[str, Any]:
    """
    Authorised Officer Verification Gate for Undertakings & Renewed Lease Documents.
    - Enforces human_confirmed_checkbox == True when accepting evidence (HTTP 422).
    - Transitions state from SUBMITTED -> VERIFIED or DEFICIENT.
    """
    ob = db.query(Obligation).filter_by(id=obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligation not found.")

    app = db.query(Application).filter_by(id=ob.application_id).first()
    enforce_role_and_jurisdiction(
        current_user,
        allowed_roles=[ob.assigned_role, "REGIONAL_OFFICER", "COMPETENT_AUTHORITY", "BUREAU_ADMIN"],
        app_record=app,
    )

    latest_sub = (
        db.query(EvidenceSubmission)
        .filter_by(obligation_id=ob.id)
        .order_by(EvidenceSubmission.version_no.desc())
        .first()
    )
    if not latest_sub:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot verify obligation: No evidence submission has been uploaded yet.",
        )

    if decision not in ("ACCEPTED_VERIFIED", "REJECTED_DEFICIENT"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Decision must be 'ACCEPTED_VERIFIED' or 'REJECTED_DEFICIENT'.",
        )

    if decision == "ACCEPTED_VERIFIED" and not human_confirmed_checkbox:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Regulatory Safeguard (HTTP 422): Verifying officer must check 'human_confirmed_checkbox' confirming physical inspection of document & expiry date.",
        )

    if not verifier_remarks or len(verifier_remarks.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Verifier remarks (minimum 5 characters) are mandatory.",
        )

    now = get_simulated_now(db)
    old_state = ob.state

    latest_sub.verification_decision = decision
    latest_sub.human_confirmed_checkbox = human_confirmed_checkbox
    latest_sub.verified_by_id = current_user.id
    latest_sub.verified_by_name = current_user.full_name
    latest_sub.verified_at = now
    latest_sub.verifier_remarks = verifier_remarks.strip()

    if decision == "ACCEPTED_VERIFIED":
        ob.state = "VERIFIED"
        ob.blocker_reason_code = None
        ob.human_verified_by = current_user.id
        ob.human_verified_at = now
        ob.verification_remarks = verifier_remarks.strip()
        if confirmed_expiry_date:
            ob.document_expiry_date = confirmed_expiry_date
        elif latest_sub.claimed_expiry_date:
            ob.document_expiry_date = latest_sub.claimed_expiry_date
    else:
        ob.state = "DEFICIENT"
        ob.blocker_reason_code = "REQUIRED_DOC_MISSING"
        ob.verification_remarks = verifier_remarks.strip()

    ob.updated_at = now
    app.last_action_at = now

    append_audit_event(
        db,
        actor=current_user,
        action_type=f"EVIDENCE_{decision}",
        application_id=app.id,
        case_number=app.case_number,
        entity_type="OBLIGATION",
        old_state=old_state,
        new_state=ob.state,
        reason_code=f"SUBMISSION_V{latest_sub.version_no}",
        remarks=verifier_remarks.strip(),
        rule_version_id=app.rule_version_id,
        simulated_now=now,
    )
    db.commit()

    return {
        "obligation_id": ob.id,
        "new_state": ob.state,
        "submission_version": latest_sub.version_no,
        "verification_decision": latest_sub.verification_decision,
        "verified_by": current_user.full_name,
        "document_expiry_date": str(ob.document_expiry_date) if ob.document_expiry_date else None,
        "signed_download_url": generate_signed_vault_url(latest_sub.id),
    }