"""
backend/tests/test_auth.py
Authentication tests — all run against SQLite in-memory, no PostgreSQL required.

Covers:
  - Valid login returns 200 + access_token
  - Wrong password returns 401
  - Non-existent user returns 401
  - Empty username/password returns 422
  - Token is a valid JWT containing expected claims
"""
from __future__ import annotations

import jwt
import pytest


# ── Uses session-scoped fixtures from conftest.py ─────────────────────────────

class TestLogin:
    def test_valid_login_tenant_a(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "tenant_a_user", "password": "TestPassA!99"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 20

    def test_valid_login_tenant_b(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "tenant_b_user", "password": "TestPassB!99"},
        )
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_wrong_password_returns_401(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "tenant_a_user", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    def test_nonexistent_user_returns_401(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "ghost_user", "password": "any"},
        )
        assert resp.status_code == 401

    def test_empty_username_returns_422(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "", "password": "TestPassA!99"},
        )
        assert resp.status_code == 422

    def test_empty_password_returns_422(self, test_client, seed_db):
        resp = test_client.post(
            "/auth/login",
            json={"username": "tenant_a_user", "password": ""},
        )
        assert resp.status_code == 422

    def test_token_payload_contains_expected_claims(self, test_client, seed_db):
        """JWT payload must contain 'sub', 'username', and 'tenant_id'."""
        resp = test_client.post(
            "/auth/login",
            json={"username": "tenant_a_user", "password": "TestPassA!99"},
        )
        token = resp.json()["access_token"]
        # Decode without verification to inspect claims
        payload = jwt.decode(token, options={"verify_signature": False})
        assert "sub" in payload
        assert payload.get("username") == "tenant_a_user"
        assert "tenant_id" in payload
        assert "exp" in payload

    def test_both_users_get_different_tokens(self, test_client, seed_db):
        token_a = test_client.post(
            "/auth/login",
            json={"username": "tenant_a_user", "password": "TestPassA!99"},
        ).json()["access_token"]
        token_b = test_client.post(
            "/auth/login",
            json={"username": "tenant_b_user", "password": "TestPassB!99"},
        ).json()["access_token"]
        assert token_a != token_b

    def test_missing_body_returns_422(self, test_client):
        resp = test_client.post("/auth/login", json={})
        assert resp.status_code == 422
