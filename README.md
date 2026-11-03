# CrowRules+ — Streaming Network Prototype

A responsive, multi-page HTML/CSS/JavaScript front-end concept for CrowRules+, a future streaming network from CrowRules Entertainment.

## What's included

- Cinematic homepage and global navigation
- Live TV page with eight sample channel concepts
- On-demand catalog with genre filters
- TV Guide with illustrative programming blocks
- Demo player pages for titles and channels
- My List saved in browser local storage
- Search across the sample catalog and channels
- Creator interest form (front-end demo only; it does not submit or store data)
- Network Command Center demo at `admin/index.html`
- Export sample catalog metadata as JSON
- Responsive layouts for desktop, tablet and mobile

## Run locally

1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. For best compatibility, you can serve the folder with a simple static web server (for example, VS Code Live Server).

No build step or package installation is required.

## Pages

- `index.html` — Home
- `live.html` — Live TV
- `on-demand.html` — On Demand
- `guide.html` — TV Guide
- `my-list.html` — My List
- `player.html?id=tacoma-nights` — Player example
- `creators.html` — Creator Network
- `admin/index.html` — Network Command Center demo

## Important prototype limits

- Channel cards and schedules are demo concepts, not real broadcasts.
- The player is a visual placeholder; no stream or movie video source is included.
- Some artwork loads from Unsplash and Google Fonts load from Google Fonts, so those assets need an internet connection. Browser fallback fonts are available.
- The creator form is not submitted or saved.
- My List is saved only in the current browser using local storage.
- The admin page is a public demo and must not be used for real administration.

## Suggested production integration

1. Move channel, title, schedule and user data to a backend.
2. Add Supabase authentication and server-enforced role checks for administrators and creators.
3. Keep privileged keys server-side only. Never expose a Supabase service-role key in public JavaScript.
4. Connect authorized media sources and a video player that supports the chosen delivery format (such as HLS).
5. Use a streaming provider / playout system for actual 24/7 channels, schedule automation, ad breaks and stream health monitoring.
6. Add privacy notices, consent, secure form handling, moderation and content-rights workflows before accepting creator submissions.
7. Test keyboard accessibility, captions, error states and mobile playback before release.

## Customize the demo catalog

Edit `assets/js/catalog.js`. It contains sample channel and title metadata. Replace all illustrative metadata with verified, authorized programming before presenting the site as a live service.

Brand tagline: **One company. One universe.**
