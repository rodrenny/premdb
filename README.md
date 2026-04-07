# PreMDB

PreMDB is a web game where users predict the eventual IMDb rating of unreleased movies.

## Rules
- One prediction per user per movie.
- Predictions lock at `prediction_locks_at`.
- Settlement is manual admin action once a movie qualifies.
- Settlement rule: first daily IMDb snapshot on/after day 14 with >=5000 votes.

## Stack
Next.js App Router, TypeScript, Tailwind, Supabase Postgres/Auth/SSR, Zod, Vitest.

## Setup
```bash
cp .env.local.example .env.local
npm install
npm run dev
```

## Supabase
1. Create Supabase project.
2. Apply migration `supabase/migrations/001_initial.sql`.
3. Generate types:
```bash
supabase gen types typescript --project-id <id> --schema public > types/supabase.ts
```
4. Seed:
```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

## Auth
Magic link only. Login redirects through `/auth/callback` then `/dashboard`.

## Settlement implementation choice
Uses a Postgres RPC `settle_movie` for idempotent, auditable settlement and score event creation.

## Cron
```bash
curl -X POST http://localhost:3000/api/cron/check-movie-lifecycle -H "Authorization: Bearer $CRON_SECRET"
```

## Tests
```bash
npm test
```

## Future roadmap
- Automated IMDb ingestion
- Seasons/rounds
- Private leagues
- Fully derived scoring without `score_events`
