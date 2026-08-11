-- Sergio cleaner-performance dashboard — schema + row-level security
-- Run this in the Supabase SQL editor after creating the project.

-- 1) profiles: mirrors auth.users, keeps the operator's email handy
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2) uploads: one row per CSV a customer uploads. The computed
--    {totals, cleaners} payload is stored as jsonb so the dashboard
--    can re-render it exactly, and we keep the owner's email on the row.
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  label text,
  filename text,
  period text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_id_idx on public.uploads(user_id);
create index if not exists uploads_created_at_idx on public.uploads(created_at desc);

-- 3) Row-level security: every operator only ever sees their own rows
alter table public.profiles enable row level security;
alter table public.uploads  enable row level security;

drop policy if exists "profiles are self-viewable" on public.profiles;
create policy "profiles are self-viewable" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles are self-insertable" on public.profiles;
create policy "profiles are self-insertable" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles are self-updatable" on public.profiles;
create policy "profiles are self-updatable" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "uploads are self-viewable" on public.uploads;
create policy "uploads are self-viewable" on public.uploads
  for select using (auth.uid() = user_id);
drop policy if exists "uploads are self-insertable" on public.uploads;
create policy "uploads are self-insertable" on public.uploads
  for insert with check (auth.uid() = user_id);
drop policy if exists "uploads are self-deletable" on public.uploads;
create policy "uploads are self-deletable" on public.uploads
  for delete using (auth.uid() = user_id);

-- 4) Auto-create a profile row (with email) whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5) feedback + beta requests: notes an operator leaves (right-click or the
--    "Give feedback" button) and "request beta access" clicks. Own-rows only.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  kind text not null default 'note',          -- 'note' | 'beta_request'
  context text,                               -- e.g. cleaner name or feature
  message text,
  upload_id uuid references public.uploads(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_id_idx on public.feedback(user_id);

alter table public.feedback enable row level security;
drop policy if exists "feedback self-insert" on public.feedback;
create policy "feedback self-insert" on public.feedback
  for insert with check (auth.uid() = user_id);
drop policy if exists "feedback self-select" on public.feedback;
create policy "feedback self-select" on public.feedback
  for select using (auth.uid() = user_id);

-- 6) subscribers: onboarding opt-in ("be the first to know of new Sergio
--    features"). Captured at the login screen, so anon inserts are allowed;
--    nobody can read the list back through the anon key.
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'onboarding',
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "subscribers anon insert" on public.subscribers;
create policy "subscribers anon insert" on public.subscribers
  for insert with check (true);
-- Signed-in users can see their own waitlist rows (so joined state persists).
drop policy if exists "subscribers self-select" on public.subscribers;
create policy "subscribers self-select" on public.subscribers
  for select using (auth.jwt() ->> 'email' = email);

-- 7) photo_settings: the operator's Showcase-app share link for the Photo
--    Management page. One row per user, own-row RLS.
create table if not exists public.photo_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  showcase_url text,
  updated_at timestamptz not null default now()
);
alter table public.photo_settings enable row level security;
drop policy if exists "photo_settings self-select" on public.photo_settings;
create policy "photo_settings self-select" on public.photo_settings
  for select using (auth.uid() = user_id);
drop policy if exists "photo_settings self-insert" on public.photo_settings;
create policy "photo_settings self-insert" on public.photo_settings
  for insert with check (auth.uid() = user_id);
drop policy if exists "photo_settings self-update" on public.photo_settings;
create policy "photo_settings self-update" on public.photo_settings
  for update using (auth.uid() = user_id);

-- 8) business_profiles: first-login onboarding answers (phone service +
--    booking software). One row per user, own-row RLS; portal pages redirect
--    to /onboarding until this row exists.
create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_service text,          -- quo_openphone | ghl_lcphone | twilio | other
  phone_service_other text,
  booking_software text,       -- bookingkoala | zenmaid | other
  booking_software_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.business_profiles enable row level security;
drop policy if exists "business_profiles self-select" on public.business_profiles;
create policy "business_profiles self-select" on public.business_profiles
  for select using (auth.uid() = user_id);
drop policy if exists "business_profiles self-insert" on public.business_profiles;
create policy "business_profiles self-insert" on public.business_profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "business_profiles self-update" on public.business_profiles;
create policy "business_profiles self-update" on public.business_profiles
  for update using (auth.uid() = user_id);
