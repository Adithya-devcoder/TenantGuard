"""
scanner/client.py
Authenticated HTTP client for the BOLA scanner.
Handles login, token storage, and request execution with timeouts and error handling.
"""
from __future__ import annotations

from typing import Any

import httpx

from scanner.config import ScannerConfig


class AuthenticatedClient:
    """
    An HTTPX client pre-loaded with a JWT for one tenant user.
    Communicates with the backend only through HTTP — no direct DB access.
    """

    def __init__(
        self,
        base_url: str,
        token: str,
        timeout: float = 10.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._token = token
        self._timeout = timeout

    def get(self, path: str) -> httpx.Response:
        """Issue a GET request with the stored Bearer token."""
        url = f"{self._base_url}{path}"
        with httpx.Client(timeout=self._timeout) as client:
            return client.get(
                url,
                headers={"Authorization": f"Bearer {self._token}"},
            )


def login(base_url: str, username: str, password: str, timeout: float = 10.0) -> str:
    """
    POST /auth/login and return the JWT access token string.

    Raises:
        ConnectionError: When the server is unreachable.
        ValueError: When the server responds with a non-200 status.
    """
    url = f"{base_url.rstrip('/')}/auth/login"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                url,
                json={"username": username, "password": password},
            )
    except httpx.ConnectError as exc:
        raise ConnectionError(
            f"Cannot connect to backend at {base_url}. "
            f"Is the server running? ({exc})"
        ) from exc
    except httpx.TimeoutException as exc:
        raise ConnectionError(f"Login request timed out: {exc}") from exc

    if response.status_code != 200:
        raise ValueError(
            f"Login failed for {username!r}: "
            f"HTTP {response.status_code} — {response.text[:200]}"
        )

    data = response.json()
    token: str = data.get("access_token", "")
    if not token:
        raise ValueError(f"Login response missing access_token: {data}")

    return token


def build_clients(cfg: ScannerConfig) -> tuple[AuthenticatedClient, AuthenticatedClient]:
    """
    Authenticate as Tenant A and Tenant B and return both clients.

    Returns:
        (client_a, client_b) — authenticated HTTPX clients.

    Raises:
        ConnectionError: If the backend is unreachable.
        ValueError: If credentials are rejected.
    """
    token_a = login(
        cfg.target_base_url,
        cfg.tenant_a_username,
        cfg.tenant_a_password,
        timeout=cfg.timeout_seconds,
    )
    token_b = login(
        cfg.target_base_url,
        cfg.tenant_b_username,
        cfg.tenant_b_password,
        timeout=cfg.timeout_seconds,
    )

    client_a = AuthenticatedClient(cfg.target_base_url, token_a, cfg.timeout_seconds)
    client_b = AuthenticatedClient(cfg.target_base_url, token_b, cfg.timeout_seconds)
    return client_a, client_b
