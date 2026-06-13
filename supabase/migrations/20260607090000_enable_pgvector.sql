-- Migration: enable pgvector extension
-- Rollback: DROP EXTENSION IF EXISTS vector;

CREATE EXTENSION IF NOT EXISTS vector;
