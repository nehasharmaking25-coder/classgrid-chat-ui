-- Custom auth: our own users table (named app_users so it never clashes
-- with any older "users" table that has an integer id).
-- Run this WHOLE file in Supabase -> SQL Editor (don't highlight a part of it).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Our own users table
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Remove old conversations (they belonged to the deleted Supabase Auth users)
DELETE FROM public.conversations
WHERE user_id NOT IN (SELECT id FROM public.app_users);

-- 3. Repoint conversations.user_id to public.app_users
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_user_id_fkey;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- 4. Drop old RLS policies that depended on auth.uid()
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;

-- 5. Keep RLS on; the service role key used by our API bypasses it.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 6. Refresh the API schema cache
NOTIFY pgrst, 'reload schema';
