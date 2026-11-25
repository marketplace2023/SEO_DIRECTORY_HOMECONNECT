BEGIN;
CREATE TABLE IF NOT EXISTS contractor_work_item (
  namespace TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  id TEXT NOT NULL,
  code TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (namespace, professional_id, id),
  UNIQUE (namespace, professional_id, code)
);
CREATE TABLE IF NOT EXISTS contractor_estimate (
  namespace TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  PRIMARY KEY (namespace, professional_id, id)
);
INSERT INTO schema_migration(id) VALUES('005_contractor_estimates') ON CONFLICT DO NOTHING;
COMMIT;
