-- supabase/schema_v2.sql
-- Phase 2: AIコーチングチャット履歴
CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL
);

-- Phase 4: タイムカプセル
CREATE TABLE IF NOT EXISTS time_capsules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  open_at    TIMESTAMPTZ NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  is_opened  BOOLEAN NOT NULL DEFAULT FALSE
);

-- Phase 5: 外部知識ソース
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type       TEXT NOT NULL CHECK (type IN ('url', 'pdf')),
  source     TEXT NOT NULL,
  title      TEXT,
  content    TEXT NOT NULL
);

-- entries テーブルに時刻カラム追加（メンタルトリガー用）
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS hour_of_day INTEGER,
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- 既存データをバックフィル
UPDATE entries
SET
  hour_of_day = EXTRACT(HOUR FROM created_at),
  day_of_week = EXTRACT(DOW FROM created_at);
