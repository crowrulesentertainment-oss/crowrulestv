-- CrowRules+ Profiles & Household Engine v1
-- Applied to Supabase project: cevylpnoexugwgygvtgu

create table if not exists public.crplus_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  profile_theme text not null default 'default',
  is_kids boolean not null default false,
  maturity_level integer not null default 18,
  autoplay boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crplus_profiles_maturity_check check (maturity_level between 0 and 21)
);

create index if not exists crplus_profiles_user_idx on public.crplus_profiles(user_id);
create unique index if not exists crplus_profiles_one_default_idx on public.crplus_profiles(user_id) where is_default = true;

alter table public.crplus_watch_history add column if not exists profile_id uuid references public.crplus_profiles(id) on delete cascade;
alter table public.crplus_my_list add column if not exists profile_id uuid references public.crplus_profiles(id) on delete cascade;

create index if not exists crplus_watch_history_profile_idx on public.crplus_watch_history(profile_id);
create index if not exists crplus_my_list_profile_idx on public.crplus_my_list(profile_id);

alter table public.crplus_profiles enable row level security;

drop policy if exists "CrowRules+ profiles are visible to owner" on public.crplus_profiles;
create policy "CrowRules+ profiles are visible to owner" on public.crplus_profiles for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "CrowRules+ profiles can be created by owner" on public.crplus_profiles;
create policy "CrowRules+ profiles can be created by owner" on public.crplus_profiles for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "CrowRules+ profiles can be updated by owner" on public.crplus_profiles;
create policy "CrowRules+ profiles can be updated by owner" on public.crplus_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "CrowRules+ profiles can be deleted by owner" on public.crplus_profiles;
create policy "CrowRules+ profiles can be deleted by owner" on public.crplus_profiles for delete to authenticated using ((select auth.uid()) = user_id);
