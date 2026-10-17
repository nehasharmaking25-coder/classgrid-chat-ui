# Plan: Replace Supabase Auth with a custom users table

## Goal
Stop using Supabase's built-in Auth (rate limits, email confirmation) and switch to our own `users` table with hashed passwords and our own JWT sessions.

## Decisions
- Password hashing: **bcryptjs** (pure JS, works on Vercel serverless).
- Sessions: **JWT** signed with a server-side `JWT_SECRET`, stored in the browser's localStorage.
- Data stays in Supabase Postgres (conversations, messages); only Auth changes.

## Steps
1. Database migration `supabase/migrations/002_custom_auth.sql`
   - Create `public.app_users` (id UUID PK, name, email UNIQUE, password, created_at)
   - Repoint `conversations.user_id` FK from `auth.users` to `public.app_users`
   - Drop old `auth.uid()` RLS policies (RLS stays on; service role still works)

2. Backend auth
   - `api/lib/auth.mjs` — bcrypt hash/compare, JWT sign/verify, shared Supabase client
   - `api/auth/signup.mjs`, `api/auth/login.mjs`, `api/auth/me.mjs`
   - Update `api/conversations.mjs` + `api/messages.mjs` to verify our JWT

3. Frontend
   - New `app/src/lib/auth.js` (signup/login/logout/me + localStorage token)
   - Update `App.jsx` (AuthForm with name field, session restore, logout)
   - Remove `@supabase/supabase-js` from the frontend

4. Config
   - Root `package.json`: add `bcryptjs`, `jsonwebtoken`
   - Vercel env: add `JWT_SECRET`; remove `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

5. Deploy & verify
   - Run the migration in Supabase → SQL Editor
   - Push to GitHub, redeploy on Vercel
   - Test signup → login → chat saving