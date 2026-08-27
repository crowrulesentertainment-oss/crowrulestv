/* CrowRules YouTube Live bridge — v1.1 */
(function(){
  const ENDPOINT='https://zauxdqyssratvzmomozf.supabase.co/functions/v1/youtube-live';
  const SITE='tacoma-nights';
  function findTarget(){return document.querySelector('[data-youtube-live-player],#youtube-live-player,#tacoma-nights-live-player');}
  function ensureTarget(){let target=findTarget();if(target)return target;target=document.createElement('section');target.id='tacoma-nights-live-player';target.setAttribute('data-youtube-live-player','');target.style.cssText='max-width:1100px;margin:24px auto;padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:#0b0d12;color:#fff;font-family:system-ui,sans-serif;box-sizing:border-box';const first=document.body.firstElementChild;document.body.insertBefore(target,first||null);return target;}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function render(data){const target=ensureTarget();if(!data?.live){target.innerHTML='<div style="font-weight:700">Tacoma Nights Live</div><div style="opacity:.7;margin-top:6px">'+(data?.configured===false?'YouTube Live detection is not configured yet.':'No Tacoma Nights live stream is active right now.')+'</div>';target.removeAttribute('data-live-video-id');return;}target.setAttribute('data-live-video-id',data.videoId||'');target.innerHTML='<div style="display:flex;gap:8px;align-items:center;font-weight:800;color:#ff4d67">🔴 LIVE NOW</div><div style="font-size:20px;font-weight:800;margin:8px 0">'+escapeHtml(data.title||'Tacoma Nights Live')+'</div><div style="aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden"><iframe src="'+data.embedUrl+'" title="'+escapeHtml(data.title||'Tacoma Nights Live')+'" style="width:100%;height:100%;border:0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';}
  async function check(){try{const r=await fetch(ENDPOINT+'?site='+encodeURIComponent(SITE),{cache:'no-store'});const data=await r.json();render(data);window.CrowRulesYouTubeLive=data;return data;}catch(e){render({live:false,configured:false,error:e.message});return null;}}
  window.CrowRulesYouTubeLiveCheck=check;
  function start(){check();setInterval(check,60000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
