-- Finance demo seed: invoices, payments, vendor bills, expenses
-- Demo tenant matches V8__dev_seed (subdomain demo). V8 user: c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.
-- No clients/vendors existed in prior migrations; this file seeds them with fixed UUIDs for FK stability.
-- Projects from V12 are resolved by name (V12 uses uuid_generate_v4() per run).

DO $$
DECLARE
    v_tenant       UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_admin        UUID := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_client_sharma UUID := 'e1a10000-0001-4001-8001-000000000001';
    v_client_techpark UUID := 'e1a10000-0001-4001-8001-000000000002';
    v_client_mehta UUID := 'e1a10000-0001-4001-8001-000000000003';
    v_vendor_struct UUID := 'f2a20000-0002-4002-8002-000000000001';
    v_vendor_mep UUID := 'f2a20000-0002-4002-8002-000000000002';
    v_vendor_print UUID := 'f2a20000-0002-4002-8002-000000000003';
    v_vendor_civil UUID := 'f2a20000-0002-4002-8002-000000000004';
    v_proj_sharma UUID;
    v_proj_techpark UUID;
BEGIN
    SELECT id INTO v_proj_sharma FROM projects WHERE tenant_id = v_tenant AND name = 'Sharma Residence' LIMIT 1;
    SELECT id INTO v_proj_techpark FROM projects WHERE tenant_id = v_tenant AND name = 'TechPark Office Interiors' LIMIT 1;

    INSERT INTO clients (id, tenant_id, name, type, gstin, industry_segment, created_by, created_at, updated_at)
    VALUES
        (v_client_sharma, v_tenant, 'Sharma Family HUF', 'company', '29AABCS1234F1Z5', 'Residential', v_admin, '2025-06-01 10:00:00+05:30', '2025-06-01 10:00:00+05:30'),
        (v_client_techpark, v_tenant, 'TechPark One Pvt Ltd', 'company', '27AABCT9876E1Z2', 'Commercial IT/ITES', v_admin, '2025-06-01 10:00:00+05:30', '2025-06-01 10:00:00+05:30'),
        (v_client_mehta, v_tenant, 'Mehta Developers LLP', 'company', '29AADCM8899K1Z8', 'Real estate', v_admin, '2025-07-15 11:00:00+05:30', '2025-07-15 11:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO vendors (id, tenant_id, name, category, specialty, status, created_at, updated_at)
    VALUES
        (v_vendor_struct, v_tenant, 'BuildRight Structural Consultants', 'Consultant', 'RCC design & peer review', 'active', '2025-05-01 09:00:00+05:30', '2025-05-01 09:00:00+05:30'),
        (v_vendor_mep, v_tenant, 'PowerLine MEP Services', 'Contractor', 'Electrical & HVAC execution', 'active', '2025-05-01 09:00:00+05:30', '2025-05-01 09:00:00+05:30'),
        (v_vendor_print, v_tenant, 'PrintCraft Pro', 'Supplier', 'A0 plotting & binding', 'active', '2025-05-01 09:00:00+05:30', '2025-05-01 09:00:00+05:30'),
        (v_vendor_civil, v_tenant, 'SiteWorks Civil Contractors', 'Contractor', 'Site execution & labour', 'active', '2025-05-01 09:00:00+05:30', '2025-05-01 09:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    -- Invoices (SAC 998321 – architectural / related consultancy)
    INSERT INTO invoices (id, tenant_id, client_id, project_id, invoice_number, date, due_date, line_items_json, sac_code, cgst, sgst, igst, total, status, created_at, updated_at)
    VALUES
        ('f3110001-0003-4003-8003-000000000001', v_tenant, v_client_sharma, v_proj_sharma, 'INV-2025-001', '2025-11-12', '2025-12-12',
         '[{"description":"Concept design stage – professional fees (milestone 1)","quantity":1,"unitPrice":425000,"amount":425000}]'::jsonb,
         '998321', 38250.00, 38250.00, 0, 501500.00, 'draft', '2025-11-12 14:30:00+05:30', '2025-11-12 14:30:00+05:30'),
        ('f3110001-0003-4003-8003-000000000002', v_tenant, v_client_mehta, NULL, 'INV-2025-002', '2025-12-03', '2026-01-02',
         '[{"description":"Preliminary architectural study – plotted development","quantity":1,"unitPrice":180000,"amount":180000}]'::jsonb,
         '998321', 16200.00, 16200.00, 0, 212400.00, 'sent', '2025-12-03 10:00:00+05:30', '2025-12-03 10:00:00+05:30'),
        ('f3110001-0003-4003-8003-000000000003', v_tenant, v_client_techpark, v_proj_techpark, 'INV-2025-003', '2025-10-20', '2025-11-19',
         '[{"description":"Interior design DD phase – professional fees","quantity":1,"unitPrice":1000000,"amount":1000000}]'::jsonb,
         '998321', 0, 0, 180000.00, 1180000.00, 'paid', '2025-10-20 09:15:00+05:30', '2025-10-25 16:00:00+05:30'),
        ('f3110001-0003-4003-8003-000000000004', v_tenant, v_client_sharma, v_proj_sharma, 'INV-2025-004', '2026-01-08', '2026-02-07',
         '[{"description":"Schematic design & elevation package","quantity":1,"unitPrice":500000,"amount":500000}]'::jsonb,
         '998321', 45000.00, 45000.00, 0, 590000.00, 'partial', '2026-01-08 11:00:00+05:30', '2026-01-20 09:00:00+05:30'),
        ('f3110001-0003-4003-8003-000000000005', v_tenant, v_client_techpark, v_proj_techpark, 'INV-2025-005', '2025-09-05', '2025-10-05',
         '[{"description":"Space planning & test-fit (Phase 1)","quantity":1,"unitPrice":320000,"amount":320000}]'::jsonb,
         '998321', 0, 0, 57600.00, 377600.00, 'sent', '2025-09-05 12:00:00+05:30', '2025-09-05 12:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO payments (id, tenant_id, invoice_id, amount, date, mode, reference, notes, created_at, updated_at)
    VALUES
        ('f3220002-0004-4004-8004-000000000001', v_tenant, 'f3110001-0003-4003-8003-000000000003', 1180000.00, '2025-11-18', 'bank_transfer', 'NEFT HDFC-TPO-78432', 'Full settlement – TechPark DD phase', '2025-11-18 11:20:00+05:30', '2025-11-18 11:20:00+05:30'),
        ('f3220002-0004-4004-8004-000000000002', v_tenant, 'f3110001-0003-4003-8003-000000000004', 250000.00, '2026-01-15', 'upi', 'UPI arqops@okhdfcbank', 'Advance against schematic', '2026-01-15 18:05:00+05:30', '2026-01-15 18:05:00+05:30'),
        ('f3220002-0004-4004-8004-000000000003', v_tenant, 'f3110001-0003-4003-8003-000000000004', 100000.00, '2026-01-22', 'cheque', 'CHQ 884521 Axis Bank', 'Second tranche – partial', '2026-01-22 14:00:00+05:30', '2026-01-22 14:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO vendor_bills (id, tenant_id, vendor_id, work_order_id, bill_number, amount, gst_amount, tds_section, tds_rate, tds_amount, due_date, status, paid_at, created_at, updated_at)
    VALUES
        ('f3330003-0005-4005-8005-000000000001', v_tenant, v_vendor_struct, NULL, 'VB-2025-104', 385000.00, 69300.00, '194J', 10.00, 38500.00, '2026-02-28', 'pending', NULL, '2026-01-10 10:00:00+05:30', '2026-01-10 10:00:00+05:30'),
        ('f3330003-0005-4005-8005-000000000002', v_tenant, v_vendor_mep, NULL, 'VB-2025-088', 520000.00, 93600.00, '194C', 2.00, 10400.00, '2025-12-15', 'approved', NULL, '2025-11-20 15:30:00+05:30', '2025-12-01 09:00:00+05:30'),
        ('f3330003-0005-4005-8005-000000000003', v_tenant, v_vendor_print, NULL, 'VB-2025-156', 28500.00, 5130.00, '194C', 1.00, 285.00, '2025-11-30', 'paid', '2025-11-28 12:00:00+05:30', '2025-11-18 11:00:00+05:30', '2025-11-28 12:00:00+05:30'),
        ('f3330003-0005-4005-8005-000000000004', v_tenant, v_vendor_civil, NULL, 'VB-2026-012', 175000.00, 31500.00, '194C', 2.00, 3500.00, '2026-03-10', 'pending', NULL, '2026-02-01 08:30:00+05:30', '2026-02-01 08:30:00+05:30'),
        ('f3330003-0005-4005-8005-000000000005', v_tenant, v_vendor_mep, NULL, 'VB-2025-091', 148000.00, 26640.00, '194C', 2.00, 2960.00, '2025-12-20', 'paid', '2025-12-19 17:00:00+05:30', '2025-11-25 10:00:00+05:30', '2025-12-19 17:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO expenses (id, tenant_id, project_id, category, amount, date, description, receipt_storage_key, created_by, created_at, updated_at)
    VALUES
        ('f3440004-0006-4006-8006-000000000001', v_tenant, v_proj_sharma, 'Site Visits', 4200.00, '2025-10-14', 'Bangalore site visit – cab + toll (Indiranagar)', NULL, v_admin, '2025-10-14 19:00:00+05:30', '2025-10-14 19:00:00+05:30'),
        ('f3440004-0006-4006-8006-000000000002', v_tenant, v_proj_techpark, 'Materials', 18650.00, '2025-11-02', 'Sample boards & material library tiles for client selection', NULL, v_admin, '2025-11-02 16:20:00+05:30', '2025-11-02 16:20:00+05:30'),
        ('f3440004-0006-4006-8006-000000000003', v_tenant, NULL, 'Printing', 12480.00, '2025-12-08', 'A0 working drawing set – 12 sheets, rush plotting', NULL, v_admin, '2025-12-08 11:45:00+05:30', '2025-12-08 11:45:00+05:30'),
        ('f3440004-0006-4006-8006-000000000004', v_tenant, v_proj_sharma, 'Consultancy', 35000.00, '2026-01-18', 'External vastu consultant review fee (reimbursable to project)', NULL, v_admin, '2026-01-18 10:10:00+05:30', '2026-01-18 10:10:00+05:30'),
        ('f3440004-0006-4006-8006-000000000005', v_tenant, v_proj_techpark, 'Travel', 28500.00, '2025-09-22', 'Mumbai client workshop – flight + hotel (1 night)', NULL, v_admin, '2025-09-22 22:00:00+05:30', '2025-09-22 22:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;
END $$;
