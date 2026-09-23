-- CrowRules+ Programming Intelligence v12
-- Rule-aware advisory layer.
-- Rules support channel/global eligibility, duration bounds, repeat windows,
-- preferred content types/divisions and priority.
-- Recommendations are written to crplus_automation_runs; this release does
-- not autonomously publish schedule rows.
create index if not exists crplus_programming_rules_active_priority_idx
on public.crplus_programming_rules(is_active,priority);
