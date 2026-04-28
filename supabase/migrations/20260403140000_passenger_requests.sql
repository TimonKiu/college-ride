-- 乘客发布的乘车请求（司机端「找乘客」列表）
-- 在 Supabase SQL Editor 中执行（若尚未执行）

create table if not exists public.passenger_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users (id) on delete cascade,
  rider_name text,
  school text,
  from_label text not null,
  to_label text not null,
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision,
  time_pref text not null default '',
  detour text not null default '+15 min',
  earn_display text not null default '+$10.00',
  created_at timestamptz not null default now()
);

create index if not exists passenger_requests_created_at_idx on public.passenger_requests (created_at desc);

alter table public.passenger_requests enable row level security;

drop policy if exists "passenger_requests_select_auth" on public.passenger_requests;
create policy "passenger_requests_select_auth"
  on public.passenger_requests for select
  to authenticated
  using (true);

drop policy if exists "passenger_requests_insert_own" on public.passenger_requests;
create policy "passenger_requests_insert_own"
  on public.passenger_requests for insert
  to authenticated
  with check (auth.uid() = rider_id);
