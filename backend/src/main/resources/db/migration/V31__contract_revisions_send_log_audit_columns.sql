-- JPA TenantAwareEntity expects updated_at / deleted_at on all mapped tables.
-- Databases that applied an earlier checksum of V30__contracts.sql may be missing these columns.

ALTER TABLE contract_revisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE contract_revisions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE contract_send_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE contract_send_log ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
