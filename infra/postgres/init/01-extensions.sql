-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";       -- emails case-insensitive
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- busca textual
