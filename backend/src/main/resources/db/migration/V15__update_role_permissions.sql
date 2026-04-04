-- Align all role permissions to the standardized 19-permission RBAC scheme

-- TENANT_ADMIN: all permissions
UPDATE roles SET permissions_json = '["crm.read","crm.write","crm.delete","vendor.read","vendor.write","vendor.delete","vendor.approve","project.read","project.write","project.delete","finance.read","finance.write","finance.delete","hr.read","hr.write","hr.delete","hr.approve","report.read"]'
WHERE name = 'TENANT_ADMIN';

-- PROJECT_LEAD: full project + CRM read/write, vendor read/write/approve, finance read, HR read, reports
UPDATE roles SET permissions_json = '["crm.read","crm.write","vendor.read","vendor.write","vendor.approve","project.read","project.write","project.delete","finance.read","hr.read","report.read"]'
WHERE name = 'PROJECT_LEAD';

-- FINANCE_MANAGER: full finance, vendor read/write/approve, read access to CRM/project/HR, reports
UPDATE roles SET permissions_json = '["crm.read","vendor.read","vendor.write","vendor.approve","project.read","finance.read","finance.write","finance.delete","hr.read","report.read"]'
WHERE name = 'FINANCE_MANAGER';

-- HR_ADMIN: full HR + approve, read access to CRM/project, reports
UPDATE roles SET permissions_json = '["crm.read","project.read","hr.read","hr.write","hr.delete","hr.approve","report.read"]'
WHERE name = 'HR_ADMIN';

-- STAFF: read/write on CRM + project, read on vendor/finance, read/write HR (own), reports
UPDATE roles SET permissions_json = '["crm.read","crm.write","vendor.read","project.read","project.write","finance.read","hr.read","hr.write","report.read"]'
WHERE name = 'STAFF';

-- VIEWER: read-only everywhere
INSERT INTO roles (id, tenant_id, name, is_system_role, permissions_json)
SELECT gen_random_uuid(), tenant_id, 'VIEWER', true,
       '["crm.read","vendor.read","project.read","finance.read","hr.read","report.read"]'
FROM (SELECT DISTINCT tenant_id FROM roles) t
WHERE NOT EXISTS (
    SELECT 1 FROM roles r2 WHERE r2.tenant_id = t.tenant_id AND r2.name = 'VIEWER' AND r2.deleted_at IS NULL
);
