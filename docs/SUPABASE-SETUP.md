# Supabase Setup

1. Create a project at [supabase.com](https://supabase.com/dashboard).

2. Get your URL and anon key from **Settings → API**.

3. Add environment variables (local `.env` and Vercel):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon/public key

4. Run the migration: In Supabase dashboard → **SQL Editor**, paste and run the contents of `supabase/migrations/001_initial.sql`.

5. Enable Email auth: **Authentication → Providers → Email** (usually on by default).

6. Optional: Disable email confirmation for faster testing: **Authentication → Providers → Email** → turn off "Confirm email".
