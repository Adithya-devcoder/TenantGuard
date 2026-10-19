"""
scanner/config.py
Scanner configuration — dataclass loaded from environment or direct instantiation.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ScannerConfig:
    """
    All parameters needed to run a BOLA scan.
    Populated from the ScanRequest schema when invoked via the API,
    or set directly in tests.
    """

    target_base_url: str = "http://127.0.0.1:8000"

    # Demo credentials
    tenant_a_username: str = "tenant_a_user"
    tenant_a_password: str = "TenantA_demo_pw_2024"
    tenant_b_username: str = "tenant_b_user"
    tenant_b_password: str = "TenantB_demo_pw_2024"

    # Invoice IDs to probe (must match seed data)
    tenant_a_invoice_id: int = 101
    tenant_b_invoice_id: int = 202

    # HTTP client settings
    timeout_seconds: float = 10.0
    max_response_snippet_length: int = 500
