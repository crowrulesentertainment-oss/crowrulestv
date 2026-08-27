/* CrowRules YouTube Live bridge — v1.0 */
(function(){
  const ENDPOINT='https://zauxdqyssratvzmomozf.supabase.co/functions/v1/youtube-live';
  const SITE='tacoma-nights';
  function findTarget(){return document.querySelector('[data-youtube-live-player],#youtube-live-player,#tacoma-nights-live-player');}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function render(data){const target=findTarget();if(!target)return;if(!data?.live){target.innerHTML='<div class="cr-live-status">'+(data?.configured===false?'YouTube Live detection is not configured yet.':'No Tacoma Nights live stream is active right now.')+'</div>';target.removeAttribute('data-live-video-id');return;}target.setAttribute('data-live-video-id',data.videoId||'');target.innerHTML='<div class="cr-live-badge">🔴 LIVE NOW</div><div class="cr-live-title">'+escapeHtml(data.title||'Tacoma Nights Live')+'</div><div class="cr-live-player"><iframe src="'+data.embedUrl+'" title="'+escapeHtml(data.title||'Tacoma Nights Live')+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';}
  async function check(){try{const r=await fetch(ENDPOINT+'?site='+encodeURIComponent(SITE),{cache:'no-store'});const data=await r.json();render(data);window.CrowRulesYouTubeLive=data;return data;}catch(e){render({live:false,configured:false,error:e.message});return null;}}
  window.CrowRulesYouTubeLiveCheck=check;
  function start(){check();setInterval(check,60000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
