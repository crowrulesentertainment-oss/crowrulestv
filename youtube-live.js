/* CrowRules YouTube Live bridge — Tacoma Nights single-stream + matching chat */
(function(){
  const ENDPOINT='https://zauxdqyssratvzmomozf.supabase.co/functions/v1/youtube-live';
  const SITE='tacoma-nights';
  const CHAT_DOMAIN='crowrulesentertainment-oss.github.io';
  const target=()=>document.querySelector('[data-youtube-live-player],#youtube-live-player,#tacoma-nights-live-player');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(data){
    const root=target(); if(!root)return;
    const state=document.getElementById('liveState');
    if(!data?.live||!data.videoId){
      if(state)state.textContent='OFFLINE';
      root.innerHTML='<div class="live-shell"><div class="live-card"><div class="bar"><span class="badge">TACOMA NIGHTS</span><span>Waiting for broadcast</span></div><div class="offline"><div><h3>Tacoma Nights is offline</h3><p>The same single YouTube Live broadcast will appear here automatically when it goes live.</p></div></div></div><div class="chat-card"><div class="bar"><span>LIVE CHAT</span><span>YouTube</span></div><div class="chat"><div class="offline"><div><h3>Chat offline</h3><p>Live chat will open with the same broadcast.</p></div></div></div></div></div>';
      return;
    }
    if(state)state.textContent='LIVE NOW';
    const video=encodeURIComponent(data.videoId);
    const embed='https://www.youtube.com/embed/'+video+'?autoplay=1&rel=0';
    const chat='https://www.youtube.com/live_chat?v='+video+'&embed_domain='+encodeURIComponent(CHAT_DOMAIN);
    root.innerHTML='<div class="live-shell"><div class="live-card"><div class="bar"><span class="badge">🔴 LIVE NOW</span><span>'+esc(data.title||'Tacoma Nights Live')+'</span></div><div class="frame"><iframe src="'+embed+'" title="'+esc(data.title||'Tacoma Nights Live')+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div><div class="chat-card"><div class="bar"><span>LIVE CHAT</span><span>YouTube</span></div><div class="chat"><iframe src="'+chat+'" title="Tacoma Nights Live Chat" allow="autoplay"></iframe></div></div></div>';
    window.CrowRulesYouTubeLive=data;
  }
  async function check(){try{const r=await fetch(ENDPOINT+'?site='+encodeURIComponent(SITE),{cache:'no-store'});const data=await r.json();render(data);return data;}catch(e){render({live:false,error:e.message});return null;}}
  window.CrowRulesYouTubeLiveCheck=check;
  function start(){check();setInterval(check,60000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
