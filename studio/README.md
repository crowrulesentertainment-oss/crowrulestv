# CrowRules+ Network Control Studio

Location: `/studio/` in the `crowrulestv` repository.

## Included in this first build

- Separate CrowRules+ control interface; the existing CrowRules TV homepage is untouched.
- Four seeded channel definitions: CrowRules+ Main, Tacoma Nights, CrowRules Productions and Back Deck Live.
- Independent channel playlist configuration and per-channel output assignments.
- 24-hour, 7-day and 30-day schedule preview generation.
- Media library, output configuration, responsive monitoring and a dedicated Playout Control Center.
- Per-channel Start / Stop / Restart commands, worker heartbeat, current and next program, FFmpeg process status, director override and channel standby slate URL.
- Remote controls use an owner-scoped Supabase command queue. Render background workers do not need public HTTP endpoints.
- Supabase browser configuration uses the existing public publishable key. No service-role key or stream key is included.
- Separate SQL schema in `crowrules-plus-schema.sql`, using only `cr_*` tables and owner-scoped RLS policies.

## Open the studio

https://crowrulesentertainment-oss.github.io/crowrulestv/studio/

## Supabase setup

1. Open the Supabase SQL Editor for project `cevylpnoexugwgygvtgu`.
2. Review and run `crowrules-plus-schema.sql` (base network tables) and `crowrules-plus-playout-control.sql` (remote operations command queue and telemetry fields). Both migrations have already been applied to the connected project.
3. Open the studio and sign in with the authorized Supabase Auth account.
4. The Studio synchronizes channel definitions, playlists and generated schedules to the `cr_*` tables. The signed-in user can queue playout commands; the independent Node worker processes them on its next poll.

## Important broadcast status

This is the network control-plane foundation, not a running 24/7 playout service. The dashboard distinguishes worker heartbeat and local FFmpeg process status from confirmed YouTube ingest. A running FFmpeg process is not proof that YouTube has accepted the stream. Commands remain queued until the corresponding worker is deployed and polling Supabase.

Independent simultaneous broadcasting requires a CrowRules+ Node.js service with one isolated worker per channel. Each worker needs its own schedule cursor, media resolver, encoder process, destination credentials, heartbeat and restart policy. Credentials must be held on the server (environment variables or a secrets manager), never in GitHub Pages, browser storage, SQL rows or public source code.

The existing Tacoma Nights Studio and its current bridge are not modified by this addition. A separate CrowRules+ playout service and adapter should be implemented and tested before routing any production streams.


## Independent Node.js playout engine

The separate `../crowrules-plus-engine/` service provides four channel-specific FFmpeg workers. It reads the active programming rows published by this Studio in `cr_schedule_items` and writes status to `cr_broadcast_outputs`.

- [Engine setup and local runbook](../crowrules-plus-engine/README.md)
- [Four-service Render Blueprint](../render-crowrules-plus.yaml)

The engine and remote command/telemetry integration are committed, but the four Render workers still need deployment and unique server-side stream keys. The browser control center cannot start a worker that has not been deployed. Never enter stream keys into this browser Studio.
## Playout Control Center operations

The Monitoring / Playout Control Center view polls `cr_broadcast_outputs` while signed in. Commands are inserted into `cr_playout_commands` and consumed by the matching channel worker. Supported commands: `start`, `stop`, `restart`, `director_override`, `clear_override` and `set_standby`. Director override accepts a media URL and title; clear override returns to the active schedule. Standby accepts a direct media URL or supported YouTube video URL. Automatic recovery relaunches a failed FFmpeg process on the worker's next polling cycle. Heartbeats are written every 15 seconds by default; the Studio considers a heartbeat stale after 40 seconds.
