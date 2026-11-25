-- CrowRules+ independent network schema
-- Apply in Supabase SQL Editor. Does not alter Tacoma Nights tables.
create extension if not exists pgcrypto;
create table if not exists public.cr_channels (
 id text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 slug text not null, name text not null, description text not null default '',
 kind text not null default 'other', enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,slug)
);
create table if not exists public.cr_playlists (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null references public.cr_channels(id) on delete cascade,
 name text not null, is_default boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.cr_playlist_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 playlist_id uuid not null references public.cr_playlists(id) on delete cascade,
 title text not null, media_url text not null, media_type text not null default 'episode',
 duration_seconds integer not null default 1800 check(duration_seconds > 0),
 position integer not null default 0, approved boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.cr_media_library (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text references public.cr_channels(id) on delete set null,
 title text not null, media_url text not null, media_type text not null default 'video',
 duration_seconds integer, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.cr_program_schedules (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null references public.cr_channels(id) on delete cascade,
 name text not null, timezone text not null default 'America/Los_Angeles',
 starts_at timestamptz not null, ends_at timestamptz not null,
 repeat_mode text not null default 'once', status text not null default 'draft',
 created_at timestamptz not null default now(), check(ends_at > starts_at)
);
create table if not exists public.cr_schedule_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 schedule_id uuid not null references public.cr_program_schedules(id) on delete cascade,
 channel_id text not null references public.cr_channels(id) on delete cascade,
 playlist_item_id uuid references public.cr_playlist_items(id) on delete set null,
 title text not null, media_url text, starts_at timestamptz not null, ends_at timestamptz not null,
 position integer not null default 0, item_type text not null default 'program',
 check(ends_at > starts_at)
);
create table if not exists public.cr_broadcast_outputs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null unique references public.cr_channels(id) on delete cascade,
 destination_type text not null default 'youtube_live', destination_label text not null default '',
 public_url text, worker_id text not null, enabled boolean not null default false,
 status text not null default 'unconfigured', last_heartbeat_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cr_automation_rules (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null references public.cr_channels(id) on delete cascade,
 rule_type text not null, enabled boolean not null default true, config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists cr_playlist_items_order_idx on public.cr_playlist_items(playlist_id,position);
create index if not exists cr_schedule_items_channel_time_idx on public.cr_schedule_items(channel_id,starts_at);
create index if not exists cr_program_schedules_channel_time_idx on public.cr_program_schedules(channel_id,starts_at);
create index if not exists cr_outputs_worker_idx on public.cr_broadcast_outputs(worker_id);
do $$ declare t text; begin
 foreach t in array array['cr_channels','cr_playlists','cr_playlist_items','cr_media_library','cr_program_schedules','cr_schedule_items','cr_broadcast_outputs','cr_automation_rules'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_owner_all',t);
  execute format('create policy %I on public.%I for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())',t||'_owner_all',t);
 end loop;
end $$;
