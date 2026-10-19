"""
backend/tests/test_invoices.py
Invoice endpoint tests — all run against SQLite in-memory.

Covers:
  - Missing token returns 403
  - Invalid/malformed token returns 403
  - Tenant A can list their own invoices
  - Tenant B can list their own invoices
  - Tenant A can retrieve their own invoice by ID
  - Tenant B can retrieve their own invoice by ID
"""
from __future__ import annotations

import pytest


class TestInvoiceAuth:
    def test_no_token_returns_401(self, test_client, seed_db):
        # FastAPI HTTPBearer returns 401 when Authorization header is absent.
        resp = test_client.get("/invoices")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, test_client, seed_db):
        # A Bearer token that fails JWT verification → 401 Unauthorized.
        resp = test_client.get(
            "/invoices",
            headers={"Authorization": "Bearer not.a.real.token"},
        )
        assert resp.status_code == 401

    def test_malformed_header_returns_401(self, test_client, seed_db):
        # Non-Bearer scheme → HTTPBearer rejects it → 401 Unauthorized.
        resp = test_client.get(
            "/invoices",
            headers={"Authorization": "Token abc123"},
        )
        assert resp.status_code == 401


class TestInvoiceList:
    def test_tenant_a_sees_own_invoices(self, test_client, auth_headers_a, seed_db):
        resp = test_client.get("/invoices", headers=auth_headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        ids = [item["id"] for item in data["items"]]
        assert 101 in ids
        assert 102 in ids

    def test_tenant_b_sees_own_invoices(self, test_client, auth_headers_b, seed_db):
        resp = test_client.get("/invoices", headers=auth_headers_b)
        assert resp.status_code == 200
        data = resp.json()
        ids = [item["id"] for item in data["items"]]
        assert 202 in ids
        assert 203 in ids

    def test_tenant_a_does_not_see_tenant_b_invoices(
        self, test_client, auth_headers_a, seed_db
    ):
        resp = test_client.get("/invoices", headers=auth_headers_a)
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()["items"]]
        assert 202 not in ids
        assert 203 not in ids

    def test_tenant_b_does_not_see_tenant_a_invoices(
        self, test_client, auth_headers_b, seed_db
    ):
        resp = test_client.get("/invoices", headers=auth_headers_b)
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()["items"]]
        assert 101 not in ids
        assert 102 not in ids

    def test_invoice_response_has_required_fields(
        self, test_client, auth_headers_a, seed_db
    ):
        resp = test_client.get("/invoices", headers=auth_headers_a)
        item = resp.json()["items"][0]
        assert "id" in item
        assert "description" in item
        assert "amount" in item


class TestInvoiceGetById:
    def test_tenant_a_reads_own_invoice_101(self, test_client, auth_headers_a, seed_db):
        resp = test_client.get("/invoices/101", headers=auth_headers_a)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == 101

    def test_tenant_b_reads_own_invoice_202(self, test_client, auth_headers_b, seed_db):
        resp = test_client.get("/invoices/202", headers=auth_headers_b)
        assert resp.status_code == 200
        assert resp.json()["id"] == 202

    def test_nonexistent_invoice_returns_404(self, test_client, auth_headers_a, seed_db):
        resp = test_client.get("/invoices/99999", headers=auth_headers_a)
        assert resp.status_code == 404
