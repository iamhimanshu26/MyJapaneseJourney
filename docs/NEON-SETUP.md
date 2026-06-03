# Neon Setup

1. Create a Neon project and copy the connection string.
2. Add env var in Vercel / local environment:

```bash
DATABASE_URL=postgres://<user>:<password>@<host>/<db>?sslmode=require
```

3. Run the schema script from `docs/neon-schema.sql`.
4. Keep `DATABASE_URL` server-side only (never in frontend `VITE_` vars).

## API routes powered by Neon

- `GET/POST /api/discovered-items`
- `PATCH/DELETE /api/discovered-items/:id`
- `POST /api/ai-lookup`
- `POST /api/analyze-dokkai`
- `POST /api/interview-coach`
- `GET /api/analytics`
- `GET /api/learning-intelligence`
- `POST /api/review-session`
