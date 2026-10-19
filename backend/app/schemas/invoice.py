"""
backend/app/schemas/invoice.py
Pydantic request/response schemas for invoice endpoints.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class InvoiceOut(BaseModel):
    """Single invoice response — safe subset of model columns."""

    id: int
    description: str
    amount: float
    notes: str | None = None

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    """GET /invoices response envelope."""

    items: list[InvoiceOut]
