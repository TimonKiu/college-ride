-- Run in Supabase SQL Editor once (or use CLI migrate). Enables shared carpool listings.

create table if not exists public.published_rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references auth.users (id) on delete cascade,
  driver_name text not null,
  school text,
  from_label text not null,
  to_label text not null,
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision,
  depart_time text not null default '',
  seats int not null default 2 check (seats >= 1 and seats <= 8),
  price numeric not null default 8.5,
  detour text not null default '+10 min',
  rating numeric not null default 5,
  created_at timestamptz not null default now()
);

create index if not exists published_rides_created_at_idx on public.published_rides (created_at desc);

alter table public.published_rides enable row level security;

drop policy if exists "published_rides_select_authenticated" on public.published_rides;
create policy "published_rides_select_authenticated"
  on public.published_rides for select
  to authenticated
  using (true);

drop policy if exists "published_rides_insert_own" on public.published_rides;
create policy "published_rides_insert_own"
  on public.published_rides for insert
  to authenticated
  with check (auth.uid() = driver_id);

drop policy if exists "published_rides_update_own" on public.published_rides;
create policy "published_rides_update_own"
  on public.published_rides for update
  to authenticated
  using (auth.uid() = driver_id)
  with check (auth.uid() = driver_id);

drop policy if exists "published_rides_delete_own" on public.published_rides;
create policy "published_rides_delete_own"
  on public.published_rides for delete
  to authenticated
  using (auth.uid() = driver_id);
