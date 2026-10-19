-- database/rls_policies.sql
-- PostgreSQL Row-Level Security (RLS) — FUTURE ENHANCEMENT
--
-- Status: PLANNED — not yet active in the prototype.
-- Application-level authorization in services/authorization.py is the
-- currently implemented and tested security layer.
--
-- When RLS is enabled, the database enforces tenant isolation independently
-- of application code, providing defense-in-depth. A bug in the application
-- layer cannot leak cross-tenant data because the database rejects the query.
--
-- ── Implementation Notes ──────────────────────────────────────────────────────
--
-- RLS with connection pooling (PgBouncer / SQLAlchemy pool) requires that the
-- tenant context variable is set PER TRANSACTION and NEVER bleeds into the
-- next request. Use SET LOCAL (not SET) so it is automatically reset at
-- transaction commit / rollback.
--
-- ── Example RLS implementation ────────────────────────────────────────────────

-- 1. Enable RLS on the invoices table
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

-- 2. Create the policy — only rows whose tenant_id matches the session variable
-- CREATE POLICY tenant_isolation ON invoices
--     USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- 3. In the application, set the variable at the start of each transaction:
-- SET LOCAL "app.current_tenant_id" = '<tenant_id>';
-- (Use SET LOCAL so it resets when the transaction ends.)

-- 4. Grant connect to a restricted role that does NOT have BYPASSRLS:
-- CREATE ROLE tenantguard_app LOGIN PASSWORD '...';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO tenantguard_app;

-- ── Why deferred ──────────────────────────────────────────────────────────────
-- RLS requires:
--   - A dedicated application DB role (not superuser / postgres).
--   - Careful session variable management in the SQLAlchemy event system.
--   - Integration tests that verify RLS works with the connection pool.
-- These are achievable but deferred to avoid blocking the hackathon prototype.
