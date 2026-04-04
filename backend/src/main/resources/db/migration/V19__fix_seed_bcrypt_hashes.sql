-- Earlier seeds used bcrypt strings that do not verify for password "admin123" (V8 demo user, V17 platform user).
-- BCrypt hashes are stable across app restarts; only the stored string matters. Repair known seed accounts.
UPDATE users
SET password_hash = '$2b$12$749qObkGJBfan9HZHK8UX.RMDlAWVnWFwfbpkLprV98vuIsh8mDtm'
WHERE email = 'admin@demo.arqops.com'
  AND tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

UPDATE platform_users
SET password_hash = '$2b$12$749qObkGJBfan9HZHK8UX.RMDlAWVnWFwfbpkLprV98vuIsh8mDtm'
WHERE email = 'platform@arqops.local';
