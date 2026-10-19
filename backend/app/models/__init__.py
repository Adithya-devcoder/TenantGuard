# backend/app/models/__init__.py
#
# Import all ORM models here in dependency order so SQLAlchemy's mapper
# can resolve string-based relationship references (e.g. "Tenant", "User").
# This module is imported by app/main.py at startup.
#
# Order matters: Tenant first (no FK deps), then User and Invoice (FK → Tenant),
# then ScanReport (no FK deps on the others).
from app.models.tenant import Tenant          # noqa: F401
from app.models.user import User              # noqa: F401
from app.models.invoice import Invoice        # noqa: F401
from app.models.scan_report import ScanReport # noqa: F401
