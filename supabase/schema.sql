-- supabase/schema.sql
-- Run this in the Supabase SQL editor to create the entries table.

CREATE TABLE IF NOT EXISTS entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transcript    TEXT NOT NULL,
  fact_ratio    INTEGER NOT NULL CHECK (fact_ratio BETWEEN 0 AND 100),
  emotion_ratio INTEGER NOT NULL CHECK (emotion_ratio BETWEEN 0 AND 100),
  passive_ratio INTEGER NOT NULL CHECK (passive_ratio BETWEEN 0 AND 100),
  thinking_profile TEXT NOT NULL,
  ai_comment    TEXT NOT NULL
);
