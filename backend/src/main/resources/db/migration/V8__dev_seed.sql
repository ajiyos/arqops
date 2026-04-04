-- Development seed data
-- Only run in dev via Flyway; production will not have this file

INSERT INTO tenants (id, name, subdomain_slug, plan, status)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Demo Architecture Firm', 'demo', 'starter', 'active')
ON CONFLICT (subdomain_slug) DO NOTHING;

-- Password: admin123 (bcrypt hash)
INSERT INTO roles (id, tenant_id, name, is_system_role, permissions_json)
VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TENANT_ADMIN', true, '["*"]'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'STAFF', true, '["project.task.update","hr.leave.apply"]')
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO users (id, tenant_id, name, email, password_hash, status)
VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'Admin User', 'admin@demo.arqops.com',
        '$2a$12$LJ3m4ys3uz2YTMcMVlWKb.hRfIS4x3mIYWMEkMJxnBoJgm3FRXB3K', 'active')
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
VALUES ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
ON CONFLICT DO NOTHING;
