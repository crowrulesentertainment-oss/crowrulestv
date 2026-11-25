-- CrowRules+ Playout Control Center migration
-- Additive only. Does not modify Tacoma Nights tables.
create table if not exists public.cr_playout_commands (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 channel_id text not null references public.cr_channels(id) on delete cascade,
 command text not null check (command in ('start','stop','restart','director_override','clear_override','set_standby')),
 payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
 requested_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 processed_at timestamptz,
 error text
);
alter table public.cr_channels add column if not exists standby_media_url text;
alter table public.cr_broadcast_outputs add column if not exists current_program text;
alter table public.cr_broadcast_outputs add column if not exists next_program text;
alter table public.cr_broadcast_outputs add column if not exists encoder_connected boolean not null default false;
alter table public.cr_broadcast_outputs add column if not exists encoder_pid integer;
alter table public.cr_broadcast_outputs add column if not exists director_override boolean not null default false;
alter table public.cr_broadcast_outputs add column if not exists standby_media_url text;
alter table public.cr_broadcast_outputs add column if not exists last_error text;
alter table public.cr_broadcast_outputs add column if not exists restart_count integer not null default 0;
create index if not exists cr_playout_commands_pending_idx on public.cr_playout_commands(channel_id,status,created_at);
alter table public.cr_playout_commands enable row level security;
drop policy if exists cr_playout_commands_owner_all on public.cr_playout_commands;
create policy cr_playout_commands_owner_all on public.cr_playout_commands for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
grant select,insert,update on public.cr_playout_commands to authenticated;
notify pgrst,'reload schema';
