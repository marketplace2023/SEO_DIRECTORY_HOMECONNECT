-- PostgreSQL prototype schema: Odoo table names, NOT Odoo column definitions.
-- Install only into the prototype database, never an existing Odoo database.
BEGIN;
CREATE TABLE IF NOT EXISTS schema_migration (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS prototype_dataset(namespace TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}');

-- Odoo native table name
CREATE TABLE IF NOT EXISTS res_users (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS res_partner (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS product_category (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS product_template (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS product_product (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS sale_order (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS project_project (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS project_milestone (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Odoo native table name
CREATE TABLE IF NOT EXISTS mail_message (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Custom domain table name
CREATE TABLE IF NOT EXISTS service_request (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Custom domain table name
CREATE TABLE IF NOT EXISTS contractor_credential (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Custom domain table name
CREATE TABLE IF NOT EXISTS contractor_portfolio (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Custom domain table name
CREATE TABLE IF NOT EXISTS contractor_favorite (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

-- Custom domain table name
CREATE TABLE IF NOT EXISTS audit_event (
 namespace TEXT NOT NULL REFERENCES prototype_dataset(namespace) ON DELETE CASCADE,
 id TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0,
 parent_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL DEFAULT '',
 data JSONB NOT NULL,
 PRIMARY KEY(namespace,kind,id)
);

INSERT INTO schema_migration(id) VALUES('001_initial') ON CONFLICT DO NOTHING;
COMMIT;
