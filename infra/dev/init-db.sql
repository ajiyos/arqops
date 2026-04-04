-- Development database initialization
-- Extensions required by the application
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Row-Level Security will be managed by Flyway migrations in the backend.
-- This file only ensures required extensions are available.
