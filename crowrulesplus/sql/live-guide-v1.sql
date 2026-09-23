-- CrowRules+ Live TV & Guide Engine v1
-- Verified against the current crplus_live_channels and crplus_schedule schemas.
create index if not exists crplus_live_channels_live_sort_idx on public.crplus_live_channels(is_live, sort_order);
create index if not exists crplus_schedule_channel_start_idx on public.crplus_schedule(channel_id, starts_at);
create index if not exists crplus_schedule_current_idx on public.crplus_schedule(channel_id, starts_at, ends_at);
-- RLS is already enabled on both exposed tables; retain policies appropriate to your publishing model.