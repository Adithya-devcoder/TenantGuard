"""
backend/app/services/authorization.py
Tenant-level resource authorization helpers.

These functions are called by every protected route handler to enforce
resource ownership. They operate on SQLAlchemy model objects and derive
the caller's tenant identity exclusively from the server-side JWT payload —
never from client-supplied parameters.
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import jwt

from app.core.config import settings
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.invoice import Invoice
from app.models.user import User

_bearer = HTTPBearer(auto_error=True)


# ── Current-user dependency ───────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency: decode the JWT, look up the user in the database,
    and return the ORM User object.

    The caller's tenant_id is read from the User row — NOT from the token payload
    or any client-supplied parameter.

    Raises:
        401 Unauthorized — missing / invalid / expired token.
        401 Unauthorized — user not found or inactive.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    user: User | None = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized

    return user


# ── Resource authorization ────────────────────────────────────────────────────

def get_invoice_or_404(
    invoice_id: int,
    current_user: User,
    db: Session,
) -> Invoice:
    """
    Look up an Invoice and verify the caller's tenant owns it.

    Authorization policy: return 404 for both "not found" and "found but
    belongs to a different tenant". This avoids confirming the existence of
    cross-tenant resources to a potential attacker.

    Args:
        invoice_id: The requested invoice primary key.
        current_user: ORM User object from get_current_user dependency.
        db: SQLAlchemy session.

    Returns:
        Invoice ORM object if the caller is authorized.

    Raises:
        404 Not Found — invoice does not exist OR belongs to another tenant.
    """
    invoice: Invoice | None = (
        db.query(Invoice)
        .filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id,   # ← ownership check
        )
        .first()
    )

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invoice {invoice_id} not found.",
        )

    return invoice
