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
  status text not null default 'upcoming' check (status in ('upcoming','released_waiting_window','awaiting_review','settled','expired','canceled')),
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
  source_type text not null default 'manual' check (source_type in ('manual', 'dataset', 'api_import')),
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

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "movies public read" on public.movies for select using (true);
create policy "movies admin insert" on public.movies for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "movies admin update" on public.movies for update using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "movies admin delete" on public.movies for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "predictions own read" on public.predictions for select using (auth.uid() = user_id);
create policy "predictions own insert" on public.predictions for insert with check (auth.uid() = user_id and now() < (select prediction_locks_at from public.movies where id = movie_id));
create policy "predictions own update" on public.predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "predictions own delete" on public.predictions for delete using (auth.uid() = user_id);
create policy "predictions admin read" on public.predictions for select using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "settlements public read" on public.settlements for select using (true);
create policy "settlements admin insert" on public.settlements for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "settlements admin update" on public.settlements for update using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "settlements admin delete" on public.settlements for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "score_events own read" on public.score_events for select using (auth.uid() = user_id);
create policy "score_events admin insert" on public.score_events for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "score_events admin update" on public.score_events for update using ((select role from public.profiles where id = auth.uid()) = 'admin') with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "score_events admin delete" on public.score_events for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.calc_points(pred numeric, actual numeric) returns int language sql immutable as $$
  select greatest(0, round(100 - abs(pred - actual) * 20)::int);
$$;

create or replace function public.settle_movie(
  p_movie_id uuid,
  p_official_rating numeric,
  p_official_num_votes int,
  p_settlement_snapshot_date date,
  p_release_date_used date,
  p_settlement_notes text default null
) returns jsonb language plpgsql security definer as $$
declare
  v_movie_title text;
begin
  if exists (select 1 from public.settlements where movie_id = p_movie_id) then
    return jsonb_build_object('status','already_settled');
  end if;

  select title into v_movie_title from public.movies where id = p_movie_id;

  insert into public.settlements (movie_id, official_rating, official_num_votes, settlement_snapshot_date, release_date_used, eligible_from_date, settlement_notes)
  values (p_movie_id, p_official_rating, p_official_num_votes, p_settlement_snapshot_date, p_release_date_used, p_release_date_used + 14, p_settlement_notes);

  update public.movies set status = 'settled', updated_at = now() where id = p_movie_id;

  insert into public.score_events (user_id, movie_id, points, prediction_value, official_value, movie_title_snapshot, settlement_snapshot_date)
  select p.user_id, p.movie_id, public.calc_points(p.predicted_value, p_official_rating), p.predicted_value, p_official_rating, v_movie_title, p_settlement_snapshot_date
  from public.predictions p
  where p.movie_id = p_movie_id
  on conflict (user_id, movie_id) do nothing;

  return jsonb_build_object('status','settled');
end;
$$;

create or replace function public.run_lifecycle_transition(p_today date) returns void language plpgsql security definer as $$
begin
  update public.movies
  set status = 'released_waiting_window', updated_at = now()
  where status = 'upcoming' and release_date is not null and release_date <= p_today;

  update public.movies
  set status = 'awaiting_review', updated_at = now()
  where status = 'released_waiting_window' and release_date is not null and release_date + 14 <= p_today;

  update public.movies m
  set status = 'expired', updated_at = now()
  where status = 'awaiting_review' and release_date is not null and release_date + 60 <= p_today
    and not exists (select 1 from public.settlements s where s.movie_id = m.id);
end;
$$;
