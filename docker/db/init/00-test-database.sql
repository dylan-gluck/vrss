-- ==============================================================================
-- Test Database Initialization Script
-- ==============================================================================
-- This script creates a dedicated test database and user for isolated testing.
-- It runs automatically when the PostgreSQL container starts for the first time.
--
-- Features:
-- - Creates 'vrss_test' database (if not exists)
-- - Creates 'test_user' with appropriate permissions
-- - Grants necessary privileges for Prisma migrations
-- - Idempotent (safe to run multiple times)
--
-- Note: This script runs in the 'postgres' database context before any
-- application databases are created.
-- ==============================================================================

-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE vrss_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vrss_test')\gexec

-- Create test user if it doesn't exist
DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'test_user') THEN
    CREATE USER test_user WITH PASSWORD 'test_pass';
  END IF;
END
$$;

-- Grant privileges on test database
GRANT ALL PRIVILEGES ON DATABASE vrss_test TO test_user;

-- Switch to test database and grant schema privileges
\c vrss_test

-- Grant privileges on public schema
GRANT ALL ON SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO test_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO test_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO test_user;

-- Enable required extensions for test database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log success
\echo '✅ Test database and user created successfully'
\echo '   Database: vrss_test'
\echo '   User: test_user'
\echo '   Password: test_pass'
