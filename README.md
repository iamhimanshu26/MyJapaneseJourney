# My Japanese Journey — Japanese Learning Platform

Multi-user, AI-enhanced Japanese learning platform (N5 → N1). Vocabulary, grammar, reading, listening — with interactive practice and the **"Heard New Vocab"** lookup feature.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Features

- **Dashboard** — Overview, quick access to modules
- **Heard New Vocab — Find Here** — Search any word or grammar; get meaning, examples, JLPT level; save to My Discovered
- **Vocabulary** — Flashcards & quizzes by level (N5–N1)
- **Grammar** — Patterns & AI explanations
- **My Discovered** — Words you looked up, grouped by level

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4
- React Router
- Framer Motion

## Project Structure

```
src/
├── components/     # Reusable UI (HeardNewVocabCta, etc.)
├── layouts/        # MainLayout with nav
├── pages/          # Dashboard, Vocab, Grammar, Lookup, MyDiscovered
└── App.jsx         # Routes
```

## Next Steps

1. **API** — `/api/lookup` for vocab/grammar search (DB + Gemini)
2. **Auth** — Supabase or Firebase for multi-user
3. **Content** — Import JLPT vocab lists, grammar from free resources
4. **Save flow** — Connect "Save to My Discovered" to backend

See `docs/PLAN.md` for the full planning document.
