BEGIN;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS ticket_number BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_number_unique ON support_ticket(ticket_number);
INSERT INTO schema_migration(id) VALUES('003_support_numbers') ON CONFLICT DO NOTHING;
COMMIT;
