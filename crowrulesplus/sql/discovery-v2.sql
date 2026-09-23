-- CrowRules+ Discovery Intelligence v2
create index if not exists crplus_content_title_trgm_idx on public.crplus_content using gin (title gin_trgm_ops);
create index if not exists crplus_content_description_trgm_idx on public.crplus_content using gin (description gin_trgm_ops);
