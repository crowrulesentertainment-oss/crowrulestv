# CrowRules TV — Custom HLS Live

Custom HLS Live is now part of the crowrulestv repository.

## Architecture
Camera / Galaxy S24 Ultra / OBS / Streamlabs
→ RTMP or SRT ingest
→ CrowRules-compatible streaming server
→ HLS playback (.m3u8)
→ CrowRules TV / CrowRules+
→ watch.html + hls.js

GitHub Pages hosts the player and interface. It does not receive RTMP/SRT video ingest.

## Configure a channel
Edit js/live-config.js.

Set the public playback URL:
playbackUrl: "https://YOUR-HLS-SERVER/hls/crowrules-main/index.m3u8"

and set:
isLive: true

Do not put an RTMP stream key, SRT passphrase, Supabase service-role key, or other secret in GitHub.

## Open a channel
live.html lists configured channels.

A player is available at:
watch.html?channel=crowrules-main

## Encoder flow
For OBS, use Settings → Stream → Custom.

Server:
rtmp://YOUR-STREAM-SERVER/live

Stream key:
crowrules-main

Your streaming server then publishes an HLS playlist such as:
https://YOUR-HLS-SERVER/hls/crowrules-main/index.m3u8

The exact ingest/playback paths depend on the streaming server.

## Browser playback
Safari/iOS can use native HLS.
Chrome, Edge and Firefox use hls.js when supported.

The reusable player logic is in js/hls-player.js.

## Next backend step
When the CrowRules Supabase live-channel table is ready, live-config.js can be replaced by a Supabase query so Admin Command Center controls channel name, slug, HLS playback URL, live/offline state, featured state, thumbnail, start/end time and channel visibility.

The public GitHub site should only receive public playback metadata. Ingest credentials remain server-side.
