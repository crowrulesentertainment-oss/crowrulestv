(()=>{'use strict';
const FRAME=document.getElementById('adminFrame');
const CROW='1c7806a9-4572-428b-95ff-0a14dde89c3a';
const LIVE='661d0268-d88c-4875-8bb0-5d365288b5bd';
let originalFetch=null;
let installed=false;
let scheduleChannel=CROW;
const frameDoc=()=>FRAME?.contentDocument;
function selectedPlaylistChannel(){const d=frameDoc();const modal=d?.querySelector('.cr46modal');return modal?.querySelector('#channel')?.value||null}
function reloadSchedule(){const w=FRAME?.contentWindow;if(!w)return;try{if(typeof w.loadPage==='function')w.loadPage('schedule')}catch{}}
function injectUI(){const d=frameDoc();if(!d?.body)return setTimeout(injectUI,250);if(d.getElementById('cr47style'))return;
 const st=d.createElement('style');st.id='cr47style';st.textContent='#cr47scheduleBar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 12px;padding:10px 12px;background:#0a1017;border:1px solid #273241;border-radius:11px}#cr47scheduleBar select{padding:9px 11px;background:#080b10;color:#fff;border:1px solid #303b4b;border-radius:9px;min-width:240px}#cr47scheduleBar .cr47hint{color:#8b98aa;font-size:12px}';d.head.appendChild(st);
 const page=d.getElementById('page-schedule');if(!page)return;const hero=page.querySelector('.hero');if(!hero)return;
 if(!d.getElementById('cr47scheduleBar')){const bar=d.createElement('div');bar.id='cr47scheduleBar';bar.innerHTML='<strong>Schedule Channel</strong><select id="cr47scheduleChannel"><option value="'+CROW+'">CrowRules TV</option><option value="'+LIVE+'">Live Events</option><option value="">All Channels</option></select><span class="cr47hint">New and edited schedule items use the selected channel. Playlist Studio only shows schedule items from its selected channel.</span>';hero.insertAdjacentElement('afterend',bar);const sel=bar.querySelector('#cr47scheduleChannel');sel.value=scheduleChannel;sel.onchange=()=>{scheduleChannel=sel.value;reloadSchedule()}}
}
function installFetch(){const w=FRAME?.contentWindow;if(!w||!w.fetch||w.__cr47FetchInstalled)return;if(!originalFetch)originalFetch=w.fetch.bind(w);const base=originalFetch;w.fetch=async function(input,init={}){let url='';let method=(init.method||'GET').toUpperCase();try{url=typeof input==='string'?input:(input?.url||'')}catch{}const isRest=/\/rest\/v1\//.test(url);if(isRest&&/\/schedule_items(?:\?|$)/.test(url)){const playlistChannel=selectedPlaylistChannel();const channel=playlistChannel||scheduleChannel;if(method==='GET'&&channel&&!/[?&]channel_id=/.test(url)){url+=(url.includes('?')?'&':'?')+'channel_id=eq.'+encodeURIComponent(channel);input=url}if((method==='POST'||method==='PATCH'||method==='PUT')&&channel){try{const body=typeof init.body==='string'?JSON.parse(init.body):null;if(body&&typeof body==='object'){if(Array.isArray(body))body.forEach(x=>{if(x&&x.channel_id==null)x.channel_id=channel});else if(body.channel_id==null)body.channel_id=channel;init={...init,body:JSON.stringify(body)}}}catch{}}}return base(input,init)};w.__cr47FetchInstalled=true}
function watch(){const d=frameDoc();if(!d?.body)return setTimeout(watch,250);injectUI();installFetch();if(!installed){installed=true;const mo=new MutationObserver(()=>{injectUI();installFetch()});mo.observe(d.body,{childList:true,subtree:true})}}
FRAME?.addEventListener('load',()=>setTimeout(watch,300));setTimeout(watch,600);
})();