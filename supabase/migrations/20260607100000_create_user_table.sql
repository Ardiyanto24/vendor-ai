-- Migration: create user table, user_role type, RLS policies, and Auth trigger sync
-- Rollback: DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; DROP FUNCTION IF EXISTS public.handle_new_user; DROP TABLE IF EXISTS public."user"; DROP TYPE IF EXISTS user_role;

-- 1. Create user role enum
CREATE TYPE user_role AS ENUM ('staff', 'manager');

-- 2. Create user table
CREATE TABLE public."user" (
    id UUID PRIMARY KEY, -- matches auth.users.id
    nama TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 3. Enable RLS
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY select_own_user ON public."user"
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY update_own_user ON public."user"
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Trigger to automatically sync auth.users with public.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."user" (id, nama, email, role, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nama', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff'::user_role),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
