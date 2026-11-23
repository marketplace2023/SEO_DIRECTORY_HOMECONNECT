BEGIN;
ALTER TABLE support_ticket ALTER COLUMN ticket_number DROP NOT NULL;
ALTER TABLE support_ticket ALTER COLUMN ticket_number DROP DEFAULT;
INSERT INTO schema_migration(id) VALUES('004_support_handoff') ON CONFLICT DO NOTHING;
COMMIT;
