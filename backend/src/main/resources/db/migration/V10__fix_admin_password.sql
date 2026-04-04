-- Fix admin seed password hash (bcrypt hash for 'admin123')
UPDATE users
SET password_hash = '$2b$12$749qObkGJBfan9HZHK8UX.RMDlAWVnWFwfbpkLprV98vuIsh8mDtm'
WHERE email = 'admin@demo.arqops.com'
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
