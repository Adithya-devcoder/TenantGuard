"""
backend/app/schemas/scan.py
Pydantic request/response schemas for scanner endpoints.
"""
from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class ScanRequest(BaseModel):
    """POST /scanner/scan request body."""

    target_base_url: str = Field(
        default="http://127.0.0.1:8000",
        examples=["http://127.0.0.1:8000"],
        description="Must be localhost or 127.0.0.1 — external URLs are rejected.",
    )
    tenant_a_username: str = Field(..., examples=["tenant_a_user"])
    tenant_a_password: str = Field(..., examples=["TenantA_demo_pw_2024"])
    tenant_b_username: str = Field(..., examples=["tenant_b_user"])
    tenant_b_password: str = Field(..., examples=["TenantB_demo_pw_2024"])

    # Optional: specific invoice IDs to probe. Defaults are the demo seed values.
    tenant_a_invoice_id: int = Field(default=101)
    tenant_b_invoice_id: int = Field(default=202)


class TestOutcome(str, Enum):
    vulnerable = "vulnerable"
    not_vulnerable = "not_vulnerable"
    inconclusive = "inconclusive"


class Severity(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"
    none = "none"


class ScanResult(BaseModel):
    """One test-case result within a scan report."""

    endpoint: str = Field(..., examples=["GET /invoices/202"])
    method: str = Field(..., examples=["GET"])
    test_type: str = Field(..., examples=["cross_tenant_read"])
    actor_tenant: str = Field(..., examples=["tenant_a"])
    target_tenant: str = Field(..., examples=["tenant_b"])
    http_status: int | None = None
    outcome: TestOutcome
    severity: Severity
    evidence: str = Field(..., description="Human-readable explanation of the finding")
    raw_response_snippet: str | None = Field(
        default=None,
        description="Truncated response body used as evidence",
    )


class ScanResponse(BaseModel):
    """POST /scanner/scan and GET /scanner/reports/{id} response."""

    report_id: str
    status: str
    total_tests: int
    vulnerabilities_found: int
    results: list[ScanResult] = Field(default_factory=list)
