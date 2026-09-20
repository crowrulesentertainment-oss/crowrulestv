const sb=supabase.createClient("https://cevylpnoexugwgygvtgu.supabase.co","sb_publishable_AdfM5y6RqvF3tbvEVzDZSg_JuGTQLD-");
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
let ceremonies=[],current=null,backstageTimer,directorHold=false,stateChannel,cueChannel,autoDirectorTimer;
async function emergencyState(id){const r=await sb.from("spectrum_ceremony_emergency_state").select("*").eq("ceremony_id",id).maybeSingle(); const el=document.getElementById("emergencyStatus"); if(el) el.textContent=r.data?(r.data.override_type.toUpperCase()+" · "+(r.data.message||"Override active")):"Normal production."; return r.data;}
async function setEmergency(type){if(!current)return; if(type==="clear"){await sb.from("spectrum_ceremony_overrides").update({active:false,cleared_at:new Date().toISOString()}).eq("ceremony_id",current.id).eq("active",true);}else{await sb.from("spectrum_ceremony_overrides").insert({ceremony_id:current.id,override_type:type,message:type==="blackout"?"Production blackout":type==="hold"?"Emergency hold":null,issued_by:(await sb.auth.getUser()).data.user.id});} await emergencyState(current.id); await emergencyState(current.id); await commandCenter(current.id);}
async function commandCenter(id){
 const r=await sb.from("spectrum_ceremony_run_of_show").select("*").eq("ceremony_id",id).order("sort_order",{ascending:true}); const ds=await sb.from("spectrum_ceremony_director_state").select("*").eq("ceremony_id",id).maybeSingle();
 const q=await sb.from("spectrum_ceremony_cues").select("*").eq("ceremony_id",id).order("cue_at",{ascending:true,nullsFirst:false}).order("sort_order");
 const rows=r.data||[], cues=q.data||[], now=Date.now();
 const live=rows.find(x=>x.starts_at&&now>=new Date(x.starts_at).getTime()&&(!x.ends_at||now<=new Date(x.ends_at).getTime()));
 const next=rows.find(x=>x.starts_at&&new Date(x.starts_at).getTime()>now);
 const nextCue=cues.find(x=>x.status==="standby"||x.status==="ready");
 const reveal=rows.find(x=>x.segment_type==="winner_reveal"&&x.starts_at&&new Date(x.starts_at).getTime()>now);
 const fmt=v=>{let s=Math.max(0,Math.floor(v/1000)),m=Math.floor(s/60);s%=60;return m+"m "+String(s).padStart(2,"0")+"s"};
 $("ccGrid").innerHTML='<article class="tvRowCard"><small>DIRECTOR STATE</small><h2>'+esc(ds.data?.runtime_state||"off_air").toUpperCase()+'</h2><p>'+(ds.data?.segment_title?esc(ds.data.segment_title):"No active segment")+'</p></article><article class="tvRowCard"><small>ON AIR</small><h2>'+(live?esc(live.title):"OFF AIR")+'</h2><p>'+(live?esc(live.segment_type.replaceAll("_"," ")): "No active segment")+'</p></article><article class="tvRowCard"><small>NEXT</small><h2>'+(next?esc(next.title):"—")+'</h2><p>'+(next?fmt(new Date(next.starts_at).getTime()-now):"—")+'</p></article><article class="tvRowCard"><small>NEXT CUE</small><h2>'+(nextCue?esc(nextCue.title):"—")+'</h2><p>'+(nextCue?esc(nextCue.cue_type.replaceAll("_"," ")): "No pending cue")+'</p></article><article class="tvRowCard"><small>NEXT WINNER REVEAL</small><h2>'+(reveal?esc(reveal.category_name||reveal.title):"—")+'</h2><p>'+(reveal?fmt(new Date(reveal.starts_at).getTime()-now):"—")+'</p></article>';
}
async function autoAdvance(){if(!current||directorHold||!$("autoDirector")?.checked)return; const r=await sb.rpc("spectrum_advance_run_of_show",{p_ceremony_id:current.id}); if(r.error)console.warn(r.error.message); else {commandCenter(current.id);}}
function director(){const state=$("directorState"),clock=$("directorClock");if(!state)return;state.textContent=directorHold?"HOLD":"LIVE CONTROL";clock.textContent=directorHold?"Production paused — resume when ready":"Production director online";$("holdBtn").onclick=()=>{directorHold=true;director();};$("resumeBtn").onclick=()=>{directorHold=false;director();};} async function init(){
 const u=await sb.auth.getUser();
 if(!u.data?.user)return $("studio").innerHTML='<div class="tvEmpty">Administrator sign-in required.</div>';
 const a=await sb.from("crplus_admins").select("is_active").eq("user_id",u.data.user.id).eq("is_active",true).maybeSingle();
 if(!a.data)return $("studio").innerHTML='<div class="tvEmpty">Administrator access required.</div>';
 const r=await sb.from("spectrum_ceremonies").select("id,title,award_id,starts_at,ends_at,stream_url,description,production_state").order("starts_at",{ascending:true});
 ceremonies=r.data||[];
 $("ceremony").innerHTML=ceremonies.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join("")||'<option value="">No ceremonies</option>';
 director(); if($("autoDirector")) $("autoDirector").onchange=()=>{clearInterval(autoDirectorTimer);if($("autoDirector").checked)autoDirectorTimer=setInterval(autoAdvance,1000);}; clearInterval(autoDirectorTimer); if($("autoDirector")?.checked)autoDirectorTimer=setInterval(autoAdvance,1000); if(ceremonies[0]){await load(ceremonies[0].id); commandCenter(ceremonies[0].id);} cueChannel=sb.channel("spectrum-admin-cues").on("postgres_changes",{event:"*",schema:"public",table:"spectrum_ceremony_cues"},()=>{if(current)commandCenter(current.id);}).subscribe(); stateChannel=sb.channel("spectrum-admin-state").on("postgres_changes",{event:"UPDATE",schema:"public",table:"spectrum_ceremonies"},payload=>{const x=payload.new; const i=ceremonies.findIndex(c=>c.id===x.id); if(i<0)return; ceremonies[i]={...ceremonies[i],...x}; if(current?.id===x.id){current={...current,...x}; if($("productionState"))$("productionState").value=x.production_state||"planning"; if($("directorState")){$("directorState").textContent=(x.production_state||"planning").toUpperCase();$("directorClock").textContent="Realtime state synchronized";} load(x.id);}}).subscribe();
}
$("ceremony").onchange=()=>{load($("ceremony").value);commandCenter($("ceremony").value)};
function dt(v){return v?new Date(v).toISOString().slice(0,16):""}
function editor(type,rows,a,b,c){
 return '<div class="grid">'+rows.map(x=>'<article class="tvRowCard"><input data-field="a" value="'+esc(x[a])+'"><input data-field="b" value="'+esc(x[b]||"")+'"><input data-field="c" value="'+esc(x[c]||"")+'"><button data-del="'+x.id+'" data-type="'+type+'" class="btn">Delete</button></article>').join("")+'<button class="btn" data-add="'+type+'">+ Add</button></div>';
}
async function load(id){
 current=ceremonies.find(c=>c.id===id); if($("productionState")){ $("productionState").value=current.production_state||"planning"; const h=await sb.from("spectrum_ceremony_state_history").select("from_state,to_state,note,created_at").eq("ceremony_id",id).order("created_at",{ascending:false}).limit(8); $("stateHistory").innerHTML=(h.data?.length?h.data.map(x=>"<p><strong>"+esc(x.to_state)+"</strong> · "+new Date(x.created_at).toLocaleString()+" · "+esc(x.note||"")+"</p>").join(""):"No state history."); $("stateSave").onclick=async()=>{const r=await sb.rpc("spectrum_set_ceremony_state",{p_ceremony_id:id,p_to_state:$("productionState").value,p_note:$("stateNote").value||null}); if(r.error)alert(r.error.message); else load(id);}; }
 clearInterval(backstageTimer);
 const cueBox=async()=>{
  const r=await sb.from("spectrum_ceremony_cues").select("*").eq("ceremony_id",id).order("cue_at",{ascending:true,nullsFirst:false}).order("sort_order");
  const rows=r.data||[];
  const labels={standby:"STANDBY",ready:"READY",active:"ACTIVE",complete:"COMPLETE",cancelled:"CANCELLED"};
  $("backstageBody").insertAdjacentHTML("beforeend",'<div class="tvRowTitle">Production Cues</div><div class="grid">'+(rows.length?rows.map(x=>'<article class="tvRowCard"><small>'+esc(x.cue_type.replaceAll("_"," "))+' · '+esc(labels[x.status]||x.status)+'</small><h2>'+esc(x.title)+'</h2><p>'+esc(x.instruction||"")+'</p><button class="btn" data-cue="'+x.id+'" data-status="'+(x.status==="active"?"complete":"active")+'">'+(x.status==="active"?"Complete Cue":"GO")+'</button></article>').join(""):'<div class="tvEmpty">No production cues configured.</div>')+'</div><button class="btn" id="addCue">+ Add Cue</button>';
  document.querySelectorAll("[data-cue]").forEach(b=>b.onclick=async()=>{await sb.rpc("spectrum_fire_cue",{p_cue_id:b.dataset.cue,p_status:b.dataset.status});cueBox()});
  $("addCue").onclick=async()=>{await sb.from("spectrum_ceremony_cues").insert({ceremony_id:id,title:"New Production Cue",cue_type:"custom",status:"standby",sort_order:rows.length});cueBox()};
 };
 await cueBox();
 const refreshBackstage=async()=>{
  const r=await sb.from("spectrum_ceremony_run_of_show").select("*").eq("ceremony_id",id).order("sort_order",{ascending:true});
  const rows=r.data||[], now=Date.now(), live=rows.find(x=>x.starts_at&&now>=new Date(x.starts_at).getTime()&&(!x.ends_at||now<=new Date(x.ends_at).getTime())), next=rows.find(x=>x.starts_at&&new Date(x.starts_at).getTime()>now);
  const winner=rows.find(x=>x.segment_type==="winner_reveal"&&x.starts_at&&new Date(x.starts_at).getTime()>now);
  const fmtMs=v=>{let s=Math.max(0,Math.floor(v/1000)),m=Math.floor(s/60);s%=60;return m+"m "+String(s).padStart(2,"0")+"s"};
  $("backstageBody").innerHTML='<div class="grid"><article class="tvRowCard"><small>ON AIR</small><h2>'+(live?esc(live.title):"OFF AIR")+'</h2><p>'+(live?esc(live.segment_type.replaceAll("_"," ")): "No segment is active")+'</p></article><article class="tvRowCard"><small>NEXT</small><h2>'+(next?esc(next.title):"—")+'</h2><p>'+(next?fmtMs(new Date(next.starts_at).getTime()-now):"No upcoming segment")+'</p></article><article class="tvRowCard"><small>NEXT WINNER REVEAL</small><h2>'+(winner?esc(winner.category_name||winner.title):"—")+'</h2><p>'+(winner?fmtMs(new Date(winner.starts_at).getTime()-now):"No reveal scheduled")+'</p></article></div>';
 };
 refreshBackstage(); backstageTimer=setInterval(refreshBackstage,1000); const board=(await sb.from("spectrum_ceremony_production_board").select("*").eq("ceremony_id",id).maybeSingle()).data||{};
 const [seg,pre,perf,media]=await Promise.all([
  sb.from("spectrum_ceremony_segments").select("*").eq("ceremony_id",id).order("sort_order",{ascending:true}),
  sb.from("spectrum_presenters").select("*").eq("ceremony_id",id).order("sort_order",{ascending:true}),
  sb.from("spectrum_performers").select("*").eq("ceremony_id",id).order("sort_order"),
  sb.from("spectrum_media").select("*").eq("ceremony_id",id).order("release_at")
 ]);
 $("studio").innerHTML='<div class="grid"><article class="tvRowCard"><strong>Production Board</strong><p>Segments: '+(board.segments??0)+' · Published: '+(board.published_segments??0)+' · Winner Reveals: '+(board.winner_reveals??0)+' · Presenters: '+(board.presenters??0)+' · Performers: '+(board.performers??0)+' · Media: '+(board.media??0)+'</p></article></div><div class="grid"><label>Title<input id="title" value="'+esc(current.title)+'"></label><label>Start<input id="start" type="datetime-local" value="'+dt(current.starts_at)+'"></label><label>End<input id="end" type="datetime-local" value="'+dt(current.ends_at)+'"></label><label>Stream URL<input id="stream" value="'+esc(current.stream_url||"")+'"></label></div><label>Description<textarea id="desc" rows="3">'+esc(current.description||"")+'</textarea></label><button class="btn primary" id="save">Save Ceremony</button><hr><div class="tvRowTitle">Segments</div>'+editor("segments",seg.data||[],"title","segment_type","sort_order")+'<div class="tvRowTitle">Presenters</div>'+editor("presenters",pre.data||[],"name","role","sort_order")+'<div class="tvRowTitle">Performers</div>'+editor("performers",perf.data||[],"name","role","sort_order")+'<div class="tvRowTitle">Media</div>'+editor("media",media.data||[],"title","media_type","release_at");
 wire(id);
}
async function wire(id){
 $("save").onclick=async()=>{
  const r=await sb.from("spectrum_ceremonies").update({title:$("title").value,starts_at:$("start").value?new Date($("start").value).toISOString():null,ends_at:$("end").value?new Date($("end").value).toISOString():null,stream_url:$("stream").value||null,description:$("desc").value||null}).eq("id",id);
  alert(r.error?r.error.message:"Ceremony saved.");
 };
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
  const table={segments:"spectrum_ceremony_segments",presenters:"spectrum_presenters",performers:"spectrum_performers",media:"spectrum_media"}[b.dataset.type];
  const r=await sb.from(table).delete().eq("id",b.dataset.del); if(r.error)alert(r.error.message);else load(id);
 });
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=async()=>{
  const table={segments:"spectrum_ceremony_segments",presenters:"spectrum_presenters",performers:"spectrum_performers",media:"spectrum_media"}[b.dataset.add];
  const row={ceremony_id:id,sort_order:99};
  if(b.dataset.add==="segments")Object.assign(row,{title:"New Segment",segment_type:"other"});
  if(b.dataset.add==="presenters"||b.dataset.add==="performers")Object.assign(row,{name:"New Person",role:""});
  if(b.dataset.add==="media")Object.assign(row,{title:"New Media",media_type:"highlight"});
  const r=await sb.from(table).insert(row);if(r.error)alert(r.error.message);else load(id);
 });
}
init();