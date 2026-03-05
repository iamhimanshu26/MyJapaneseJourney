# My Japanese Journey

A company-ready Japanese learning platform (JLPT N5–N1) with vocabulary flashcards, grammar explanations, and AI-powered word lookup.

## Features

- **Dashboard** – Overview, progress, quick links
- **Vocabulary** – Flashcards by JLPT level (N5, N4+)
- **Grammar** – Patterns and explanations (N5–N3)
- **Heard New Vocab** – AI lookup via Gemini: search any word/grammar, get meaning, examples, furigana
- **My Discovered** – Save looked-up words; syncs to Supabase when auth is configured
- **Auth** – Optional Supabase auth (Login, Signup, Onboarding) for team/company use
- **Responsive** – Mobile hamburger menu, accessible UI
- **Error handling** – Error boundary, toast notifications
- **API security** – Rate limiting (30 req/min per IP) on lookup

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4
- Framer Motion
- React Router
- Supabase (optional – auth + discovered items)
- Vercel (deployment + serverless API)

## Quick Start

```bash
git clone https://github.com/iamhimanshu26/MyJapaneseJourney.git
cd MyJapaneseJourney
npm install
cp .env.example .env
# Edit .env with GEMINI_API_KEY (required) and optionally Supabase
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for lookup (get from [AI Studio](https://aistudio.google.com)) |
| `VITE_SUPABASE_URL` | No | Supabase project URL – enables auth & cloud sync |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key |

**Without Supabase:** The app works fully. My Discovered uses localStorage.

**With Supabase:** Add URL + anon key. Run the migration (`supabase/migrations/001_initial.sql`) in Supabase SQL Editor. Sign up / log in to sync discovered items across devices.

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Add env vars: `GEMINI_API_KEY` (required), optionally `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Deploy – Vercel auto-builds from the repo

Or with CLI:

```bash
npx vercel --prod
```

## Project Structure

```
kotoba/
├── api/           # Vercel serverless (lookup)
├── src/
│   ├── components/
│   ├── context/   # Auth, Toast
│   ├── hooks/    # useDiscovered
│   ├── layouts/
│   ├── lib/      # supabase, discovered
│   ├── pages/
│   └── data/     # vocab, grammar seed
├── supabase/migrations/
└── vercel.json
```

## License

MIT
