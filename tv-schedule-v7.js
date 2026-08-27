/* CrowRules TV v7 — schedule_items is the sole programming source.
   tv_channel_playlist is intentionally NOT queried by the public TV player. */
(()=>{
'use strict';
const SUPABASE_URL='https://zauxdqyssratvzmomozf.supabase.co';
const SUPABASE_ANON_KEY=window.CROWRULES_SUPABASE_ANON_KEY||'';
const CROW_RULES_TV_CHANNEL_ID='1c7806a9-4572-428b-95ff-0a14dde89c3a';
const CHANNEL_NAME='CrowRules TV';
let client=null, items=[], currentIndex=-1, timer=null, lastSignature='';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function initClient(){
 if(window.supabase?.createClient) client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
 return !!client;
}
function find(obj,...keys){for(const k of keys)if(obj?.[k]!=null&&obj[k]!=='')return obj[k];return null}
function startValue(x){return find(x,'starts_at','start_time','scheduled_start','air_date')}
function endValue(x){return find(x,'ends_at','end_time','scheduled_end')}
function durationSeconds(x){const n=Number(find(x,'duration_seconds','duration'));if(Number.isFinite(n)&&n>0)return n;const a=Date.parse(startValue(x)||'');const b=Date.parse(endValue(x)||'');return a&&b&&b>a?Math.round((b-a)/1000):0}
function mediaUrl(x){return find(x,'video_url','youtube_url','media_url','stream_url','url','embed_url')||''}
function title(x){return find(x,'title','name','program_title','episode_title')||'CrowRules TV Programming'}
function description(x){return find(x,'description','summary','synopsis')||''}
function thumb(x){return find(x,'thumbnail_url','thumbnail','image_url','poster_url')||''}
function normalize(row){return {...row,_start:Date.parse(startValue(row)||'')||0,_end:Date.parse(endValue(row)||'')||0,_duration:durationSeconds(row)}}
function activeItems(rows){
 const now=Date.now();
 return rows.filter(x=>x && x.is_active!==false && x.is_published!==false && x.channel_id===CROW_RULES_TV_CHANNEL_ID)
   .map(normalize).filter(x=>x._start>0).sort((a,b)=>a._start-b._start);
}
async function loadSchedule(silent=false){
 if(!client&&!initClient()){setStatus('Supabase configuration unavailable',true);return}
 const {data,error}=await client.from('schedule_items').select('*').eq('channel_id','eq.'+CROW_RULES_TV_CHANNEL_ID).order('starts_at',{ascending:true});
 if(error){console.error(error);setStatus('Unable to load CrowRules TV schedule',true);return}
 const next=activeItems(data||[]);const sig=next.map(x=>x.id+'|'+x._start+'|'+x._end).join(',');
 if(silent&&sig===lastSignature)return;lastSignature=sig;items=next;renderGuide();syncCurrent();
}
function setStatus(text,bad=false){const el=$('tvScheduleStatus');if(el){el.textContent=text;el.classList.toggle('off',!!bad)}}
function renderGuide(){
 const body=$('tvGuide');if(!body)return;
 if(!items.length){body.innerHTML='<div class="empty">No CrowRules TV programming is currently scheduled.</div>';return}
 body.innerHTML=items.map((x,i)=>`<div class="guideItem" data-i="${i}"><b>${esc(title(x))}</b><span>${formatTime(x._start)}${x._end?' — '+formatTime(x._end):''}</span></div>`).join('');
 body.querySelectorAll('.guideItem').forEach(el=>el.addEventListener('click',()=>selectIndex(Number(el.dataset.i))));
}
function formatTime(ms){if(!ms)return 'Scheduled';return new Intl.DateTimeFormat([], {hour:'numeric',minute:'2-digit'}).format(new Date(ms))}
function formatRange(x){return `${formatTime(x._start)}${x._end?' — '+formatTime(x._end):''}`}
function currentAt(now=Date.now()){let i=-1;for(let n=0;n<items.length;n++){const x=items[n];if(x._start<=now&&(!x._end||now<x._end))i=n}return i}
function syncCurrent(){
 const i=currentAt();
 if(i<0){currentIndex=-1;updateNow(null);return}
 if(i!==currentIndex){currentIndex=i;updateNow(items[i]);loadMedia(items[i]);}
 document.querySelectorAll('#tvGuide .guideItem').forEach((el,n)=>el.classList.toggle('current',n===currentIndex));
}
function updateNow(x){
 const n=$('tvNowTitle'),p=$('tvNowDescription'),m=$('tvNowMeta');
 if(n)n.textContent=x?title(x):'CrowRules TV';
 if(p)p.textContent=x?(description(x)||'Now playing on CrowRules TV.'):'The CrowRules TV schedule is standing by.';
 if(m)m.innerHTML=x?`<b>ON AIR</b><span>${esc(formatRange(x))}</span>`:'<b>STANDBY</b><span>Schedule</span>';
}
function youtubeId(u){try{const z=new URL(u);if(z.hostname.includes('youtu.be'))return z.pathname.slice(1).split('/')[0];if(z.searchParams.get('v'))return z.searchParams.get('v');const m=z.pathname.match(/embed\/([^/]+)/);return m?.[1]||''}catch{return ''}}
function loadMedia(x){
 const player=$('tvPlayer');if(!player)return;const u=mediaUrl(x);
 const y=youtubeId(u);
 if(y){player.innerHTML=`<iframe src="https://www.youtube.com/embed/${encodeURIComponent(y)}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;return}
 if(u){player.innerHTML=`<video src="${esc(u)}" controls autoplay playsinline></video>`;return}
 player.innerHTML='<div class="msg">This schedule item has no playable media URL yet.</div>';
}
function selectIndex(i){if(items[i]){currentIndex=i;updateNow(items[i]);loadMedia(items[i]);document.querySelectorAll('#tvGuide .guideItem').forEach((el,n)=>el.classList.toggle('current',n===i));}}
function tick(){syncCurrent();}
function boot(){
 if(!document.body)return;
 if(!$('tvGuide'))return;
 setStatus('Schedule online');
 loadSchedule();
 clearInterval(timer);timer=setInterval(()=>{tick();loadSchedule(true)},30000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();