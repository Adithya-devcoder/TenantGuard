"""
backend/tests/test_tenant_isolation.py
Cross-tenant authorization tests — the critical BOLA test cases.
All run against SQLite in-memory.

These tests verify the CORE security property:
  Tenant A CANNOT access Tenant B's invoices, and vice versa.

Test matrix:
  ✅ Tenant A → own invoice 101      → 200
  🚫 Tenant A → Tenant B invoice 202 → 404
  ✅ Tenant B → own invoice 202      → 200
  🚫 Tenant B → Tenant A invoice 101 → 404
  🚫 Tenant A → Tenant B invoice 203 → 404
  🚫 Tenant B → Tenant A invoice 102 → 404
"""
from __future__ import annotations

import pytest


class TestCrossTenantIsolation:
    """
    These are the security-critical tests.
    A failure here means the authorization check is broken.
    """

    # ── Tenant A cross-tenant attempts ────────────────────────────────────────

    def test_tenant_a_cannot_read_invoice_202(
        self, test_client, auth_headers_a, seed_db
    ):
        """Tenant A must not access Tenant B's primary invoice."""
        resp = test_client.get("/invoices/202", headers=auth_headers_a)
        assert resp.status_code == 404, (
            f"BOLA VULNERABILITY: Tenant A accessed Tenant B's invoice 202. "
            f"Response: {resp.text}"
        )

    def test_tenant_a_cannot_read_invoice_203(
        self, test_client, auth_headers_a, seed_db
    ):
        """Tenant A must not access Tenant B's secondary invoice."""
        resp = test_client.get("/invoices/203", headers=auth_headers_a)
        assert resp.status_code == 404, (
            f"BOLA VULNERABILITY: Tenant A accessed Tenant B's invoice 203."
        )

    def test_tenant_a_can_read_own_invoice_101(
        self, test_client, auth_headers_a, seed_db
    ):
        """Legitimate access must still work after authorization is enforced."""
        resp = test_client.get("/invoices/101", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == 101

    def test_tenant_a_can_read_own_invoice_102(
        self, test_client, auth_headers_a, seed_db
    ):
        resp = test_client.get("/invoices/102", headers=auth_headers_a)
        assert resp.status_code == 200
        assert resp.json()["id"] == 102

    # ── Tenant B cross-tenant attempts ────────────────────────────────────────

    def test_tenant_b_cannot_read_invoice_101(
        self, test_client, auth_headers_b, seed_db
    ):
        """Tenant B must not access Tenant A's primary invoice."""
        resp = test_client.get("/invoices/101", headers=auth_headers_b)
        assert resp.status_code == 404, (
            f"BOLA VULNERABILITY: Tenant B accessed Tenant A's invoice 101. "
            f"Response: {resp.text}"
        )

    def test_tenant_b_cannot_read_invoice_102(
        self, test_client, auth_headers_b, seed_db
    ):
        """Tenant B must not access Tenant A's secondary invoice."""
        resp = test_client.get("/invoices/102", headers=auth_headers_b)
        assert resp.status_code == 404, (
            f"BOLA VULNERABILITY: Tenant B accessed Tenant A's invoice 102."
        )

    def test_tenant_b_can_read_own_invoice_202(
        self, test_client, auth_headers_b, seed_db
    ):
        """Legitimate access must still work for Tenant B."""
        resp = test_client.get("/invoices/202", headers=auth_headers_b)
        assert resp.status_code == 200
        assert resp.json()["id"] == 202

    def test_tenant_b_can_read_own_invoice_203(
        self, test_client, auth_headers_b, seed_db
    ):
        resp = test_client.get("/invoices/203", headers=auth_headers_b)
        assert resp.status_code == 200
        assert resp.json()["id"] == 203

    # ── List isolation ────────────────────────────────────────────────────────

    def test_invoice_list_does_not_leak_cross_tenant_ids(
        self, test_client, auth_headers_a, auth_headers_b, seed_db
    ):
        """Verify neither tenant's list contains the other's invoice IDs."""
        resp_a = test_client.get("/invoices", headers=auth_headers_a)
        resp_b = test_client.get("/invoices", headers=auth_headers_b)

        ids_a = {item["id"] for item in resp_a.json()["items"]}
        ids_b = {item["id"] for item in resp_b.json()["items"]}

        # No overlap
        assert ids_a.isdisjoint(ids_b), (
            f"Invoice ID overlap found: Tenant A sees {ids_a}, "
            f"Tenant B sees {ids_b}. Intersection: {ids_a & ids_b}"
        )
        # Each sees only their own
        assert ids_a == {101, 102}
        assert ids_b == {202, 203}
