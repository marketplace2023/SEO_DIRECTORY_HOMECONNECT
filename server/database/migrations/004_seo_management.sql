BEGIN;
CREATE TABLE IF NOT EXISTS local_seo_keyword (
 namespace TEXT NOT NULL, id TEXT NOT NULL, professional_id TEXT NOT NULL,
 normalized TEXT NOT NULL, active BOOLEAN NOT NULL, data JSONB NOT NULL,
 PRIMARY KEY(namespace,id), UNIQUE(namespace,professional_id,normalized),
 FOREIGN KEY(namespace,professional_id) REFERENCES local_seo_project(namespace,id)
);
CREATE INDEX IF NOT EXISTS local_seo_keyword_business ON local_seo_keyword(namespace,professional_id,active);
CREATE TABLE IF NOT EXISTS local_seo_content (
 namespace TEXT NOT NULL,id TEXT NOT NULL,professional_id TEXT NOT NULL,data JSONB NOT NULL,
 PRIMARY KEY(namespace,id), FOREIGN KEY(namespace,professional_id) REFERENCES local_seo_project(namespace,id)
);
CREATE INDEX IF NOT EXISTS local_seo_content_business ON local_seo_content(namespace,professional_id);
CREATE TABLE IF NOT EXISTS local_seo_directory (
 namespace TEXT NOT NULL,id TEXT NOT NULL,data JSONB NOT NULL,PRIMARY KEY(namespace,id)
);
CREATE TABLE IF NOT EXISTS local_seo_listing (
 namespace TEXT NOT NULL,id TEXT NOT NULL,professional_id TEXT NOT NULL,directory_id TEXT NOT NULL,data JSONB NOT NULL,
 PRIMARY KEY(namespace,id), UNIQUE(namespace,professional_id,directory_id),
 FOREIGN KEY(namespace,professional_id) REFERENCES local_seo_project(namespace,id),
 FOREIGN KEY(namespace,directory_id) REFERENCES local_seo_directory(namespace,id)
);
CREATE INDEX IF NOT EXISTS local_seo_listing_business ON local_seo_listing(namespace,professional_id);
INSERT INTO schema_migration(id) VALUES('004_seo_management') ON CONFLICT DO NOTHING;
COMMIT;
