-- CrowRules+ Profiles Integration v2
-- Profile-specific uniqueness for history and My List.
create index if not exists crplus_watch_history_profile_content_idx
on public.crplus_watch_history(profile_id,content_id);

create unique index if not exists crplus_my_list_profile_content_idx
on public.crplus_my_list(profile_id,content_id);
