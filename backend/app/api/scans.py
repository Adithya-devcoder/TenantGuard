"""
backend/app/api/scans.py
POST /scanner/scan               — run a controlled BOLA scan against the local API.
GET  /scanner/reports/{report_id} — retrieve a stored scan report.

Security constraints enforced here:
- The target URL must be localhost / 127.0.0.1 — external URLs are rejected.
- The scan is run synchronously (in-process) using the scanner module.
- No shell commands are executed. No arbitrary network targets are allowed.
"""
from __future__ import annotations

import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.scan_report import ScanReport
from app.schemas.scan import ScanRequest, ScanResponse, ScanResult

router = APIRouter(prefix="/scanner", tags=["scanner"])

# ── Allowed target hosts (demo safety guard) ──────────────────────────────────
_ALLOWED_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _assert_local_url(url: str) -> None:
    """Raise 400 if the target URL is not a local loopback address."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
    except Exception:
        host = ""

    if host not in _ALLOWED_HOSTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Scanner target must be localhost or 127.0.0.1. "
                f"Received host: {host!r}"
            ),
        )


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Run a controlled BOLA security scan against the local API",
)
def run_scan(
    body: ScanRequest,
    db: Session = Depends(get_db),
) -> ScanResponse:
    """
    Executes a controlled BOLA test sequence:
    1. Authenticates as Tenant A and Tenant B.
    2. Tests that each tenant can read their own invoice.
    3. Tests whether each tenant can read the other's invoice.
    4. Analyses responses for actual data disclosure.
    5. Persists the report and returns a structured JSON summary.

    The target URL is restricted to localhost/127.0.0.1.
    """
    _assert_local_url(body.target_base_url)

    # Import here to avoid circular imports at module load time.
    # Ensure the repo root (parent of backend/) is on sys.path so the
    # top-level `scanner` package can always be found.
    import sys as _sys
    import pathlib as _pathlib
    _repo_root = str(_pathlib.Path(__file__).resolve().parents[3])
    if _repo_root not in _sys.path:
        _sys.path.insert(0, _repo_root)
    from scanner.attack_engine import run_bola_tests  # type: ignore[import]

    report_id = f"scan-{uuid.uuid4().hex[:8]}"

    try:
        raw_results = run_bola_tests(body)
    except Exception as exc:
        # Scanner error should not expose internals
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Scanner encountered an error: {exc!s}",
        )

    scan_results = [r if isinstance(r, ScanResult) else ScanResult(**r) for r in raw_results]
    vulns = sum(1 for r in scan_results if (r.outcome.value if hasattr(r.outcome, "value") else str(r.outcome)) == "vulnerable")

    # ── Persist report ────────────────────────────────────────────────────────
    report_row = ScanReport(
        id=report_id,
        status="completed",
        total_tests=len(scan_results),
        vulnerabilities_found=vulns,
        results=[r.model_dump() for r in scan_results],
    )
    db.add(report_row)
    db.commit()

    return ScanResponse(
        report_id=report_id,
        status="completed",
        total_tests=len(scan_results),
        vulnerabilities_found=vulns,
        results=scan_results,
    )


@router.get(
    "/reports/latest",
    response_model=ScanResponse,
    summary="Retrieve the most recent scan report",
)
def get_latest_report(db: Session = Depends(get_db)) -> ScanResponse:
    """Return the most recently executed scan report, or 404 if none exist."""
    row: ScanReport | None = (
        db.query(ScanReport).order_by(ScanReport.created_at.desc()).first()
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No scan reports recorded yet.",
        )

    results = [ScanResult(**r) for r in (row.results or [])]

    return ScanResponse(
        report_id=row.id,
        status=row.status,
        total_tests=row.total_tests,
        vulnerabilities_found=row.vulnerabilities_found,
        results=results,
    )


@router.get(
    "/reports/{report_id}",
    response_model=ScanResponse,
    summary="Retrieve a previously generated scan report",
)
def get_report(report_id: str, db: Session = Depends(get_db)) -> ScanResponse:
    """Return a stored scan report by ID, or 404 if not found."""
    row: ScanReport | None = db.get(ScanReport, report_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report {report_id!r} not found.",
        )

    results = [ScanResult(**r) for r in (row.results or [])]

    return ScanResponse(
        report_id=row.id,
        status=row.status,
        total_tests=row.total_tests,
        vulnerabilities_found=row.vulnerabilities_found,
        results=results,
    )
