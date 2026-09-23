-- CrowRules+ Universal Search & Discovery Engine v1
-- Search currently uses the existing published crplus_content catalog.
-- No new content table is required.
-- Existing indexed/catalog fields: title, slug, description, content_type,
-- division_key, tags, release_at, is_published, is_featured.
create index if not exists crplus_content_published_release_idx
on public.crplus_content(is_published,release_at desc);
create index if not exists crplus_content_division_idx
on public.crplus_content(division_key);
