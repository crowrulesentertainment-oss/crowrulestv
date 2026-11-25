# CrowRules+ Independent Playout Engine

This service is a separate Node.js/FFmpeg playout engine for the CrowRules+ network. It does not import, patch, or call the Tacoma Nights bridge. The Tacoma Nights bridge remains responsible for its existing OBS/Streamlabs control path.

## Architecture

Four independent workers run inside one Node.js service process. Each worker has its own:
- channel ID and schedule polling loop
- current program state and FFmpeg child process
- RTMP destination and unique stream key
- optional standby slate
- database heartbeat and restart lifecycle

Initial channels:
- `cr-main` — CrowRules+ Main
- `cr-tacoma` — Tacoma Nights
- `cr-productions` — CrowRules Productions
- `cr-backdeck` — Back Deck Live

Each channel's stream key is read from its own server-side environment variable. Never reuse a stream key between channels.

## Runtime requirements

- Node.js 22+
- FFmpeg with libx264 and AAC encoders
- yt-dlp for YouTube video URL resolution
- Supabase project URL and **service-role key**, held only on the server
- Supabase Auth user UUID that owns the CrowRules+ channel rows
- A distinct YouTube Live stream key for every channel you intend to broadcast

## Local setup

1. Copy `.env.example` to `.env` and fill in the required values.
2. Set `CR_OWNER_USER_ID` to the Supabase Auth user UUID that owns the `cr_*` rows.
3. Configure four unique channel stream keys. Keep stream keys and the Supabase service-role key out of Git.
4. Install FFmpeg and yt-dlp on the machine, or use Docker.
5. Run:
   ```sh
   npm install
   npm run check
   npm start
   ```
6. Health: `GET http://127.0.0.1:8788/health`.
7. Authenticated controls: `GET http://127.0.0.1:8788/api/channels` and `POST /api/channels/:channelId/start|stop|restart`, with `Authorization: Bearer <CR_CONTROL_TOKEN>`.

The service binds to localhost by default. Do not expose this control API directly to the public internet. Put it behind a private network or authenticated reverse proxy if remote control is required.

## Database contract

The engine reads the currently active row from `public.cr_schedule_items` for each channel:
- `channel_id`
- `title`
- `media_url`
- `media_type`
- `starts_at`
- `ends_at`

A row is active when `starts_at <= now < ends_at`. The service writes worker health to `public.cr_broadcast_outputs`. It does not write or modify Tacoma Nights tables.

The first CrowRules+ Studio release currently stores playlist items and generated schedules in browser local storage. Therefore, before this engine can receive actual programming, the next integration step is to synchronize Studio playlists/schedule entries into `cr_playlists`, `cr_playlist_items`, `cr_program_schedules` and `cr_schedule_items`. No schedule data is invented by the engine.

## Media and playout

- Direct MP4, MOV, HLS and other FFmpeg-readable media URLs are passed to FFmpeg.
- YouTube video URLs are resolved server-side through yt-dlp before FFmpeg starts.
- For best reliability, prefer media hosted in Supabase Storage or another CDN with stable direct media URLs.
- Configure optional per-channel standby MP4 paths to keep the RTMP output active when no schedule item is on air.
- Schedule transitions are detected by each channel worker independently.

The first engine release is a scheduled-file playout engine. It does not automatically start a YouTube broadcast event, manage YouTube Live Control Room, or operate OBS/Streamlabs scenes. YouTube livestreams must be created and stream keys configured in YouTube Studio. The engine sends the encoded RTMP signal to the configured ingest endpoint. Confirm each channel independently in YouTube Live Control Room.

## Render deployment

A starter Blueprint is provided at the repository root as `render-crowrules-plus.yaml`. It creates a background worker from the Dockerfile. Before deployment, add these secret environment values in Render:
- `SUPABASE_SERVICE_ROLE_KEY`
- `CR_OWNER_USER_ID`
- `CR_MAIN_STREAM_KEY`
- `CR_TACOMA_STREAM_KEY`
- `CR_PRODUCTIONS_STREAM_KEY`
- `CR_BACKDECK_STREAM_KEY`

The service is configured with `autoDeploy: false` to avoid starting a broadcast engine before credentials, schedules and output destinations have been reviewed. Do not deploy until all stream keys are intentionally configured. For local testing, use unique unlisted/test YouTube broadcasts first.

## Safety and isolation

- No stream keys, OAuth client secrets or Supabase service-role keys belong in this repository, browser JavaScript or SQL.
- The engine has no route to the existing Tacoma Nights bridge.
- A worker only queries rows for its own channel ID.
- One worker failure does not terminate the other worker loops.
- Keep the service and control API on a trusted host; use HTTPS/private networking for any remote admin integration.
