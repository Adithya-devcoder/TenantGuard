"""
scanner/attack_engine.py
BOLA (Broken Object Level Authorization) test execution engine.

This module is called by the /scanner/scan API endpoint.
It communicates with the backend exclusively through HTTP — no direct DB access.

Test cases executed:
  TC-01  Tenant A reads own invoice   → should succeed (200)
  TC-02  Tenant B reads own invoice   → should succeed (200)
  TC-03  Tenant A reads Tenant B's invoice → should be denied (403/404)
  TC-04  Tenant B reads Tenant A's invoice → should be denied (403/404)
"""
from __future__ import annotations

import sys
from typing import Any

import httpx

from scanner.analyzer import analyze_cross_tenant_access, analyze_own_access
from scanner.client import AuthenticatedClient, build_clients
from scanner.config import ScannerConfig


# ── Helper to build a ScanResult dict ────────────────────────────────────────

def _make_result(
    endpoint: str,
    method: str,
    test_type: str,
    actor_tenant: str,
    target_tenant: str,
    http_status: int | None,
    outcome: str,          # "vulnerable" | "not_vulnerable" | "inconclusive"
    severity: str,         # "high" | "medium" | "low" | "info" | "none"
    evidence: str,
    snippet: str | None,
) -> dict[str, Any]:
    return {
        "endpoint": endpoint,
        "method": method,
        "test_type": test_type,
        "actor_tenant": actor_tenant,
        "target_tenant": target_tenant,
        "http_status": http_status,
        "outcome": outcome,
        "severity": severity,
        "evidence": evidence,
        "raw_response_snippet": snippet,
    }


def _probe(
    client: AuthenticatedClient,
    path: str,
) -> tuple[httpx.Response | None, str | None]:
    """
    Send a GET request and return (response, error_message).
    Never raises — errors are captured as strings.
    """
    try:
        resp = client.get(path)
        return resp, None
    except httpx.ConnectError as exc:
        return None, f"Connection refused: {exc}"
    except httpx.TimeoutException as exc:
        return None, f"Request timed out: {exc}"
    except Exception as exc:
        return None, f"Unexpected error: {exc}"


# ── Main entry point ──────────────────────────────────────────────────────────

def run_bola_tests(scan_request: Any) -> list[Any]:
    """
    Execute all BOLA test cases and return a list of ScanResult-compatible dicts.

    Args:
        scan_request: A ScanRequest schema instance (from the API) or a
                      ScannerConfig-compatible object with the same fields.

    Returns:
        List of dicts matching the ScanResult schema.
    """
    # Normalise: accept both ScanRequest (Pydantic) and ScannerConfig (dataclass)
    if hasattr(scan_request, "model_dump"):
        data = scan_request.model_dump()
        cfg = ScannerConfig(**{k: data[k] for k in ScannerConfig.__dataclass_fields__})  # type: ignore[attr-defined]
    else:
        cfg = scan_request  # already a ScannerConfig

    results: list[dict[str, Any]] = []

    # ── Step 1: Authenticate both tenants ─────────────────────────────────────
    try:
        client_a, client_b = build_clients(cfg)
    except (ConnectionError, ValueError) as exc:
        # Both tenants failed to authenticate — all tests are inconclusive
        for actor, target, inv_id in [
            ("tenant_a", "tenant_a", cfg.tenant_a_invoice_id),
            ("tenant_b", "tenant_b", cfg.tenant_b_invoice_id),
            ("tenant_a", "tenant_b", cfg.tenant_b_invoice_id),
            ("tenant_b", "tenant_a", cfg.tenant_a_invoice_id),
        ]:
            results.append(_make_result(
                endpoint=f"GET /invoices/{inv_id}",
                method="GET",
                test_type="own_access" if actor == target else "cross_tenant_read",
                actor_tenant=actor,
                target_tenant=target,
                http_status=None,
                outcome="inconclusive",
                severity="none",
                evidence=f"Authentication failed — cannot run tests: {exc}",
                snippet=None,
            ))
        return results

    # ── TC-01: Tenant A reads own invoice ─────────────────────────────────────
    path_a = f"/invoices/{cfg.tenant_a_invoice_id}"
    resp, err = _probe(client_a, path_a)
    if err:
        results.append(_make_result(
            endpoint=f"GET {path_a}", method="GET",
            test_type="own_access", actor_tenant="tenant_a", target_tenant="tenant_a",
            http_status=None, outcome="inconclusive", severity="none",
            evidence=f"Request failed: {err}", snippet=None,
        ))
    else:
        ar = analyze_own_access(resp, cfg.tenant_a_invoice_id, cfg)
        results.append(_make_result(
            endpoint=f"GET {path_a}", method="GET",
            test_type="own_access", actor_tenant="tenant_a", target_tenant="tenant_a",
            http_status=resp.status_code,
            outcome="inconclusive" if ar.is_inconclusive else "not_vulnerable",
            severity="none",
            evidence=ar.evidence, snippet=ar.snippet,
        ))

    # ── TC-02: Tenant B reads own invoice ─────────────────────────────────────
    path_b = f"/invoices/{cfg.tenant_b_invoice_id}"
    resp, err = _probe(client_b, path_b)
    if err:
        results.append(_make_result(
            endpoint=f"GET {path_b}", method="GET",
            test_type="own_access", actor_tenant="tenant_b", target_tenant="tenant_b",
            http_status=None, outcome="inconclusive", severity="none",
            evidence=f"Request failed: {err}", snippet=None,
        ))
    else:
        ar = analyze_own_access(resp, cfg.tenant_b_invoice_id, cfg)
        results.append(_make_result(
            endpoint=f"GET {path_b}", method="GET",
            test_type="own_access", actor_tenant="tenant_b", target_tenant="tenant_b",
            http_status=resp.status_code,
            outcome="inconclusive" if ar.is_inconclusive else "not_vulnerable",
            severity="none",
            evidence=ar.evidence, snippet=ar.snippet,
        ))

    # ── TC-03: Tenant A reads Tenant B's invoice ──────────────────────────────
    resp, err = _probe(client_a, path_b)
    if err:
        results.append(_make_result(
            endpoint=f"GET {path_b}", method="GET",
            test_type="cross_tenant_read",
            actor_tenant="tenant_a", target_tenant="tenant_b",
            http_status=None, outcome="inconclusive", severity="none",
            evidence=f"Request failed: {err}", snippet=None,
        ))
    else:
        ar = analyze_cross_tenant_access(resp, cfg.tenant_b_invoice_id, "Tenant B", cfg)
        results.append(_make_result(
            endpoint=f"GET {path_b}", method="GET",
            test_type="cross_tenant_read",
            actor_tenant="tenant_a", target_tenant="tenant_b",
            http_status=resp.status_code,
            outcome=(
                "vulnerable" if ar.is_vulnerable
                else "inconclusive" if ar.is_inconclusive
                else "not_vulnerable"
            ),
            severity="high" if ar.is_vulnerable else "none",
            evidence=ar.evidence, snippet=ar.snippet,
        ))

    # ── TC-04: Tenant B reads Tenant A's invoice ──────────────────────────────
    resp, err = _probe(client_b, path_a)
    if err:
        results.append(_make_result(
            endpoint=f"GET {path_a}", method="GET",
            test_type="cross_tenant_read",
            actor_tenant="tenant_b", target_tenant="tenant_a",
            http_status=None, outcome="inconclusive", severity="none",
            evidence=f"Request failed: {err}", snippet=None,
        ))
    else:
        ar = analyze_cross_tenant_access(resp, cfg.tenant_a_invoice_id, "Tenant A", cfg)
        results.append(_make_result(
            endpoint=f"GET {path_a}", method="GET",
            test_type="cross_tenant_read",
            actor_tenant="tenant_b", target_tenant="tenant_a",
            http_status=resp.status_code,
            outcome=(
                "vulnerable" if ar.is_vulnerable
                else "inconclusive" if ar.is_inconclusive
                else "not_vulnerable"
            ),
            severity="high" if ar.is_vulnerable else "none",
            evidence=ar.evidence, snippet=ar.snippet,
        ))

    return results
