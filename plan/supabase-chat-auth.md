# Plan: Supabase Auth + Saved Chats

1. **Database schema**
   - Create `conversations` table (id, user_id, title, model, created_at, updated_at)
   - Create `messages` table (id, conversation_id, role, text, created_at)
   - Enable RLS so users only see their own data

2. **Vercel env variables**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (optional, for direct SQL)

3. **Serverless functions**
   - `api/conversations.mjs` — GET list, POST create, DELETE remove
   - `api/messages.mjs` — GET by conversation, POST save message
   - Update `api/chat.mjs` — keep AI call, optionally save reply

4. **Frontend**
   - Install `@supabase/supabase-js`
   - Create `app/src/supabaseClient.js`
   - Add auth UI (login / signup / logout) in sidebar
   - Load real conversations from Supabase
   - Save user messages and AI replies
   - Remove fake data

5. **Deploy**
   - Push to GitHub
   - Redeploy on Vercel
   - Verify login and chat saving works
