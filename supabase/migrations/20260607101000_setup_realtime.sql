-- Migration: setup supabase_realtime publication
-- Rollback: -- no-op as the publication might be used by other parts

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;
