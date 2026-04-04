ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS google_refresh_token_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS google_root_folder_id      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS google_connected_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS google_connected_email      VARCHAR(320);
