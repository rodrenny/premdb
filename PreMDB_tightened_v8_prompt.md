# PreMDB — tightened v8 build prompt (balanced, operator-safe v1)

You are acting as a senior full-stack engineer inside a brand-new greenfield repository.

Build a production-quality MVP for a web game called **PreMDB**, where users predict the eventual IMDb rating of unreleased movies.

---

## Stack — use exactly this

| Concern | Choice |
|---|---|
| Framework | Next.js latest stable, App Router |
| Language | TypeScript throughout |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase Postgres |
| Auth | Supabase Auth (magic link only) |
| Data access | Supabase JS client with `@supabase/ssr` |
| Type generation | `supabase gen types typescript` |
| Validation | Zod |
| Writes | Server actions + route handlers |
| Cron | One authenticated route handler for movie lifecycle transitions |
| Unit tests | Vitest for scoring + settlement logic |

---

## Why this version exists

This is the **tightened v8** version of the PreMDB spec.

It is intended to be the best balance between:
- MVP simplicity
- operator clarity
- settlement auditability
- low risk of agent confusion during implementation

It is **not** the absolute leanest possible build, because it keeps `score_events` as persisted settlement outputs.

It is also **not** the overbuilt version, because it removes:
- rounds
- seasons
- route groups
- blocking onboarding
- separate results page
- multiple admin subpages
- admin user-management UI
- lock cron
- automated IMDb ingestion for v1

Use this version if the goal is:
- clear separation between automation and manual operations
- auditable settlement outcomes
- flexible prediction lock timing
- simpler leaderboard queries
- a realistic MVP that is still tight in scope

---

## Critical architecture rules

- Use `@supabase/ssr` for all server-side Supabase access in server components, server actions, route handlers, and middleware.
- Use `@supabase/supabase-js` only in client components when needed.
- Do **not** use Prisma, Auth.js, or any third-party auth library.
- Do **not** use Supabase Realtime for MVP.
- Use Supabase Auth magic-link only.
- Enable Row Level Security on all tables.
- Write explicit RLS policies for `select`, `insert`, `update`, and `delete` where relevant.
- For insert policies, use `WITH CHECK`.
- Generate database types into `types/supabase.ts` and use them throughout the app.
- Keep the app flat and simple. Do **not** use route groups.
- Follow the official Supabase SSR pattern for Next.js App Router, including middleware-based session refresh.
- Keep cron limited to lifecycle/status updates only.
- Keep settlement as an explicit **admin action**.
- Use consistent Supabase env naming throughout:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

## Execution style

- Do not ask unnecessary questions.
- Make reasonable assumptions and state them briefly.
- Choose the simplest robust option at every tradeoff.
- Build a coherent MVP end to end, not a mockup.
- Avoid overengineering.
- End with exact setup, migration, seed, test, and run commands.

---

## Product concept

Users browse upcoming unreleased movies and predict their future IMDb rating.

A movie is the core unit of the game.

For v1:
- there are **no rounds**
- there are **no seasons**
- there is **no separate results page**
- there is **no blocking onboarding flow**
- users predict directly on movies
- the dashboard includes both active picks and settled results
- the leaderboard is global
- admin manually settles movies after checking IMDb

When a movie is settled, points are written to `score_events`, and the leaderboard updates.

---

## Core game rules

- One prediction per user per movie.
- Prediction format: one decimal place, e.g. `6.7`.
- Predictions are allowed only while `prediction_locks_at > now()`.
- Lock state is derived from `prediction_locks_at`, not from a separate lock cron.
- A movie settles only when **both** conditions are true:
  1. At least **14 days** have passed since the chosen release date.
  2. The movie has at least **5,000 IMDb votes**.
- The official result is the **first daily qualifying snapshot** on or after day 14.
- If a movie never reaches 5,000 votes within **60 days** after release, mark it `expired`.

Display this exact text in the UI wherever the settlement rule is shown:

> “This movie settles at the first daily IMDb snapshot taken on or after 14 days post-release where it has at least 5,000 votes.”

---

## Operational model

Make the automation boundary explicit:

### Cron is responsible only for:
- date-driven movie lifecycle transitions

### Admin is responsible for:
- verifying IMDb vote count
- entering settlement details manually
- finalizing settlement
- creating persisted score outputs

Do **not** blur these responsibilities.

For v1:
- cron never scrapes IMDb
- cron never auto-settles
- admin is the only actor that settles a movie

---

## Lifecycle model

Use these persisted movie statuses:

- `upcoming`
- `released_waiting_window`
- `awaiting_review`
- `settled`
- `expired`
- `canceled`

Notes:
- `locked` is **not** a persisted movie status.
- Locked state is derived from `prediction_locks_at`.
- `awaiting_review` means the movie is past the day-14 window and is waiting for an admin to review vote count and enter a settlement manually.
- Use `awaiting_review`, not `awaiting_threshold`, because the system is **not** automatically monitoring the IMDb threshold in v1.

---

## Data sources

**TMDb API** — source for all movie metadata:
- upcoming titles
- posters
- backdrops
- overview
- release dates
- trailers
- cast preview
- crew / director

Use `TMDB_READ_ACCESS_TOKEN` as a Bearer token for all TMDb requests.

**IMDb** — source of truth for settlement outcome:
- official rating
- vote count

For MVP:
- do **not** automate IMDb fetching
- do **not** scrape IMDb
- use **manual admin settlement entry**

Design the schema so automated IMDb ingestion can be added later without a breaking migration.

---

## Scoring formula

```ts
// lib/scoring/index.ts

export function calcPoints(prediction: number, actual: number): number {
  const diff = Math.abs(prediction - actual)
  return Math.max(0, Math.round(100 - diff * 20))
}

export function calcPointsWithBonus(prediction: number, actual: number): number {
  const base = calcPoints(prediction, actual)
  const bonus =
    Number(prediction.toFixed(1)) === Number(actual.toFixed(1)) ? 10 : 0
  return base + bonus
}
```

Examples, base only:
- off by `0.5` → `90`
- off by `1.0` → `80`
- off by `2.0` → `60`
- off by `5.0` → `0`

Keep all scoring logic in `lib/scoring/` and unit-test it with Vitest.

---

## Why `score_events` exists in v1

Keep `score_events` intentionally.

Reason:
- it makes settled outcomes auditable
- it freezes awarded points at settlement time
- it simplifies leaderboard queries
- it reduces repeated score recomputation in dashboard and leaderboard reads
- it gives you a stable historical output if scoring rules change later

This is a deliberate tradeoff:
- a little more write-side complexity
- in exchange for clearer settled state and simpler read models

---

## Image configuration

In `next.config.ts`, configure TMDb remote images:

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'image.tmdb.org' },
  ],
},
```

Use:
- `https://image.tmdb.org/t/p/w500{poster_path}` for cards
- `https://image.tmdb.org/t/p/w1280{backdrop_path}` for hero images

---

## Database schema

Create these in `supabase/migrations/001_initial.sql`.

This is the v1 schema.
Keep it to **four core product tables plus profiles**.

```sql
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movies (
  id uuid primary key default uuid_generate_v4(),
  tmdb_id int unique not null,
  imdb_id text,
  title text not null,
  original_title text,
  overview text,
  poster_path text,
  backdrop_path text,
  release_date date,
  release_date_source text default 'tmdb',
  prediction_locks_at timestamptz,
  runtime int,
  genres jsonb not null default '[]',
  director_name text,
  cast_preview jsonb not null default '[]',
  trailer_youtube_key text,
  status text not null default 'upcoming'
    check (status in (
      'upcoming',
      'released_waiting_window',
      'awaiting_review',
      'settled',
      'expired',
      'canceled'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.predictions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  predicted_value numeric(3,1) not null check (predicted_value between 1.0 and 10.0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, movie_id)
);

create table public.settlements (
  id uuid primary key default uuid_generate_v4(),
  movie_id uuid unique not null references public.movies(id) on delete cascade,
  official_rating numeric(3,1) not null,
  official_num_votes int not null,
  settlement_snapshot_date date not null,
  settled_at timestamptz not null default now(),
  release_date_used date not null,
  eligible_from_date date not null,
  settlement_rule_version text not null default 'v1',
  source_type text not null default 'manual'
    check (source_type in ('manual', 'dataset', 'api_import')),
  source_snapshot text,
  settlement_notes text
);

create table public.score_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  points int not null,
  prediction_value numeric(3,1) not null,
  official_value numeric(3,1) not null,
  movie_title_snapshot text,
  settlement_snapshot_date date,
  created_at timestamptz not null default now(),
  unique(user_id, movie_id)
);

alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.predictions enable row level security;
alter table public.settlements enable row level security;
alter table public.score_events enable row level security;

create policy "profiles public read"
  on public.profiles for select
  using (true);

create policy "profiles own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles own update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "movies public read"
  on public.movies for select
  using (true);

create policy "movies admin insert"
  on public.movies for insert
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "movies admin update"
  on public.movies for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "movies admin delete"
  on public.movies for delete
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "predictions own read"
  on public.predictions for select
  using (auth.uid() = user_id);

create policy "predictions own insert"
  on public.predictions for insert
  with check (auth.uid() = user_id);

create policy "predictions own update"
  on public.predictions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "predictions own delete"
  on public.predictions for delete
  using (auth.uid() = user_id);

create policy "predictions admin read"
  on public.predictions for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "settlements public read"
  on public.settlements for select
  using (true);

create policy "settlements admin insert"
  on public.settlements for insert
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "settlements admin update"
  on public.settlements for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "settlements admin delete"
  on public.settlements for delete
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "score_events own read"
  on public.score_events for select
  using (auth.uid() = user_id);

create policy "score_events admin insert"
  on public.score_events for insert
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "score_events admin update"
  on public.score_events for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "score_events admin delete"
  on public.score_events for delete
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Folder structure

Use this exact structure:

```txt
app/
  page.tsx
  login/
    page.tsx
  verify-request/
    page.tsx
  auth/
    callback/
      route.ts
  dashboard/
    page.tsx
  movies/
    page.tsx
    [id]/
      page.tsx
  leaderboard/
    page.tsx
  admin/
    page.tsx
  api/
    cron/
      check-movie-lifecycle/
        route.ts
    admin/
      tmdb-sync/
        route.ts

components/
  ui/
  layout/
  movies/
  predictions/
  leaderboard/
  admin/
  auth/
  dashboard/

lib/
  supabase/
    server.ts
    client.ts
    middleware.ts
  auth/
    admin.ts
  tmdb/
    client.ts
    sync.ts
  scoring/
    index.ts
  settlement/
    eligibility.ts
    service.ts
  leaderboard/
    service.ts
  validations/
    index.ts

types/
  supabase.ts
  index.ts

supabase/
  migrations/
    001_initial.sql
  seed.sql

tests/
  unit/
    scoring.test.ts
    eligibility.test.ts
  integration/
    predictions.test.ts
    settlement.test.ts

public/
middleware.ts
next.config.ts
tailwind.config.ts
tsconfig.json
.env.local.example
vercel.json
```

---

## Supabase SSR helpers

Use the official `@supabase/ssr` pattern with:
- browser client
- server client
- middleware-based session refresh

Use:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## Auth flow

Use Supabase Auth magic-link flow:

1. user enters email on `/login`
2. call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ${origin}/auth/callback } })`
3. redirect to `/verify-request`
4. user clicks email link and lands on `/auth/callback`
5. exchange code for session
6. redirect straight to `/dashboard`

Do **not** make onboarding blocking.

Username is optional at first sign-in.

If the user has no username, show a dismissible banner on the dashboard:
- “Set your username to appear on the leaderboard.”

The dashboard should include an inline profile form to set or update username.

---

## Admin authorization

Use either:
- `profiles.role = 'admin'`
- or email present in `ADMIN_EMAILS`

Create `lib/auth/admin.ts` with a `requireAdmin()` helper.

---

## Settlement implementation preference

Settlement needs to be as atomic and idempotent as practical.

Preferred approach:
- implement settlement as a Postgres function / RPC that:
  1. checks settlement does not already exist
  2. inserts into `settlements`
  3. updates `movies.status = 'settled'`
  4. inserts `score_events` for existing predictions
  5. safely avoids duplicates

If implementing this as a Postgres RPC is practical, prefer that route.

Fallback approach:
- implement settlement in server code with careful idempotency
- if partial failure is possible, provide a safe recompute / retry path in admin tooling

Make the implementation choice explicit in the code comments and README.

---

## Domain services

### `lib/scoring/index.ts`
Pure functions only. No DB access.

### `lib/settlement/eligibility.ts`
Pure function returning:
- `waiting_window`
- `awaiting_review`
- `ready_to_settle`
- `expired`

### `lib/settlement/service.ts`
Keep this explicit and auditable.

Responsibilities:
1. return early if settlement already exists
2. perform settlement write path
3. update movie status
4. create `score_events`
5. avoid duplicates

### `lib/leaderboard/service.ts`
Aggregate leaderboard server-side from:
- `profiles`
- `score_events`

Support:
- all-time
- monthly
- weekly

Use server-side queries, not a database view, for v1.

---

## Validation schemas

Use Zod and ISO string validators.

```ts
import { z } from 'zod'

export const emailSchema = z.object({
  email: z.email(),
})

export const usernameSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
})

export const predictionSchema = z.object({
  movieId: z.uuid(),
  value: z
    .number()
    .min(1)
    .max(10)
    .refine((v) => Math.round(v * 10) === v * 10, 'One decimal place only'),
})

export const settlementSchema = z.object({
  movieId: z.uuid(),
  officialRating: z.number().min(1).max(10),
  officialNumVotes: z.int().min(5000),
  settlementSnapshotDate: z.iso.date(),
  releaseDateUsed: z.iso.date(),
  settlementNotes: z.string().optional(),
})

export const movieAdminSchema = z.object({
  imdbId: z.string().optional(),
  releaseDate: z.iso.date().optional(),
  predictionLocksAt: z.iso.datetime().optional(),
  status: z
    .enum([
      'upcoming',
      'released_waiting_window',
      'awaiting_review',
      'settled',
      'expired',
      'canceled',
    ])
    .optional(),
})
```

---

## Cron endpoints

Use exactly **one** cron route for v1:

### `/api/cron/check-movie-lifecycle`

Verify:
`Authorization: Bearer ${CRON_SECRET}`

Return `401` otherwise.

Use `SUPABASE_SERVICE_ROLE_KEY` only on the server.

Responsibilities:
- inspect movies that are not settled, expired, or canceled
- update status based on current date and `release_date`
- move:
  - `upcoming` → `released_waiting_window` when release date is reached
  - `released_waiting_window` → `awaiting_review` when day 14 is reached
  - `awaiting_review` → `expired` when day 60 is reached and no settlement exists
- do **not** settle movies automatically
- do **not** lock movies via cron
- keep everything idempotent

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/check-movie-lifecycle", "schedule": "0 3 * * *" }
  ]
}
```

---

## TMDb sync

Use `TMDB_READ_ACCESS_TOKEN` bearer auth.

`lib/tmdb/sync.ts` flow:
1. fetch `/movie/upcoming` up to 3 pages
2. for each movie fetch:
   - `/movie/{id}`
   - `/movie/{id}/credits`
   - `/movie/{id}/videos`
3. extract:
   - `director_name`
   - top 5 cast for `cast_preview`
   - first YouTube trailer key
4. upsert into `movies` by `tmdb_id`
5. if `prediction_locks_at` is null, set a sensible default such as release date at `00:00 UTC`

---

## Seed data

Create `supabase/seed.sql` with:
- sample movies
- some open for predictions
- some already past lock
- one settled movie
- sample predictions
- sample score events

Do not rely on raw inserts into `auth.users` for normal setup.
For local dev, document creating test users via Supabase dashboard or CLI first.

---

## Core pages

### `/`
- cinematic hero
- game explanation
- settlement rule text
- CTA to log in
- featured upcoming movies
- leaderboard preview

### `/login`
- single email field
- submit magic link request
- redirect to `/verify-request`

### `/verify-request`
- “Check your email” page

### `/dashboard`
Protected.

Contains two tabs:
- **Active picks**
- **Settled results**

Also includes:
- total points
- optional username banner if username is missing
- inline username form

### `/movies`
- poster-first grid
- movie status badges
- release date and lock status

### `/movies/[id]`
- metadata
- cast preview
- trailer
- settlement rule box
- prediction form if allowed
- existing prediction if already made
- settlement result if available

### `/leaderboard`
- weekly / monthly / all-time

### `/admin`
Protected by `requireAdmin()`.

Single page with tabs:
- **Movies**
- **Sync**
- **Settlements**

Admin features:
- search and edit movies
- override `imdb_id`
- override `release_date`
- override `prediction_locks_at`
- trigger TMDb sync
- manual settlement form
- mark movie expired or canceled
- settlement retry / recompute action if using non-RPC fallback

Do **not** build a Users admin tab for v1.

---

## Status badges

Movie statuses:
- `upcoming` → Open
- derived from `prediction_locks_at` → Locked for predictions
- `released_waiting_window` → Awaiting day 14
- `awaiting_review` → Awaiting review
- `settled` → Settled
- `expired` → Expired
- `canceled` → Canceled

Make clear in the UI that “Locked” is derived from time, not a separate persisted status.

---

## UI requirements

- dark mode by default
- cinematic feel, like Letterboxd meets fantasy sports
- poster-heavy layout
- use `next/image`
- responsive and accessible
- inline validation errors
- loading states
- empty states
- strong visual hierarchy

---

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
TMDB_READ_ACCESS_TOKEN="..."
ADMIN_EMAILS="admin@premdb.com,you@yourdomain.com"
CRON_SECRET="generate-a-long-random-secret"
```

---

## Testing

### Unit tests
- `calcPoints`
- `calcPointsWithBonus`
- `checkEligibility`
- threshold boundary at `4999` vs `5000`
- day 14 and day 60 edge cases

### Integration tests
- magic-link request redirects to verify-request page
- prediction submission is stored
- duplicate prediction blocked
- predictions are rejected after `prediction_locks_at`
- manual settlement creates `score_events`
- repeated settlement call does not duplicate settlement rows or score rows
- leaderboard reflects settled scores
- inline username update works

---

## Implementation order

Work in exactly this order:

1. Scaffold Next.js App Router project with TypeScript, Tailwind, and shadcn/ui
2. Create Supabase project and apply `001_initial.sql`
3. Configure `@supabase/ssr` helpers and middleware
4. Generate `types/supabase.ts`
5. Add base dark layout and shared UI primitives
6. Build auth flow: `/login` → `/verify-request` → `/auth/callback`
7. Build landing page
8. Build movies list and movie detail page
9. Build prediction submission with server action + Zod
10. Build dashboard with tabs for active picks and settled results
11. Build leaderboard page
12. Build single-page admin UI with tabs
13. Implement TMDb sync + admin sync route
14. Implement settlement service + single lifecycle cron route
15. Add inline username form and profile update flow
16. Add Vitest unit tests
17. Add integration tests
18. Write README
19. Output exact commands to run locally

---

## README requirements

Include:
- project overview
- product rules
- stack summary
- local setup
- env vars
- Supabase project creation
- migration commands
- type generation command
- seed instructions
- TMDb token setup
- Supabase Auth magic-link notes
- manual settlement workflow
- cron endpoint docs with example curl commands
- test commands
- Vercel deployment notes
- settlement implementation choice:
  - Postgres RPC
  - or server-code fallback with retry path
- future roadmap:
  - automated IMDb ingestion
  - seasons / rounds
  - private leagues
  - fully derived scoring if you later remove `score_events`

---

## Definition of done

The app must:
- run locally with `npm run dev`
- use real Supabase Postgres
- have RLS enabled and working
- support real Supabase magic-link auth
- validate all writes with Zod
- support manual settlement that creates score events
- show correct leaderboard results
- feel like a real MVP, not a skeleton

If a tradeoff is needed, choose the simplest robust option and state it briefly in an inline comment.
