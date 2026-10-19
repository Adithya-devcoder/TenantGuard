"""
backend/app/api/invoices.py
GET /invoices      — list invoices for the authenticated tenant.
GET /invoices/{id} — retrieve a single invoice (tenant-scoped).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.invoice import InvoiceListResponse, InvoiceOut
from app.services.authorization import get_current_user, get_invoice_or_404

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get(
    "",
    response_model=InvoiceListResponse,
    summary="List invoices accessible to the authenticated tenant",
)
def list_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceListResponse:
    """
    Returns only invoices that belong to the caller's tenant.
    The tenant filter is applied at the database layer — a user cannot
    see another tenant's invoices by manipulating query parameters.
    """
    invoices = (
        db.query(Invoice)
        .filter(Invoice.tenant_id == current_user.tenant_id)
        .order_by(Invoice.id)
        .all()
    )
    return InvoiceListResponse(
        items=[InvoiceOut.model_validate(inv) for inv in invoices]
    )


@router.get(
    "/{invoice_id}",
    response_model=InvoiceOut,
    summary="Retrieve an invoice (must belong to the authenticated tenant)",
)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> InvoiceOut:
    """
    Returns the invoice only when it exists AND belongs to the caller's tenant.
    Returns 404 otherwise (same response for "not found" and "unauthorized")
    to avoid confirming the existence of cross-tenant resources.
    """
    invoice = get_invoice_or_404(invoice_id, current_user, db)
    return InvoiceOut.model_validate(invoice)
