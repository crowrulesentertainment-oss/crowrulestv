# CrowRules+ Network Control Studio

Location: `/studio/` in the `crowrulestv` repository.

## Included in this first build

- Separate CrowRules+ control interface; the existing CrowRules TV homepage is untouched.
- Four seeded channel definitions: CrowRules+ Main, Tacoma Nights, CrowRules Productions and Back Deck Live.
- Independent channel playlist configuration and per-channel output assignments.
- 24-hour, 7-day and 30-day schedule preview generation.
- Media library view, output configuration, monitoring placeholders and responsive layout.
- Supabase browser configuration uses the existing public publishable key. No service-role key or stream key is included.
- Separate SQL schema in `crowrules-plus-schema.sql`, using only `cr_*` tables and owner-scoped RLS policies.

## Open the studio

https://crowrulesentertainment-oss.github.io/crowrulestv/studio/

## Supabase setup

1. Open the Supabase SQL Editor for project `cevylpnoexugwgygvtgu`.
2. Review and run `crowrules-plus-schema.sql`.
3. Open the studio and sign in with the authorized Supabase Auth account.
4. The first release syncs channel definitions to `cr_channels`. Playlist items and generated schedules are currently stored in that browser's local storage; server-side playlist/schedule synchronization is a follow-on integration task.

## Important broadcast status

This is the network control-plane foundation, not a running 24/7 playout service. The dashboard intentionally reports outputs and worker health as **not verified**. Saving a playlist, schedule or output label does not start a broadcast.

Independent simultaneous broadcasting requires a CrowRules+ Node.js service with one isolated worker per channel. Each worker needs its own schedule cursor, media resolver, encoder process, destination credentials, heartbeat and restart policy. Credentials must be held on the server (environment variables or a secrets manager), never in GitHub Pages, browser storage, SQL rows or public source code.

The existing Tacoma Nights Studio and its current bridge are not modified by this addition. A separate CrowRules+ playout service and adapter should be implemented and tested before routing any production streams.


## Independent Node.js playout engine

The separate `../crowrules-plus-engine/` service provides four channel-specific FFmpeg workers. It reads the active programming rows published by this Studio in `cr_schedule_items` and writes status to `cr_broadcast_outputs`.

- [Engine setup and local runbook](../crowrules-plus-engine/README.md)
- [Four-service Render Blueprint](../render-crowrules-plus.yaml)

The engine is committed but not deployed or connected to live YouTube destinations yet. Configure one unique stream key per channel in server-side environment settings; never enter stream keys into this browser Studio.