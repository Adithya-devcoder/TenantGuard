"""
scanner/analyzer.py
Response analysis: determine whether a BOLA test actually leaked protected data.

A 200 OK response alone is NOT evidence of a vulnerability.
The analyzer inspects the response body and checks whether it contains
a resource that belongs to a different tenant.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from scanner.config import ScannerConfig


class AnalysisResult:
    """Outcome of analyzing one HTTP response."""

    __slots__ = ("is_vulnerable", "is_inconclusive", "evidence", "snippet")

    def __init__(
        self,
        is_vulnerable: bool,
        is_inconclusive: bool,
        evidence: str,
        snippet: str | None = None,
    ) -> None:
        self.is_vulnerable = is_vulnerable
        self.is_inconclusive = is_inconclusive
        self.evidence = evidence
        self.snippet = snippet


def _safe_json(response: httpx.Response) -> dict | None:
    """Return parsed JSON or None if parsing fails."""
    try:
        return response.json()
    except Exception:
        return None


def _truncate(text: str, max_len: int) -> str:
    return text[:max_len] + ("…" if len(text) > max_len else "")


def analyze_own_access(
    response: httpx.Response,
    invoice_id: int,
    cfg: ScannerConfig,
) -> AnalysisResult:
    """
    Verify that a tenant can access their own invoice.

    Expected: 200 OK with a body containing the invoice id.
    """
    snippet = _truncate(response.text, cfg.max_response_snippet_length)

    if response.status_code != 200:
        return AnalysisResult(
            is_vulnerable=False,
            is_inconclusive=True,
            evidence=(
                f"Expected 200 for own invoice {invoice_id}; "
                f"got {response.status_code}. Legitimate access may be broken."
            ),
            snippet=snippet,
        )

    body = _safe_json(response)
    if body is None:
        return AnalysisResult(
            is_vulnerable=False,
            is_inconclusive=True,
            evidence="Response was not valid JSON — cannot confirm own-access success.",
            snippet=snippet,
        )

    if body.get("id") != invoice_id:
        return AnalysisResult(
            is_vulnerable=False,
            is_inconclusive=True,
            evidence=(
                f"Response id={body.get('id')!r} does not match "
                f"expected invoice_id={invoice_id}."
            ),
            snippet=snippet,
        )

    return AnalysisResult(
        is_vulnerable=False,
        is_inconclusive=False,
        evidence=f"Own-access succeeded: invoice {invoice_id} returned correctly.",
        snippet=snippet,
    )


def analyze_cross_tenant_access(
    response: httpx.Response,
    target_invoice_id: int,
    target_tenant_label: str,
    cfg: ScannerConfig,
) -> AnalysisResult:
    """
    Determine whether a cross-tenant request disclosed protected data.

    Vulnerable: HTTP 200 AND response body contains the target invoice id.
    Not Vulnerable: HTTP 403 or 404 (server denied the request).
    Inconclusive: other status codes, or 200 but no recognizable invoice data.
    """
    snippet = _truncate(response.text, cfg.max_response_snippet_length)

    if response.status_code in (403, 404):
        return AnalysisResult(
            is_vulnerable=False,
            is_inconclusive=False,
            evidence=(
                f"Server correctly denied cross-tenant access to invoice "
                f"{target_invoice_id} (HTTP {response.status_code})."
            ),
            snippet=snippet,
        )

    if response.status_code == 200:
        body = _safe_json(response)
        if body is None:
            return AnalysisResult(
                is_vulnerable=False,
                is_inconclusive=True,
                evidence=(
                    f"HTTP 200 returned but response was not valid JSON — "
                    f"cannot confirm data disclosure."
                ),
                snippet=snippet,
            )

        returned_id = body.get("id")
        if returned_id == target_invoice_id:
            # Confirmed: the other tenant's invoice was returned in full
            description = body.get("description", "")
            return AnalysisResult(
                is_vulnerable=True,
                is_inconclusive=False,
                evidence=(
                    f"BOLA CONFIRMED: cross-tenant read succeeded. "
                    f"Tenant accessed {target_tenant_label}'s invoice "
                    f"{target_invoice_id} (description: {description!r}). "
                    f"Protected data was disclosed."
                ),
                snippet=snippet,
            )
        else:
            return AnalysisResult(
                is_vulnerable=False,
                is_inconclusive=True,
                evidence=(
                    f"HTTP 200 but returned id={returned_id!r} does not match "
                    f"target invoice {target_invoice_id} — inconclusive."
                ),
                snippet=snippet,
            )

    # Unexpected status code
    return AnalysisResult(
        is_vulnerable=False,
        is_inconclusive=True,
        evidence=(
            f"Unexpected HTTP {response.status_code} for cross-tenant probe "
            f"of invoice {target_invoice_id} — inconclusive."
        ),
        snippet=snippet,
    )
