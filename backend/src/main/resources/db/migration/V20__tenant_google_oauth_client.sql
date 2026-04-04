ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS google_oauth_client_id              VARCHAR(512),
    ADD COLUMN IF NOT EXISTS google_oauth_client_secret_encrypted  TEXT;
