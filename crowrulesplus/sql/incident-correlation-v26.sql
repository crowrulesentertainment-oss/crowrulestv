-- CrowRules+ V26 — Incident Correlation & Alert Deduplication
-- Mirrors the live schema change/function set applied to Supabase project cevylpnoexugwgygvtgu.

alter table public.crplus_command_events
  add column if not exists correlation_key text,
  add column if not exists occurrence_count integer not null default 1,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now();

create index if not exists crplus_command_events_correlation_idx
  on public.crplus_command_events(correlation_key, status, last_seen_at desc);

create unique index if not exists crplus_command_events_active_correlation_uidx
  on public.crplus_command_events(correlation_key)
  where correlation_key is not null and status in ('new','acknowledged');

-- The ingest RPC atomically correlates concurrent events for the same operational failure.
-- It is SECURITY INVOKER and requires the existing crplus_is_admin() authorization gate.
create or replace function public.crplus_ingest_command_event(
  p_correlation_key text, p_event_key text, p_source_table text,
  p_source_id uuid default null, p_channel_id uuid default null,
  p_incident_id uuid default null, p_severity text default 'info',
  p_title text default 'Network Event', p_message text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns table(event_id uuid, result_action text, occurrence_count integer, event_status text, event_severity text)
language plpgsql security invoker set search_path = public
as $$
declare v_event public.crplus_command_events%rowtype; v_rank integer; v_new_rank integer;
begin
  if not public.crplus_is_admin() then raise exception 'Admin access required'; end if;
  if coalesce(trim(p_correlation_key), '') = '' then raise exception 'Correlation key is required'; end if;
  if p_severity not in ('info','warning','critical') then raise exception 'Invalid severity'; end if;
  perform pg_advisory_xact_lock(hashtextextended('crplus:event:' || p_correlation_key, 0));
  select * into v_event from public.crplus_command_events
   where correlation_key=p_correlation_key and status in ('new','acknowledged')
   order by last_seen_at desc limit 1 for update;
  v_rank=case v_event.severity when 'critical' then 3 when 'warning' then 2 else 1 end;
  v_new_rank=case p_severity when 'critical' then 3 when 'warning' then 2 else 1 end;
  if v_event.id is not null then
    update public.crplus_command_events set
      event_key=p_event_key, source_table=p_source_table,
      source_id=coalesce(p_source_id,source_id), channel_id=coalesce(p_channel_id,channel_id),
      incident_id=coalesce(p_incident_id,incident_id),
      severity=case when v_new_rank>v_rank then p_severity else severity end,
      title=p_title, message=p_message, occurrence_count=occurrence_count+1,
      last_seen_at=now(), metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb)
      where id=v_event.id returning * into v_event;
    return query select v_event.id,'correlated',v_event.occurrence_count,v_event.status,v_event.severity;
  else
    insert into public.crplus_command_events(event_key,source_table,source_id,channel_id,incident_id,severity,title,message,status,created_at,first_seen_at,last_seen_at,metadata,correlation_key)
    values(p_event_key,p_source_table,p_source_id,p_channel_id,p_incident_id,p_severity,p_title,p_message,'new',now(),now(),now(),coalesce(p_metadata,'{}'::jsonb),p_correlation_key)
    returning * into v_event;
    return query select v_event.id,'created',v_event.occurrence_count,v_event.status,v_event.severity;
  end if;
end; $$;

create or replace function public.crplus_acknowledge_command_event(p_event_id uuid)
returns public.crplus_command_events language plpgsql security invoker set search_path=public as $$
declare v_event public.crplus_command_events;
begin
  if not public.crplus_is_admin() then raise exception 'Admin access required'; end if;
  select * into v_event from public.crplus_command_events where id=p_event_id for update;
  if v_event.id is null then raise exception 'Command event not found'; end if;
  if v_event.status <> 'new' then raise exception 'Only new events can be acknowledged'; end if;
  update public.crplus_command_events set status='acknowledged',acknowledged_at=now(),acknowledged_by=auth.uid()
   where id=p_event_id returning * into v_event;
  return v_event;
end; $$;

create or replace function public.crplus_resolve_command_event(p_event_id uuid,p_resolution text default 'Resolved by operator')
returns public.crplus_command_events language plpgsql security invoker set search_path=public as $$
declare v_event public.crplus_command_events;
begin
  if not public.crplus_is_admin() then raise exception 'Admin access required'; end if;
  select * into v_event from public.crplus_command_events where id=p_event_id for update;
  if v_event.id is null then raise exception 'Command event not found'; end if;
  if v_event.status not in ('new','acknowledged') then raise exception 'Event is already resolved'; end if;
  update public.crplus_command_events set status='resolved',resolved_at=now(),resolved_by=auth.uid(),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('resolution',coalesce(p_resolution,'Resolved by operator'))
    where id=p_event_id returning * into v_event;
  return v_event;
end; $$;

revoke all on function public.crplus_ingest_command_event(text,text,text,uuid,uuid,uuid,text,text,text,jsonb) from public,anon;
grant execute on function public.crplus_ingest_command_event(text,text,text,uuid,uuid,uuid,text,text,text,jsonb) to authenticated;
revoke all on function public.crplus_acknowledge_command_event(uuid) from public,anon;
grant execute on function public.crplus_acknowledge_command_event(uuid) to authenticated;
revoke all on function public.crplus_resolve_command_event(uuid,text) from public,anon;
grant execute on function public.crplus_resolve_command_event(uuid,text) to authenticated;