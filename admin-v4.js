(()=>{
'use strict';
const V4={version:'4.0',build:'2026-08-26'};
const esc4=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast4(message,kind='good'){
 let t=document.getElementById('v4-toast');
 if(!t){t=document.createElement('div');t.id='v4-toast';t.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;max-width:420px;padding:12px 15px;border:1px solid #273241;border-radius:10px;background:#101722;color:#fff;box-shadow:0 12px 35px #0008';document.body.appendChild(t)}
 t.innerHTML='<b>'+esc4(kind==='bad'?'Admin Pro error':'Admin Pro')+'</b><div style="margin-top:4px">'+esc4(message)+'</div>';
 clearTimeout(t._timer);t._timer=setTimeout(()=>t.remove(),4500);
}
async function safeQuery(table,select='*',limit=25){try{const {data,error}=await db.from(table).select(select).limit(limit);if(error)throw error;return data||[]}catch(e){toast4(table+': '+(e.message||e),'bad');return []}}
function addV4Nav(){
 const aside=document.querySelector('aside');
 if(!aside||document.getElementById('v4nav'))return;
 const group=document.createElement('div');group.className='group';group.id='v4nav';group.textContent='v4.0 Tools';aside.appendChild(group);
 [['v4overview','⚡ Command Center'],['v4health','🛡 Diagnostics']].forEach(([page,label])=>{const b=document.createElement('button');b.className='nav';b.dataset.page=page;b.textContent=label;b.onclick=()=>openV4Page(page);aside.appendChild(b)});
 const main=document.querySelector('main');if(!main)return;
 const ov=document.createElement('section');ov.id='page-v4overview';ov.className='page';ov.innerHTML='<div class="hero"><div><h1>Admin Pro v4.0 Command Center</h1><p class="muted">Unified CrowRules Entertainment operations for TV channels, playlists, schedules, episodes and live events.</p></div><button class="primary" id="v4Refresh">Refresh Command Center</button></div><div id="v4Cards" class="grid"></div><div class="card" style="margin-top:14px"><h2>Quick Actions</h2><div class="actions"><button onclick="openPage(\'playlists\')">🎛 Playlist Studio</button><button onclick="openPage(\'schedule\')">📺 Schedule Studio</button><button onclick="openPage(\'channels\')">▶ TV Channels</button><button onclick="openPage(\'episodes\')">🎥 Episodes</button><button onclick="openPage(\'events\')">🔴 Live Events</button></div></div><div class="card" style="margin-top:14px"><h2>Architecture</h2><p class="muted">v4.0 uses <b>tv_channels</b> as the canonical channel table and <b>tv_channel_playlist</b> as the per-channel playlist table. Episodes, schedule_items and live_events remain linked by their existing foreign keys.</p></div>';
 const hd=document.createElement('section');hd.id='page-v4health';hd.className='page';hd.innerHTML='<div class="hero"><div><h1>v4.0 Diagnostics</h1><p class="muted">Checks the live Supabase schema without changing data.</p></div><button class="primary" id="v4RunHealth">Run Diagnostics</button></div><div id="v4HealthList" class="list"></div>';
 main.append(ov,hd);$('v4Refresh').onclick=loadV4Overview;$('v4RunHealth').onclick=runV4Health;
}
function openV4Page(p){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+p)?.classList.add('active');document.querySelector('.nav[data-page="'+p+'"]')?.classList.add('active');if(p==='v4overview')loadV4Overview();if(p==='v4health')runV4Health()}
async function loadV4Overview(){
 const tables=['tv_channels','tv_channel_playlist','schedule_items','live_events','shows','episodes','celebrity_deaths'];
 const results=await Promise.all(tables.map(async t=>{const rows=await safeQuery(t,'id',1);return [t,rows.length?'Connected':'Empty'];}));
 const c=document.getElementById('v4Cards');if(!c)return;
 c.innerHTML=results.map(([t,s])=>'<div class="card"><div class="muted">'+esc4(t)+'</div><b>'+esc4(s)+'</b></div>').join('');
}
async function runV4Health(){
 const el=document.getElementById('v4HealthList');if(!el)return;el.innerHTML='<div class="notice">Running diagnostics…</div>';
 const checks=['tv_channels','tv_channel_playlist','episodes','schedule_items','live_events','shows','celebrity_deaths','tacoma_nights_settings','youtube_live_channels'];
 const out=[];
 for(const t of checks){try{const {data,error}=await db.from(t).select('*').limit(1);out.push('<div class="row"><span class="good">✓</span><div><b>'+esc4(t)+'</b><div class="muted">'+(error?'Query failed':'Schema/API reachable')+'</div></div><span class="pill">'+(error?'ERROR':'OK')+'</span></div>')}catch(e){out.push('<div class="row"><span class="bad">✕</span><div><b>'+esc4(t)+'</b><div class="muted">'+esc4(e.message||e)+'</div></div><span class="pill">ERROR</span></div>')}}
 el.innerHTML=out.join('');
}
function installV4(){
 addV4Nav();
 const top=document.querySelector('.top b');if(top)top.textContent='CrowRules Entertainment — Admin Pro v4.0';
 const sub=document.querySelector('.top .muted');if(sub)sub.textContent='Supabase • Playlist Studio • Schedule Studio • TV Channels • Live Events • v4.0';
 if(typeof loadAll==='function'){const old=window.loadAll;window.loadAll=async()=>{await old();loadV4Overview()}}
 loadV4Overview();
 toast4('Admin Pro v4.0 is ready.');
}
window.CrowRulesAdminV4={V4,installV4,loadV4Overview,runV4Health};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installV4,250));else setTimeout(installV4,250);
})();
