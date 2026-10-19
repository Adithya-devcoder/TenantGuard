-- database/schema.sql
-- TenantGuard reference DDL for PostgreSQL 18.
--
-- This file documents the table structure that init_db.py creates via
-- SQLAlchemy's create_all(). Run init_db.py normally; use this file only
-- when you need raw SQL inspection or want to set up the schema manually.
--
-- Usage (psql):
--   psql -U postgres -d tenantguard -f database/schema.sql

-- ── Extensions ────────────────────────────────────────────────────────────────
-- (none required for the base schema)

-- ── Tenants ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username        VARCHAR(80)  NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS ix_users_username  ON users(username);

-- ── Invoices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id          INTEGER      PRIMARY KEY,   -- explicit IDs (101, 202, etc.)
    tenant_id   INTEGER      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount      NUMERIC(12,2) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_invoices_tenant_id ON invoices(tenant_id);

-- ── Scan Reports ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_reports (
    id                   VARCHAR(64)  PRIMARY KEY,
    status               VARCHAR(32)  NOT NULL DEFAULT 'completed',
    total_tests          INTEGER      NOT NULL DEFAULT 0,
    vulnerabilities_found INTEGER     NOT NULL DEFAULT 0,
    results              JSONB,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
