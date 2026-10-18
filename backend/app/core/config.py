"""
backend/app/core/config.py
Application-wide settings loaded from environment variables / .env file.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configurable values come from the environment.
    Copy backend/.env.example to backend/.env and fill in real values
    before running the application.
    """

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = (
        "postgresql+psycopg://postgres:CHANGE_ME@localhost:5432/tenantguard"
    )

    # ── JWT ───────────────────────────────────────────────────────────────────
    jwt_secret_key: str = "CHANGE_ME_generate_a_random_hex_secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # ── Demo passwords (used by init_db.py seed only) ─────────────────────────
    tenant_a_demo_password: str = "TenantA_demo_pw_2024"
    tenant_b_demo_password: str = "TenantB_demo_pw_2024"

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        # Look for .env relative to the process working directory (backend/)
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Single shared instance — import this everywhere
settings = Settings()
