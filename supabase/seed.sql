-- Create users in Supabase auth first, then map ids here.
insert into public.movies (tmdb_id, title, release_date, prediction_locks_at, status, genres)
values
  (1001, 'Skyline Protocol', now()::date + 10, (now()::date + 10)::text || 'T00:00:00Z', 'upcoming', '[]'),
  (1002, 'Neon Harbor', now()::date - 2, (now()::date - 3)::text || 'T00:00:00Z', 'released_waiting_window', '[]'),
  (1003, 'Fable Circuit', now()::date - 20, (now()::date - 21)::text || 'T00:00:00Z', 'settled', '[]');
