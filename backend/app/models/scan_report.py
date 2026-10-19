"""
backend/app/models/scan_report.py
ScanReport ORM model — persists security scan results produced by the scanner.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ScanReport(Base):
    __tablename__ = "scan_reports"

    id: Mapped[str] = mapped_column(
        String(64), primary_key=True, index=True, comment="Unique scan run identifier"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="completed"
    )
    total_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vulnerabilities_found: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    # JSON column stores the full list of ScanResult objects
    results: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return (
            f"<ScanReport id={self.id!r} status={self.status!r} "
            f"vulns={self.vulnerabilities_found}>"
        )
