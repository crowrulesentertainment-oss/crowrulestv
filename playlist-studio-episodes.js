(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—';
const playable=e=>Boolean(e?.video_url||e?.youtube_url);
function boot(){
 if(window.__CR_PLAYLIST_EPISODES__)return;
 if(!window.db){setTimeout(boot,700);return}
 const channel=document.getElementById('studioChannel'), toolbar=document.querySelector('#page-playlists .toolbar'), list=document.getElementById('playlist');
 if(!channel||!toolbar||!list){setTimeout(boot,700);return}
 window.__CR_PLAYLIST_EPISODES__=true;
 const btn=document.createElement('button');btn.className='success';btn.id='addEpisodesPlaylist';btn.textContent='🎥 Add On-Demand Episode';btn.disabled=true;toolbar.insertBefore(btn,document.getElementById('addPlaylist'));
 const modal=document.createElement('div');modal.className='modal hidden';modal.id='episodePlaylistModal';modal.innerHTML=`<div class="card"><div class="hero"><div><h2>Add On-Demand Episodes</h2><p class="muted">Add recorded/non-live episodes from the <b>episodes</b> table to the selected <b>tv_channels</b> playlist. Live events remain managed separately.</p></div><button id="epClose">✕</button></div><div class="toolbar"><input id="epSearch" class="grow" placeholder="Search episode or show…"><select id="epShow"><option value="">All shows</option></select><select id="epStatus"><option value="">All statuses</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="draft">Draft</option></select><button id="epPlayable">Playable only</button><button id="epAll">Select all visible</button></div><div id="epMsg" class="msg hidden"></div><div id="epList" class="list" style="max-height:55vh;overflow:auto"></div><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:12px"><span id="epCount" class="muted">0 selected</span><div style="display:flex;gap:8px"><button id="epCancel">Cancel</button><button id="epAdd" class="primary" disabled>Add selected to playlist</button></div></div></div>`;document.body.appendChild(modal);
 const search=modal.querySelector('#epSearch'),show=modal.querySelector('#epShow'),status=modal.querySelector('#epStatus'),playableBtn=modal.querySelector('#epPlayable'),epList=modal.querySelector('#epList'),epAdd=modal.querySelector('#epAdd'),epCount=modal.querySelector('#epCount'),msg=modal.querySelector('#epMsg');
 let episodes=[],existing=new Set(),selected=new Set(),playableOnly=false;
 const say=(t,bad=false)=>{msg.textContent=t;msg.classList.remove('hidden');msg.style.color=bad?'#ff637b':''};
 const active=()=>channel.value;
 async function load(){
  if(!active()){btn.disabled=true;return}
  btn.disabled=false;say('Loading non-live episodes…');
  const [er,pr]=await Promise.all([
   db.from('episodes').select('id,show_id,channel_id,episode_number,season_number,title,slug,description,youtube_url,thumbnail_url,youtube_thumbnail_url,video_url,video_type,published_at,premiere_at,release_date,duration_seconds,status,is_active,is_published,sort_order').eq('is_active',true).neq('status','archived').order('sort_order',{ascending:true}).order('published_at',{ascending:false}).limit(2000),
   db.from('tv_channel_playlist').select('episode_id').eq('channel_id',active()).not('episode_id','is',null)
  ]);
  if(er.error){say('Could not load episodes: '+er.error.message,true);return}
  if(pr.error){say('Could not load playlist: '+pr.error.message,true);return}
  episodes=er.data||[];existing=new Set((pr.data||[]).map(x=>x.episode_id).filter(Boolean));
  show.innerHTML='<option value="">All shows</option>';
  const ids=[...new Set(episodes.map(e=>e.show_id).filter(Boolean))];
  if(ids.length){const sr=await db.from('shows').select('id,title').in('id',ids);if(!sr.error)show.innerHTML+=[...(sr.data||[])].sort((a,b)=>String(a.title).localeCompare(String(b.title))).map(s=>`<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}
  selected.clear();render();
 }
 function filtered(){
  const q=search.value.trim().toLowerCase(),sid=show.value,st=status.value;
  return episodes.filter(e=>{
   if(sid&&e.show_id!==sid)return false;
   if(st&&e.status!==st)return false;
   if(playableOnly&&!playable(e))return false;
   if(!q)return true;
   return [e.title,e.description,e.slug].some(v=>String(v||'').toLowerCase().includes(q));
  });
 }
 function render(){
  const rows=filtered();
  epList.innerHTML=rows.length?rows.map(e=>{
   const inP=existing.has(e.id),sel=selected.has(e.id),canAdd=!inP&&playable(e);
   return `<label class="row ${sel?'selected':''}" style="grid-template-columns:auto 1fr"><input type="checkbox" data-id="${esc(e.id)}" ${sel?'checked':''} ${(!canAdd)?'disabled':''}><div><b>${esc(e.title||'Untitled')}</b> <span class="badge">S${esc(e.season_number??e.season??'—')} E${esc(e.episode_number??'—')}</span>${inP?'<span class="badge">Already in playlist</span>':''}${!playable(e)?'<span class="badge">No video URL</span>':''}<div class="muted">${esc(e.status||'draft')} · ${e.duration_seconds?Math.round(e.duration_seconds/60)+' min':'duration not set'} · ${esc(fmt(e.published_at||e.premiere_at||e.release_date))}</div></div></label>`
  }).join(''):'<div class="notice muted">No matching non-live episodes found.</div>';
  epCount.textContent=`${selected.size} selected`;
  epAdd.disabled=selected.size===0;
  epList.querySelectorAll('input[data-id]:not(:disabled)').forEach(x=>x.onchange=()=>{x.checked?selected.add(x.dataset.id):selected.delete(x.dataset.id);render()});
 }
 async function add(){
  const ids=[...selected],cid=active();if(!cid||!ids.length)return;
  epAdd.disabled=true;say(`Adding ${ids.length} on-demand episode${ids.length===1?'':'s'}…`);
  const {data:p,error:pe}=await db.from('tv_channel_playlist').select('playlist_position').eq('channel_id',cid).order('playlist_position',{ascending:false}).limit(1);
  if(pe){say('Could not determine playlist position: '+pe.message,true);epAdd.disabled=false;return}
  let pos=(p?.[0]?.playlist_position==null?-1:Number(p[0].playlist_position))+1;
  const payload=ids.filter(id=>!existing.has(id)).map(id=>({channel_id:cid,episode_id:id,playlist_position:pos++,enabled:true}));
  if(!payload.length){say('All selected episodes are already in this playlist.');return}
  const r=await db.from('tv_channel_playlist').insert(payload);
  if(r.error){say('Could not add episodes: '+r.error.message,true);epAdd.disabled=false;return}
  selected.clear();say(`Added ${payload.length} on-demand episode${payload.length===1?'':'s'} successfully.`);await load();
  setTimeout(()=>{modal.classList.add('hidden');if(typeof window.loadPage==='function')window.loadPage('playlists')},500);
 }
 btn.onclick=async()=>{modal.classList.remove('hidden');await load()};
 modal.querySelector('#epClose').onclick=()=>modal.classList.add('hidden');
 modal.querySelector('#epCancel').onclick=()=>modal.classList.add('hidden');
 modal.querySelector('#epAdd').onclick=add;
 search.oninput=render;show.onchange=render;status.onchange=render;
 playableBtn.onclick=()=>{playableOnly=!playableOnly;playableBtn.classList.toggle('primary',playableOnly);playableBtn.textContent=playableOnly?'Playable only ✓':'Playable only';render()};
 modal.querySelector('#epAll').onclick=()=>{filtered().filter(e=>!existing.has(e.id)&&playable(e)).forEach(e=>selected.add(e.id));render()};
 channel.addEventListener('change',()=>{btn.disabled=!channel.value});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();