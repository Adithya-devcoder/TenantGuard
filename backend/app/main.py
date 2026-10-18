"""
backend/app/main.py
FastAPI application factory — assembles all routers and middleware.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, invoices, scans
from app.core.config import settings
from app.db.session import ping_db

app = FastAPI(
    title="TenantGuard API",
    description=(
        "Tenant-Safe Workspace Portal & API Security Scanner — "
        "Advantix Hackathon, SaaS Track."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(scans.router)


# ── Health endpoints ──────────────────────────────────────────────────────────

@app.get("/health", tags=["health"], summary="Application health check")
def health():
    """Returns app status and database reachability."""
    db_ok = ping_db()
    return {
        "status": "ok",
        "database": "connected" if db_ok else "unreachable",
    }


@app.get("/", tags=["health"], include_in_schema=False)
def root():
    return {"message": "TenantGuard API is running. Visit /docs for the OpenAPI UI."}
