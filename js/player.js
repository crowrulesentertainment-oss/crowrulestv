/* CrowRules+ Universal Player */
(function () {
  "use strict";
  const p = new URLSearchParams(location.search);
  const type = String(p.get("type") || "").toLowerCase();
  const id = p.get("id") || "";
  const channel = p.get("channel") || "";
  const directUrl = p.get("url") || "";
  const requestedTitle = p.get("title") || "";
  const data = Array.isArray(window.CRP_DATA) ? window.CRP_DATA : [];
  const item = data.find(x => x.id === id) ||
    data.find(x => x.youtubeId === id) ||
    data.find(x => x.channel === channel) ||
    data.find(x => x.channelSlug === channel) ||
    data.find(x => x.slug === channel) || {};
  const player = document.getElementById("player");
  const titleEl = document.getElementById("watchTitle");
  const descEl = document.getElementById("watchDescription");
  const sourceEl = document.getElementById("sourceLabel");
  const listButton = document.getElementById("listButton");
  const resolvedType = type || String(item.type || "youtube").toLowerCase();
  const title = requestedTitle || item.title || item.name || "CrowRules+ Player";
  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = item.description || "Watch on CrowRules+.";
  if (sourceEl) sourceEl.textContent = ({
    youtube:"YouTube", youtube_live:"YouTube Live",
    uploaded:"CrowRules+ Video", custom_live:"Custom HLS Live"
  })[resolvedType] || "CrowRules+";

  function message(text) {
    player.innerHTML = '<div class="player-shell"><div class="empty-player">' + text + "</div></div>";
  }
  function esc(v) { return String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;"); }
  function youtube() {
    const videoId = item.youtubeId || id;
    if (!videoId) return message("Add a YouTube video or live ID to this content item.");
    player.innerHTML = '<div class="player-shell"><iframe src="https://www.youtube.com/embed/' +
      encodeURIComponent(videoId) + '?rel=0&modestbranding=1" title="' + esc(title) +
      '" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe></div>';
  }
  function uploaded() {
    const src = directUrl || item.videoUrl || item.playbackUrl || item.url || "";
    if (!src) return message("Add the uploaded video URL or Supabase Storage URL.");
    player.innerHTML = '<div class="player-shell"><video controls playsinline preload="metadata" src="' +
      esc(src) + '"></video></div>';
  }
  function hls() {
    const src = directUrl || item.hlsUrl || item.playbackUrl || item.url || "";
    if (!src) return message("This HLS channel is offline or its stream URL is not configured yet.");
    player.innerHTML = '<div class="player-shell"><video id="crowRulesHlsVideo" controls autoplay playsinline muted></video></div>';
    const video = document.getElementById("crowRulesHlsVideo");
    function native() { video.src = src; video.play().catch(() => {}); }
    function start() {
      if (!window.Hls || !window.Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) native();
        else message("This browser cannot play HLS streams.");
        return;
      }
      const hls = new window.Hls({ enableWorker:true, lowLatencyMode:true,
        backBufferLength:30, liveSyncDurationCount:3, liveMaxLatencyDurationCount:6 });
      window.__crowRulesHls = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(window.Hls.Events.ERROR, (_, e) => {
        if (!e || !e.fatal) return;
        if (e.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (e.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else { hls.destroy(); message("The live stream could not be played. The channel may be offline."); }
      });
    }
    if (window.Hls) start();
    else {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/hls.js@1";
      s.onload = start;
      s.onerror = () => video.canPlayType("application/vnd.apple.mpegurl") ? native() : message("The HLS player library could not be loaded.");
      document.head.appendChild(s);
    }
  }
  if (!player) return;
  if (resolvedType === "youtube" || resolvedType === "youtube_live") youtube();
  else if (resolvedType === "uploaded") uploaded();
  else if (resolvedType === "custom_live") hls();
  else message("Unsupported CrowRules+ source type.");

  if (listButton) {
    const key = item.id || id || channel;
    let list = JSON.parse(localStorage.getItem("crp_my_list") || "[]");
    const sync = () => { listButton.textContent = list.includes(key) ? "✓ In My List" : "＋ My List"; };
    sync();
    listButton.onclick = () => {
      if (!key) return;
      list = list.includes(key) ? list.filter(x => x !== key) : list.concat(key);
      localStorage.setItem("crp_my_list", JSON.stringify(list)); sync();
    };
  }
  addEventListener("beforeunload", () => {
    if (window.__crowRulesHls) window.__crowRulesHls.destroy();
  });
})();