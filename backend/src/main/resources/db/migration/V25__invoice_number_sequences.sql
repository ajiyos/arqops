CREATE TABLE invoice_number_sequences (
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year        INT  NOT NULL,
    last_value  INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year)
);

-- Seed from existing invoices that already match INV-YYYY-NNNN... so new numbers do not collide.
INSERT INTO invoice_number_sequences (tenant_id, year, last_value)
SELECT tenant_id, yr, MAX(seq)
FROM (
    SELECT tenant_id,
           (regexp_match(invoice_number, '^INV-([0-9]{4})-([0-9]+)$'))[1]::INT AS yr,
           (regexp_match(invoice_number, '^INV-([0-9]{4})-([0-9]+)$'))[2]::INT AS seq
    FROM invoices
    WHERE deleted_at IS NULL
      AND invoice_number ~ '^INV-[0-9]{4}-[0-9]+$'
) parsed
WHERE yr IS NOT NULL AND seq IS NOT NULL
GROUP BY tenant_id, yr;
