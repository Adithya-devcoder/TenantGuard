"""
backend/init_db.py
Repeatable database initialization script.

Run this once after PostgreSQL is running and tenantguard database exists:

    cd backend
    python init_db.py

Safe to re-run: it uses INSERT ... ON CONFLICT DO NOTHING so existing rows
are preserved. It does NOT drop tables or delete data.

Prerequisites:
  1. PostgreSQL is running.
  2. Database `tenantguard` has been created.
  3. backend/.env exists with a valid DATABASE_URL.
  4. pip install -r requirements.txt has been run.
"""
from __future__ import annotations

import sys

# Ensure imports resolve from the backend/ directory
sys.path.insert(0, ".")

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import Base, SessionLocal, get_engine

# Import all models so SQLAlchemy registers them before create_all
from app.models.invoice import Invoice  # noqa: F401
from app.models.scan_report import ScanReport  # noqa: F401
from app.models.tenant import Tenant  # noqa: F401
from app.models.user import User  # noqa: F401


def init_schema() -> None:
    """Create all tables if they do not already exist."""
    print("[init_db] Creating tables (if not exist)...")
    Base.metadata.create_all(bind=get_engine())
    print("[init_db] Tables ready.")


def seed_data() -> None:
    """
    Insert demo tenants, users, and invoices.
    Uses get-or-create logic so re-runs do not duplicate rows.
    """
    db = SessionLocal()
    try:
        # ── Tenant A ──────────────────────────────────────────────────────────
        tenant_a = db.query(Tenant).filter(Tenant.name == "Tenant Alpha").first()
        if not tenant_a:
            tenant_a = Tenant(name="Tenant Alpha")
            db.add(tenant_a)
            db.flush()  # get the generated id
            print(f"[init_db] Created Tenant Alpha (id={tenant_a.id})")
        else:
            print(f"[init_db] Tenant Alpha already exists (id={tenant_a.id})")

        # ── Tenant B ──────────────────────────────────────────────────────────
        tenant_b = db.query(Tenant).filter(Tenant.name == "Tenant Beta").first()
        if not tenant_b:
            tenant_b = Tenant(name="Tenant Beta")
            db.add(tenant_b)
            db.flush()
            print(f"[init_db] Created Tenant Beta (id={tenant_b.id})")
        else:
            print(f"[init_db] Tenant Beta already exists (id={tenant_b.id})")

        # ── User for Tenant A ─────────────────────────────────────────────────
        user_a = db.query(User).filter(User.username == "tenant_a_user").first()
        if not user_a:
            user_a = User(
                tenant_id=tenant_a.id,
                username="tenant_a_user",
                hashed_password=hash_password(settings.tenant_a_demo_password),
            )
            db.add(user_a)
            print("[init_db] Created user: tenant_a_user")
        else:
            print("[init_db] User tenant_a_user already exists")

        # ── User for Tenant B ─────────────────────────────────────────────────
        user_b = db.query(User).filter(User.username == "tenant_b_user").first()
        if not user_b:
            user_b = User(
                tenant_id=tenant_b.id,
                username="tenant_b_user",
                hashed_password=hash_password(settings.tenant_b_demo_password),
            )
            db.add(user_b)
            print("[init_db] Created user: tenant_b_user")
        else:
            print("[init_db] User tenant_b_user already exists")

        db.flush()

        # ── Invoice 101 — belongs to Tenant A ────────────────────────────────
        inv_101 = db.query(Invoice).filter(Invoice.id == 101).first()
        if not inv_101:
            inv_101 = Invoice(
                id=101,
                tenant_id=tenant_a.id,
                description="Invoice A — Cloud Services Q4",
                amount=1500.00,
                notes="Demo invoice for Tenant Alpha",
            )
            db.add(inv_101)
            print("[init_db] Created Invoice 101 (Tenant A)")
        else:
            print("[init_db] Invoice 101 already exists")

        # ── Invoice 102 — also Tenant A ───────────────────────────────────────
        inv_102 = db.query(Invoice).filter(Invoice.id == 102).first()
        if not inv_102:
            inv_102 = Invoice(
                id=102,
                tenant_id=tenant_a.id,
                description="Invoice A — Support Contract Q4",
                amount=750.00,
                notes="Second demo invoice for Tenant Alpha",
            )
            db.add(inv_102)
            print("[init_db] Created Invoice 102 (Tenant A)")

        # ── Invoice 202 — belongs to Tenant B ────────────────────────────────
        inv_202 = db.query(Invoice).filter(Invoice.id == 202).first()
        if not inv_202:
            inv_202 = Invoice(
                id=202,
                tenant_id=tenant_b.id,
                description="Invoice B — Analytics Platform Q4",
                amount=3200.00,
                notes="Demo invoice for Tenant Beta",
            )
            db.add(inv_202)
            print("[init_db] Created Invoice 202 (Tenant B)")
        else:
            print("[init_db] Invoice 202 already exists")

        # ── Invoice 203 — also Tenant B ───────────────────────────────────────
        inv_203 = db.query(Invoice).filter(Invoice.id == 203).first()
        if not inv_203:
            inv_203 = Invoice(
                id=203,
                tenant_id=tenant_b.id,
                description="Invoice B — Consulting Services Q4",
                amount=1100.00,
                notes="Second demo invoice for Tenant Beta",
            )
            db.add(inv_203)
            print("[init_db] Created Invoice 203 (Tenant B)")

        db.commit()
        print("\n[init_db] ✅ Seed data committed successfully.")
        print(f"  Tenant A user : tenant_a_user  (password from TENANT_A_DEMO_PASSWORD)")
        print(f"  Tenant B user : tenant_b_user  (password from TENANT_B_DEMO_PASSWORD)")
        print(f"  Tenant A invoices : 101, 102")
        print(f"  Tenant B invoices : 202, 203")

    except Exception as exc:
        db.rollback()
        print(f"[init_db] ❌ Error during seed: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("[init_db] Starting database initialization...")
    print(f"[init_db] Target: {settings.database_url.split('@')[-1]}")  # hide creds
    init_schema()
    seed_data()
    print("[init_db] Done.")
