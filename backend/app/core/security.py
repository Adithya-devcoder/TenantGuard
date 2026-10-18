"""
backend/app/core/security.py
Password hashing (bcrypt directly) and JWT token handling (PyJWT).

Note: passlib 1.7.4 is incompatible with bcrypt >= 4.x due to a changed API.
We use the bcrypt library directly here for reliability.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt-hashed password string."""
    pwd_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Return True when *plain* matches the stored *hashed* password."""
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8"),
            hashed.encode("utf-8"),
        )
    except Exception:
        return False


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(
    subject: str | int,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT.

    Args:
        subject: Typically the user's primary key (integer).
        extra_claims: Additional payload fields (e.g., username, tenant_id).

    Returns:
        Encoded JWT string.
    """
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT.

    Returns:
        Decoded payload dict.

    Raises:
        jwt.PyJWTError: When signature is invalid, token is expired, etc.
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
