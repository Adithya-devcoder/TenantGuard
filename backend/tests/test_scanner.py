"""
backend/tests/test_scanner.py
Scanner unit tests — no running backend or PostgreSQL required.

These tests exercise the scanner's analysis logic using mocked HTTP responses.
They verify:
  - Correct BOLA detection when a cross-tenant invoice is returned
  - Correct safe result when server returns 404 for cross-tenant access
  - Correct own-access result when a tenant reads their own invoice
  - Inconclusive result on unexpected HTTP status codes
  - Authentication failure handling (server unavailable)
  - Report formatting
"""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import httpx
import pytest

# ── Ensure scanner module is importable ───────────────────────────────────────
import sys, os
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scanner.analyzer import analyze_cross_tenant_access, analyze_own_access
from scanner.config import ScannerConfig
from scanner.report import build_report_dict, format_report_text


# ── Helpers ────────────────────────────────────────────────────────────────────

def _mock_response(status_code: int, body: dict | None = None) -> MagicMock:
    """Build a mock httpx.Response."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    body_str = json.dumps(body) if body is not None else ""
    resp.text = body_str
    resp.json = MagicMock(return_value=body if body is not None else {})
    if body is None:
        resp.json.side_effect = json.JSONDecodeError("no body", "", 0)
    return resp


_cfg = ScannerConfig()


# ── Analyzer: own-access tests ────────────────────────────────────────────────

class TestAnalyzeOwnAccess:
    def test_own_access_200_correct_id(self):
        resp = _mock_response(200, {"id": 101, "description": "Invoice A", "amount": 1500.0})
        result = analyze_own_access(resp, 101, _cfg)
        assert not result.is_vulnerable
        assert not result.is_inconclusive

    def test_own_access_200_wrong_id(self):
        resp = _mock_response(200, {"id": 999, "description": "Wrong"})
        result = analyze_own_access(resp, 101, _cfg)
        assert result.is_inconclusive

    def test_own_access_404_is_inconclusive(self):
        resp = _mock_response(404, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_own_access(resp, 101, _cfg)
        assert result.is_inconclusive

    def test_own_access_invalid_json_is_inconclusive(self):
        resp = _mock_response(200, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_own_access(resp, 101, _cfg)
        assert result.is_inconclusive


# ── Analyzer: cross-tenant tests ──────────────────────────────────────────────

class TestAnalyzeCrossTenantAccess:
    def test_404_is_not_vulnerable(self):
        """Server correctly denies with 404 — application is secure."""
        resp = _mock_response(404, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert not result.is_vulnerable
        assert not result.is_inconclusive

    def test_403_is_not_vulnerable(self):
        """Server correctly denies with 403 — application is secure."""
        resp = _mock_response(403, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert not result.is_vulnerable
        assert not result.is_inconclusive

    def test_200_with_correct_id_is_vulnerable(self):
        """
        HTTP 200 AND the body contains the other tenant's invoice ID.
        This confirms actual data disclosure — BOLA detected.
        """
        resp = _mock_response(
            200,
            {"id": 202, "description": "Invoice B — secret data", "amount": 3200.0},
        )
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert result.is_vulnerable
        assert not result.is_inconclusive
        assert "BOLA CONFIRMED" in result.evidence

    def test_200_with_wrong_id_is_inconclusive(self):
        """
        HTTP 200 but returned a different invoice — inconclusive.
        (Not proof of vulnerability, not proof of safety.)
        """
        resp = _mock_response(200, {"id": 999, "description": "Something else"})
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert not result.is_vulnerable
        assert result.is_inconclusive

    def test_500_is_inconclusive(self):
        resp = _mock_response(500, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert not result.is_vulnerable
        assert result.is_inconclusive

    def test_200_invalid_json_is_inconclusive(self):
        resp = _mock_response(200, None)
        resp.json.side_effect = json.JSONDecodeError("err", "", 0)
        result = analyze_cross_tenant_access(resp, 202, "Tenant B", _cfg)
        assert not result.is_vulnerable
        assert result.is_inconclusive


# ── Attack engine: server-unavailable handling ────────────────────────────────

class TestAttackEngineUnavailableServer:
    def test_all_results_inconclusive_when_server_down(self):
        """
        When the backend is unreachable, all 4 test cases must be marked
        inconclusive — the scanner must not crash.
        """
        from scanner.attack_engine import run_bola_tests

        cfg = ScannerConfig(target_base_url="http://127.0.0.1:19999")  # nothing running

        with patch("scanner.client.login", side_effect=ConnectionError("refused")):
            results = run_bola_tests(cfg)

        assert len(results) == 4
        for r in results:
            assert r["outcome"] == "inconclusive", (
                f"Expected inconclusive but got {r['outcome']} for {r['endpoint']}"
            )


# ── Report generation tests ───────────────────────────────────────────────────

class TestReportGeneration:
    _vuln_result = {
        "endpoint": "GET /invoices/202",
        "method": "GET",
        "test_type": "cross_tenant_read",
        "actor_tenant": "tenant_a",
        "target_tenant": "tenant_b",
        "http_status": 200,
        "outcome": "vulnerable",
        "severity": "high",
        "evidence": "BOLA CONFIRMED: cross-tenant read succeeded.",
        "raw_response_snippet": '{"id": 202, "description": "secret"}',
    }
    _safe_result = {
        "endpoint": "GET /invoices/101",
        "method": "GET",
        "test_type": "own_access",
        "actor_tenant": "tenant_a",
        "target_tenant": "tenant_a",
        "http_status": 200,
        "outcome": "not_vulnerable",
        "severity": "none",
        "evidence": "Own-access succeeded.",
        "raw_response_snippet": '{"id": 101}',
    }

    def test_build_report_counts_vulnerabilities(self):
        report = build_report_dict("scan-test", "completed", [self._vuln_result, self._safe_result])
        assert report["vulnerabilities_found"] == 1
        assert report["total_tests"] == 2

    def test_build_report_zero_vulns(self):
        report = build_report_dict("scan-clean", "completed", [self._safe_result])
        assert report["vulnerabilities_found"] == 0

    def test_build_report_has_disclaimer(self):
        report = build_report_dict("scan-x", "completed", [])
        assert "disclaimer" in report
        assert len(report["disclaimer"]) > 10

    def test_format_report_text_contains_report_id(self):
        report = build_report_dict("scan-abc", "completed", [self._vuln_result])
        text = format_report_text(report)
        assert "scan-abc" in text
        assert "VULNERABLE" in text

    def test_format_report_text_safe(self):
        report = build_report_dict("scan-safe", "completed", [self._safe_result])
        text = format_report_text(report)
        assert "SAFE" in text
