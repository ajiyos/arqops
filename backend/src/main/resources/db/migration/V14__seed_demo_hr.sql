-- HR demo seed: employees, leave types, leave requests, attendance, reimbursements
-- Demo tenant / admin match V8/V13: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11 / c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

DO $$
DECLARE
    v_tenant   UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_admin    UUID := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    v_emp1     UUID := 'a4010001-0010-4010-a010-000000000001';
    v_emp2     UUID := 'a4010001-0010-4010-a010-000000000002';
    v_emp3     UUID := 'a4010001-0010-4010-a010-000000000003';
    v_emp4     UUID := 'a4010001-0010-4010-a010-000000000004';
    v_emp5     UUID := 'a4010001-0010-4010-a010-000000000005';

    v_lt_casual UUID := 'a4020002-0020-4020-a020-000000000001';
    v_lt_sick   UUID := 'a4020002-0020-4020-a020-000000000002';
    v_lt_earned UUID := 'a4020002-0020-4020-a020-000000000003';
    v_lt_comp   UUID := 'a4020002-0020-4020-a020-000000000004';
BEGIN
    INSERT INTO employees (id, tenant_id, user_id, employee_code, name, designation, department, date_of_joining, reporting_manager_id, salary_structure_json, phone, personal_email, status, created_at, updated_at)
    VALUES
        (v_emp1, v_tenant, v_admin, 'ARC-001', 'Rajesh Krishnamurthy', 'Senior Architect', 'Design', '2019-04-01', NULL, NULL, '+91 98450 11223', 'rajesh.krishnamurthy@personal.example.in', 'active', '2019-04-01 10:00:00+05:30', '2019-04-01 10:00:00+05:30'),
        (v_emp2, v_tenant, NULL, 'ARC-002', 'Priya Nair', 'Junior Architect', 'Design', '2022-07-18', v_emp1, NULL, '+91 98860 33445', 'priya.nair@personal.example.in', 'active', '2022-07-18 10:00:00+05:30', '2025-01-10 12:00:00+05:30'),
        (v_emp3, v_tenant, NULL, 'ARC-003', 'Ananya Deshpande', 'Interior Designer', 'Interiors', '2021-02-08', v_emp1, NULL, '+91 99001 55667', 'ananya.deshpande@personal.example.in', 'active', '2021-02-08 10:00:00+05:30', '2025-03-01 09:00:00+05:30'),
        (v_emp4, v_tenant, NULL, 'ARC-004', 'Vikram Singh', 'Site Engineer', 'Engineering', '2020-11-02', v_emp1, NULL, '+91 97312 77889', 'vikram.singh@personal.example.in', 'active', '2020-11-02 10:00:00+05:30', '2025-02-15 11:00:00+05:30'),
        (v_emp5, v_tenant, NULL, 'ARC-005', 'Kavitha Rao', 'Office Manager', 'Admin', '2018-09-10', NULL, NULL, '+91 98441 99001', 'kavitha.rao@personal.example.in', 'active', '2018-09-10 10:00:00+05:30', '2025-01-20 14:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_types (id, tenant_id, name, annual_quota, carry_forward_limit, created_at, updated_at)
    VALUES
        (v_lt_casual, v_tenant, 'Casual Leave', 12, 3, '2019-01-01 09:00:00+05:30', '2019-01-01 09:00:00+05:30'),
        (v_lt_sick, v_tenant, 'Sick Leave', 12, 0, '2019-01-01 09:00:00+05:30', '2019-01-01 09:00:00+05:30'),
        (v_lt_earned, v_tenant, 'Earned Leave', 15, 15, '2019-01-01 09:00:00+05:30', '2019-01-01 09:00:00+05:30'),
        (v_lt_comp, v_tenant, 'Comp Off', 0, 0, '2019-01-01 09:00:00+05:30', '2019-01-01 09:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO leave_requests (id, tenant_id, employee_id, leave_type_id, start_date, end_date, days, reason, status, approved_by, created_at, updated_at)
    VALUES
        ('a4030003-0030-4030-a030-000000000001', v_tenant, v_emp2, v_lt_casual, '2026-02-10', '2026-02-11', 2.0, 'Family function in Kochi', 'pending', NULL, '2026-01-28 11:20:00+05:30', '2026-01-28 11:20:00+05:30'),
        ('a4030003-0030-4030-a030-000000000002', v_tenant, v_emp1, v_lt_earned, '2025-12-24', '2025-12-27', 3.0, 'Year-end break with family', 'approved', v_admin, '2025-12-01 09:00:00+05:30', '2025-12-02 14:30:00+05:30'),
        ('a4030003-0030-4030-a030-000000000003', v_tenant, v_emp3, v_lt_sick, '2025-11-05', '2025-11-06', 2.0, 'Viral fever – medical certificate attached', 'rejected', NULL, '2025-11-04 08:45:00+05:30', '2025-11-04 16:00:00+05:30'),
        ('a4030003-0030-4030-a030-000000000004', v_tenant, v_emp4, v_lt_comp, '2026-01-15', '2026-01-15', 1.0, 'Comp off for 4 Jan site supervision (Sunday)', 'approved', v_admin, '2026-01-12 10:15:00+05:30', '2026-01-13 09:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO attendance (id, tenant_id, employee_id, date, status, check_in_time, check_out_time, notes, created_at, updated_at)
    VALUES
        ('a4040004-0040-4040-a040-000000000001', v_tenant, v_emp1, '2025-03-24', 'PRESENT', '09:30:00', '18:45:00', NULL, '2025-03-24 18:50:00+05:30', '2025-03-24 18:50:00+05:30'),
        ('a4040004-0040-4040-a040-000000000002', v_tenant, v_emp2, '2025-03-24', 'ABSENT', NULL, NULL, 'No intimation', '2025-03-24 19:00:00+05:30', '2025-03-24 19:00:00+05:30'),
        ('a4040004-0040-4040-a040-000000000003', v_tenant, v_emp3, '2025-03-24', 'HALF_DAY', '09:15:00', '13:30:00', 'Half day – client workshop PM', '2025-03-24 13:35:00+05:30', '2025-03-24 13:35:00+05:30'),
        ('a4040004-0040-4040-a040-000000000004', v_tenant, v_emp4, '2025-03-24', 'PRESENT', '08:45:00', '19:00:00', 'Site handover meeting', '2025-03-24 19:05:00+05:30', '2025-03-24 19:05:00+05:30'),
        ('a4040004-0040-4040-a040-000000000005', v_tenant, v_emp5, '2025-03-24', 'ABSENT', NULL, NULL, 'Sick – message on team group', '2025-03-24 09:30:00+05:30', '2025-03-24 09:30:00+05:30')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO reimbursements (id, tenant_id, employee_id, category, amount, description, receipt_storage_key, status, approved_by, created_at, updated_at)
    VALUES
        ('a4050005-0050-4050-a050-000000000001', v_tenant, v_emp2, 'Travel', 12850.00, 'BLR–MYS round trip for statutory site inspection (KSRTC + local auto)', NULL, 'pending', NULL, '2026-02-20 17:40:00+05:30', '2026-02-20 17:40:00+05:30'),
        ('a4050005-0050-4050-a050-000000000002', v_tenant, v_emp1, 'Client Meeting', 3420.00, 'Lunch with client stakeholders – Mehta project (2 pax, GST invoice)', NULL, 'approved', v_admin, '2025-12-11 12:10:00+05:30', '2025-12-12 10:00:00+05:30'),
        ('a4050005-0050-4050-a050-000000000003', v_tenant, v_emp4, 'Site Materials', 8765.50, 'Emergency shuttering consumables – Whitefield site (cash purchase, bill photo)', NULL, 'rejected', NULL, '2025-10-28 19:00:00+05:30', '2025-10-29 11:00:00+05:30'),
        ('a4050005-0050-4050-a050-000000000004', v_tenant, v_emp3, 'Training', 18500.00, 'IIID Bengaluru – lighting design workshop (registration + materials)', NULL, 'approved', v_admin, '2026-01-05 09:20:00+05:30', '2026-01-08 15:00:00+05:30')
    ON CONFLICT (id) DO NOTHING;
END $$;
