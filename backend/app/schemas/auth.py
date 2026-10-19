"""
backend/app/schemas/auth.py
Pydantic request/response schemas for authentication endpoints.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """POST /auth/login request body."""

    username: str = Field(..., min_length=1, max_length=80, examples=["tenant_a_user"])
    password: str = Field(..., min_length=1, examples=["TenantA_demo_pw_2024"])


class TokenResponse(BaseModel):
    """POST /auth/login success response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Decoded JWT payload (internal use)."""

    sub: str                   # user ID as string
    username: str | None = None
    tenant_id: int | None = None
