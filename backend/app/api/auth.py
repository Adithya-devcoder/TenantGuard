"""
backend/app/api/auth.py
POST /auth/login — authenticate a user and return a signed JWT.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and obtain a JWT access token",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Verify username + password and return a JWT.

    The token payload includes the user's database ID (sub) and username.
    The caller's **tenant_id is never embedded in the token** — it is always
    looked up from the database on every protected request.

    Returns 401 for both "user not found" and "wrong password" to avoid
    disclosing which usernames exist.
    """
    invalid_creds = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user: User | None = (
        db.query(User)
        .filter(User.username == body.username, User.is_active == True)  # noqa: E712
        .first()
    )
    if user is None:
        raise invalid_creds

    if not verify_password(body.password, user.hashed_password):
        raise invalid_creds

    token = create_access_token(
        subject=user.id,
        extra_claims={"username": user.username, "tenant_id": user.tenant_id},
    )

    return TokenResponse(access_token=token, token_type="bearer")
