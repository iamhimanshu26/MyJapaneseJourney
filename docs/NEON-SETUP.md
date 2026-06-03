# Neon Setup

1. Create a Neon project and copy the connection string.
2. Add env var in Vercel / local environment:

```bash
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
```

3. Run the schema script from `docs/neon-schema.sql`.
4. Keep `DATABASE_URL` server-side only (never in frontend `VITE_` vars).

## API routes powered by Neon

- `GET/POST/PATCH/DELETE /api/discovered-items` (`id` via query/body for PATCH/DELETE)
- `POST /api/ai-lookup`
- `POST /api/analyze-dokkai`
- `POST /api/interview-coach`
- `GET /api/analytics`
- `GET /api/intelligence` (learning intelligence)
- `GET /api/intelligence?view=plan` (learning plan)
- `POST /api/review-session`
- `POST /api/auth` (login or logout with `action: \"logout\"`)
- `GET /api/auth` (current session)
- `PATCH /api/auth` (profile update)
