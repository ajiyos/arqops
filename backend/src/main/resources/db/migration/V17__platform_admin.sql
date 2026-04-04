CREATE TABLE platform_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ
);

CREATE TABLE platform_refresh_tokens (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token              VARCHAR(500) NOT NULL UNIQUE,
    platform_user_id   UUID         NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
    expires_at         TIMESTAMPTZ  NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    revoked            BOOLEAN      DEFAULT false
);

-- Seed default platform admin (password: admin123 / bcrypt cost 12)
INSERT INTO platform_users (id, email, password_hash, name, status)
VALUES (
    'f0000001-0000-4000-8000-000000000001',
    'platform@arqops.local',
    '$2a$12$LJ3m4ys3uz2YHheGhBMYUOR5F6m7GNW7bm8LPgg3GNKjG4RzGniDi',
    'Platform Administrator',
    'active'
);
