BEGIN;
CREATE TABLE closed_account (
  namespace TEXT NOT NULL,
  id TEXT NOT NULL,
  professional_id TEXT,
  PRIMARY KEY(namespace, id)
);
INSERT INTO schema_migration(id) VALUES('005_account_closure');
COMMIT;
