-- PostgreSQL initialization script
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create database (if it doesn't exist - handled by POSTGRES_DB env var)
-- The database is created automatically by the postgres image using POSTGRES_DB

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'TechMart database initialized successfully!';
END $$;
