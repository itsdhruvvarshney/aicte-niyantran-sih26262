import hashlib
import hmac
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Iterable, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import get_db
from .models import Application, SystemClockState, User

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "sih-2026-ps26262-aicte-niyantran-jwt-secret-key-998877",
)
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

VAULT_SIGNING_SECRET = os.getenv(
    "VAULT_SIGNING_SECRET",
    "sih-2026-ps26262-private-document-vault-hmac-key",
).encode("utf-8")

security_scheme = HTTPBearer(auto_error=False)


def get_simulated_now(db: Session) -> datetime:
    """
    Returns the current system timestamp adjusted by the Time-Travel Clock offset_days.
    Allows judges to jump +7d, +15d, +30d, or +90d in real time during the Finale demo.
    """
    clock = db.query(SystemClockState).filter_by(id=1).first()
    offset_days = clock.offset_days if clock else 0.0
    return datetime.now(timezone.utc) + timedelta(days=offset_days)


def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "jurisdiction_code": user.jurisdiction_code,
        "institution_id": user.institution_id,
        "full_name": user.full_name,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Valid Bearer JWT token missing.",
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired JWT token.",
        )

    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists.",
        )
    return user


def enforce_role_and_jurisdiction(
    user: User,
    allowed_roles: Iterable[str],
    app_record: Optional[Application] = None,
) -> None:
    """
    Server-Side RBAC + Regional Jurisdiction ABAC Guardrail.
    Raises HTTP 403 Forbidden (distinct from HTTP 409 state conflicts) if violated.
    """
    allowed_set = set(allowed_roles)
    if user.role not in allowed_set:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"RBAC Violation: Role '{user.role}' is not permitted. Allowed roles: {sorted(allowed_set)}.",
        )

    if app_record is not None:
        # Institution user can only access or modify their own institution's cases
        if user.role == "INSTITUTION" and user.institution_id != app_record.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ABAC Confidentiality Violation: Institution can only access its own applications.",
            )
        # Regional/Committee officers are bound to their assigned Region unless they belong to HQ
        if user.role in ("SCRUTINY_OFFICER", "EVC_COMMITTEE", "REGIONAL_OFFICER"):
            if user.jurisdiction_code not in ("HQ", app_record.jurisdiction_code):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Jurisdiction Mismatch: Officer assigned to '{user.jurisdiction_code}' "
                        f"cannot act on case in region '{app_record.jurisdiction_code}'."
                    ),
                )


def generate_signed_vault_url(submission_id: int, expires_in_seconds: int = 900) -> str:
    """
    Generates a short-lived HMAC-SHA256 signed download path for private compliance documents.
    Prevents direct public URL exposure of institutional land leases and affidavits.
    """
    expires = int(time.time()) + expires_in_seconds
    msg = f"{submission_id}:{expires}".encode("utf-8")
    sig = hmac.new(VAULT_SIGNING_SECRET, msg, hashlib.sha256).hexdigest()
    return f"/api/documents/{submission_id}/download?expires={expires}&sig={sig}"


def verify_signed_vault_url(submission_id: int, expires: int, sig: str) -> bool:
    if int(time.time()) > expires:
        return False
    msg = f"{submission_id}:{expires}".encode("utf-8")
    expected_sig = hmac.new(VAULT_SIGNING_SECRET, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, sig)