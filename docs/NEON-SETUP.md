# Neon Setup

1. Create a Neon project and copy the connection string.
2. Add env var in Vercel / local environment:

```bash
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
```

3. Run the schema script from `docs/neon-schema.sql` (or rely on auto-bootstrap on first server call).
4. Keep `DATABASE_URL` server-side only (never in frontend `VITE_` vars).

## Neon Architecture Notes

- `server/lib/db.js` auto-creates required tables (auth, discovered, reviews, analytics, timeline, study plans, knowledge graph).
- All DB access runs server-side through Vercel API routes only.
- `localStorage` is legacy import/guest cache only and not primary persistence.

## API routes powered by Neon

- `GET/POST/PATCH/DELETE /api/discovered-items` (`id` via query/body for PATCH/DELETE)
- `GET /api/discovered-items?mode=export&format=csv|json`
- `GET /api/discovered-items?mode=clusters`
- `POST /api/ai-lookup`
- `POST /api/analyze-dokkai`
- `POST /api/interview-coach`
- `GET /api/analytics`
- `GET /api/intelligence` (learning intelligence + dashboard payload)
- `GET /api/intelligence?view=plan` (learning plan)
- `GET /api/intelligence?view=timeline` (learning timeline)
- `GET /api/intelligence?view=knowledge-graph` (graph data)
- `POST /api/intelligence` (`copilot`, `plan-complete`, `knowledge-relation`, `demo-reset`)
- `POST /api/review-session`
- `POST /api/auth` (login or logout with `action: \"logout\"`)
- `GET /api/auth` (current session)
- `PATCH /api/auth` (profile/target/theme/language update)
