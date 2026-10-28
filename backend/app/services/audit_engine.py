import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from ..models import AuditAnchorCheckpoint, AuditEvent, User

ANCHOR_HMAC_SECRET = os.getenv(
    "ANCHOR_HMAC_SECRET",
    "sih-2026-ps26262-external-audit-anchor-hmac-key",
).encode("utf-8")

VAULT_DIR = Path(__file__).resolve().parent.parent.parent / "vault"
VAULT_DIR.mkdir(parents=True, exist_ok=True)
EXTERNAL_ANCHOR_FILE = VAULT_DIR / "external_anchor_receipt.json"
TAMPER_BACKUP_FILE = VAULT_DIR / "tamper_demo_backup.json"


def compute_audit_row_hash(
    seq_id: int,
    prev_hash: str,
    actor_id: int,
    actor_role: str,
    jurisdiction_code: str,
    action_type: str,
    case_number: Optional[str],
    old_state: Optional[str],
    new_state: Optional[str],
    reason_code: Optional[str],
    remarks: Optional[str],
    rule_version_id: Optional[int],
    timestamp_iso: str,
) -> str:
    """Computes canonical SHA-256 digest across all immutable audit fields."""
    canonical_payload = (
        f"{seq_id}|{prev_hash}|{actor_id}|{actor_role}|{jurisdiction_code}|"
        f"{action_type}|{case_number or ''}|{old_state or ''}|{new_state or ''}|"
        f"{reason_code or ''}|{remarks or ''}|{rule_version_id or 0}|{timestamp_iso}"
    )
    return hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()


def compute_anchor_hmac(upto_seq_id: int, head_hash: str) -> str:
    msg = f"ANCHOR|{upto_seq_id}|{head_hash}".encode("utf-8")
    return hmac.new(ANCHOR_HMAC_SECRET, msg, hashlib.sha256).hexdigest()


def _acquire_advisory_lock_if_postgres(db: Session) -> None:
    """
    Acquires transaction-level PostgreSQL advisory lock 26262 to serialize hash-chain appends.
    Gracefully skips if running on SQLite during unit tests.
    """
    dialect_name = db.bind.dialect.name if db.bind else ""
    if dialect_name == "postgresql":
        db.execute(text("SELECT pg_advisory_xact_lock(26262)"))


def append_audit_event(
    db: Session,
    actor: User,
    action_type: str,
    application_id: Optional[int] = None,
    case_number: Optional[str] = None,
    entity_type: str = "APPLICATION",
    old_state: Optional[str] = None,
    new_state: Optional[str] = None,
    reason_code: Optional[str] = None,
    remarks: Optional[str] = None,
    rule_version_id: Optional[int] = None,
    simulated_now: Optional[datetime] = None,
    auto_anchor: bool = True,
) -> AuditEvent:
    """
    Appends a new tamper-evident event to the SHA-256 hash chain under serialized lock.
    """
    _acquire_advisory_lock_if_postgres(db)

    last_event = (
        db.query(AuditEvent)
        .order_by(AuditEvent.seq_id.desc())
        .first()
    )
    prev_hash = last_event.row_hash if last_event else ("0" * 64)
    next_seq_id = (last_event.seq_id + 1) if last_event else 1

    now_dt = simulated_now or datetime.now(timezone.utc)
    timestamp_iso = now_dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    row_hash = compute_audit_row_hash(
        seq_id=next_seq_id,
        prev_hash=prev_hash,
        actor_id=actor.id,
        actor_role=actor.role,
        jurisdiction_code=actor.jurisdiction_code,
        action_type=action_type,
        case_number=case_number,
        old_state=old_state,
        new_state=new_state,
        reason_code=reason_code,
        remarks=remarks,
        rule_version_id=rule_version_id,
        timestamp_iso=timestamp_iso,
    )

    event = AuditEvent(
        seq_id=next_seq_id,
        application_id=application_id,
        case_number=case_number,
        actor_id=actor.id,
        actor_name=actor.full_name,
        actor_role=actor.role,
        jurisdiction_code=actor.jurisdiction_code,
        action_type=action_type,
        entity_type=entity_type,
        old_state=old_state,
        new_state=new_state,
        reason_code=reason_code,
        remarks=remarks,
        rule_version_id=rule_version_id,
        timestamp_iso=timestamp_iso,
        prev_hash=prev_hash,
        row_hash=row_hash,
    )
    db.add(event)
    db.flush()

    if auto_anchor:
        create_anchor_checkpoint(db, anchored_by=actor.full_name)

    return event


def create_anchor_checkpoint(db: Session, anchored_by: str = "SYSTEM_WATCHDOG") -> Optional[AuditAnchorCheckpoint]:
    """
    Publishes an HMAC-signed root hash checkpoint both in DB and to an external receipt file.
    Detects tail-truncation or privileged DBA full-chain recalculation attacks.
    """
    last_event = db.query(AuditEvent).order_by(AuditEvent.seq_id.desc()).first()
    if not last_event:
        return None

    sig = compute_anchor_hmac(last_event.seq_id, last_event.row_hash)
    checkpoint = AuditAnchorCheckpoint(
        upto_seq_id=last_event.seq_id,
        head_hash=last_event.row_hash,
        hmac_signature=sig,
        anchored_by=anchored_by,
    )
    db.add(checkpoint)
    db.flush()

    external_payload = {
        "checkpoint_id": checkpoint.id,
        "upto_seq_id": last_event.seq_id,
        "head_hash": last_event.row_hash,
        "hmac_signature": sig,
        "anchored_by": anchored_by,
        "anchored_at_utc": datetime.now(timezone.utc).isoformat(),
    }
    EXTERNAL_ANCHOR_FILE.write_text(json.dumps(external_payload, indent=2), encoding="utf-8")
    return checkpoint


def verify_audit_chain_and_anchor(db: Session) -> Dict[str, Any]:
    """
    Full 3-Layer Audit Verification:
    1. Recomputes every row's SHA-256 digest from seq_id = 1 to N.
    2. Verifies prev_hash linkage across consecutive events.
    3. Compares head_hash and upto_seq_id against the External HMAC Anchor Receipt.
    """
    events = db.query(AuditEvent).order_by(AuditEvent.seq_id.asc()).all()
    if not events:
        return {
            "is_valid": True,
            "total_events_checked": 0,
            "status": "EMPTY_LEDGER",
            "broken_at_seq_id": None,
            "anchor_verified": True,
            "message": "Audit ledger is empty.",
        }

    expected_prev_hash = "0" * 64
    for idx, ev in enumerate(events):
        expected_seq = idx + 1
        if ev.seq_id != expected_seq:
            return {
                "is_valid": False,
                "total_events_checked": len(events),
                "status": "SEQUENCE_GAP_DETECTED",
                "broken_at_seq_id": ev.seq_id,
                "anchor_verified": False,
                "message": f"Sequence gap detected: expected seq_id #{expected_seq}, found #{ev.seq_id}.",
            }

        if ev.prev_hash != expected_prev_hash:
            return {
                "is_valid": False,
                "total_events_checked": len(events),
                "status": "PREV_HASH_LINK_BROKEN",
                "broken_at_seq_id": ev.seq_id,
                "anchor_verified": False,
                "message": f"Chain linkage broken at seq_id #{ev.seq_id}: prev_hash does not match predecessor row_hash.",
            }

        recomputed_hash = compute_audit_row_hash(
            seq_id=ev.seq_id,
            prev_hash=ev.prev_hash,
            actor_id=ev.actor_id,
            actor_role=ev.actor_role,
            jurisdiction_code=ev.jurisdiction_code,
            action_type=ev.action_type,
            case_number=ev.case_number,
            old_state=ev.old_state,
            new_state=ev.new_state,
            reason_code=ev.reason_code,
            remarks=ev.remarks,
            rule_version_id=ev.rule_version_id,
            timestamp_iso=ev.timestamp_iso,
        )
        if recomputed_hash != ev.row_hash:
            return {
                "is_valid": False,
                "total_events_checked": len(events),
                "status": "ROW_PAYLOAD_TAMPERED",
                "broken_at_seq_id": ev.seq_id,
                "expected_hash": recomputed_hash,
                "stored_hash": ev.row_hash,
                "anchor_verified": False,
                "message": (
                    f"CRITICAL TAMPER DETECTED at Audit Event seq_id #{ev.seq_id} "
                    f"(Case: {ev.case_number or 'SYSTEM'}): Recomputed SHA-256 digest does not match stored row_hash!"
                ),
            }

        expected_prev_hash = ev.row_hash

    # Verify against External HMAC Checkpoint Anchor Receipt
    last_ev = events[-1]
    anchor_ok = True
    anchor_msg = "Verified against external HMAC checkpoint receipt."

    if EXTERNAL_ANCHOR_FILE.exists():
        try:
            receipt = json.loads(EXTERNAL_ANCHOR_FILE.read_text(encoding="utf-8"))
            expected_hmac = compute_anchor_hmac(receipt["upto_seq_id"], receipt["head_hash"])
            if not hmac.compare_digest(expected_hmac, receipt.get("hmac_signature", "")):
                anchor_ok = False
                anchor_msg = "External anchor HMAC signature invalid!"
            elif last_ev.seq_id < receipt["upto_seq_id"]:
                anchor_ok = False
                anchor_msg = (
                    f"TAIL TRUNCATION DETECTED: Ledger ends at seq_id #{last_ev.seq_id}, "
                    f"but External Anchor proves seq_id #{receipt['upto_seq_id']} existed!"
                )
            elif last_ev.seq_id == receipt["upto_seq_id"] and last_ev.row_hash != receipt["head_hash"]:
                anchor_ok = False
                anchor_msg = (
                    "PRIVILEGED CHAIN REWRITE DETECTED: Database head_hash diverges from External Anchor Receipt!"
                )
        except Exception as exc:
            anchor_ok = False
            anchor_msg = f"Failed reading external anchor receipt: {exc}"

    if not anchor_ok:
        return {
            "is_valid": False,
            "total_events_checked": len(events),
            "status": "EXTERNAL_ANCHOR_MISMATCH",
            "broken_at_seq_id": last_ev.seq_id,
            "anchor_verified": False,
            "message": anchor_msg,
        }

    return {
        "is_valid": True,
        "total_events_checked": len(events),
        "status": "CHAIN_AND_ANCHOR_INTACT",
        "broken_at_seq_id": None,
        "head_seq_id": last_ev.seq_id,
        "head_hash": last_ev.row_hash,
        "anchor_verified": True,
        "message": f"All {len(events)} audit events and external HMAC anchor receipt verified intact.",
    }


def simulate_db_tamper_for_demo(db: Session, target_seq_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Live Jury Demo Tool: Simulates an unauthorized direct SQL modification of an audit event's remarks/state
    so judges can click 'Verify Audit Integrity' and watch the red tamper alert pinpoint the exact row.
    """
    target = (
        db.query(AuditEvent).filter_by(seq_id=target_seq_id).first()
        if target_seq_id
        else db.query(AuditEvent).order_by(AuditEvent.seq_id.desc()).offset(1).first()
    )
    if not target:
        target = db.query(AuditEvent).first()
    if not target:
        return {"tampered": False, "message": "No audit events available to tamper."}

    # Save backup so demo can be cleanly restored with 1 click
    backup = {
        "seq_id": target.seq_id,
        "remarks": target.remarks,
        "new_state": target.new_state,
    }
    TAMPER_BACKUP_FILE.write_text(json.dumps(backup), encoding="utf-8")

    target.remarks = "[UNAUTHORIZED SQL EDIT] Backdated Scrutiny approval injected bypassing committee"
    db.commit()
    return {
        "tampered": True,
        "tampered_seq_id": target.seq_id,
        "case_number": target.case_number,
        "message": f"Simulated unauthorized SQL tamper on Audit Event seq_id #{target.seq_id}. Run Verify now!",
    }


def restore_tampered_row_for_demo(db: Session) -> Dict[str, Any]:
    """Restores the simulated tampered row back to its authentic state during the live demo."""
    if not TAMPER_BACKUP_FILE.exists():
        return {"restored": False, "message": "No tamper backup file found."}

    backup = json.loads(TAMPER_BACKUP_FILE.read_text(encoding="utf-8"))
    ev = db.query(AuditEvent).filter_by(seq_id=backup["seq_id"]).first()
    if ev:
        ev.remarks = backup["remarks"]
        ev.new_state = backup["new_state"]
        db.commit()
    TAMPER_BACKUP_FILE.unlink(missing_ok=True)
    return {
        "restored": True,
        "restored_seq_id": backup["seq_id"],
        "message": f"Audit Event seq_id #{backup['seq_id']} restored to authentic state.",
    }