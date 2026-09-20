const sb=supabase.createClient("https://cevylpnoexugwgygvtgu.supabase.co","sb_publishable_AdfM5y6RqvF3tbvEVzDZSg_JuGTQLD-");
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
let ceremonies=[],current=null;
async function init(){
 const u=await sb.auth.getUser();
 if(!u.data?.user)return $("studio").innerHTML='<div class="tvEmpty">Administrator sign-in required.</div>';
 const a=await sb.from("crplus_admins").select("is_active").eq("user_id",u.data.user.id).eq("is_active",true).maybeSingle();
 if(!a.data)return $("studio").innerHTML='<div class="tvEmpty">Administrator access required.</div>';
 const r=await sb.from("spectrum_ceremonies").select("id,title,award_id,starts_at,ends_at,stream_url,description").order("starts_at",{ascending:true});
 ceremonies=r.data||[];
 $("ceremony").innerHTML=ceremonies.map(c=>'<option value="'+c.id+'">'+esc(c.title)+'</option>').join("")||'<option value="">No ceremonies</option>';
 if(ceremonies[0])await load(ceremonies[0].id);
}
$("ceremony").onchange=()=>load($("ceremony").value);
function dt(v){return v?new Date(v).toISOString().slice(0,16):""}
function editor(type,rows,a,b,c){
 return '<div class="grid">'+rows.map(x=>'<article class="tvRowCard"><input data-field="a" value="'+esc(x[a])+'"><input data-field="b" value="'+esc(x[b]||"")+'"><input data-field="c" value="'+esc(x[c]||"")+'"><button data-del="'+x.id+'" data-type="'+type+'" class="btn">Delete</button></article>').join("")+'<button class="btn" data-add="'+type+'">+ Add</button></div>';
}
async function load(id){
 current=ceremonies.find(c=>c.id===id);
 const [seg,pre,perf,media]=await Promise.all([
  sb.from("spectrum_ceremony_segments").select("*").eq("ceremony_id",id).order("sort_order"),
  sb.from("spectrum_presenters").select("*").eq("ceremony_id",id).order("sort_order"),
  sb.from("spectrum_performers").select("*").eq("ceremony_id",id).order("sort_order"),
  sb.from("spectrum_media").select("*").eq("ceremony_id",id).order("release_at")
 ]);
 $("studio").innerHTML='<div class="grid"><label>Title<input id="title" value="'+esc(current.title)+'"></label><label>Start<input id="start" type="datetime-local" value="'+dt(current.starts_at)+'"></label><label>End<input id="end" type="datetime-local" value="'+dt(current.ends_at)+'"></label><label>Stream URL<input id="stream" value="'+esc(current.stream_url||"")+'"></label></div><label>Description<textarea id="desc" rows="3">'+esc(current.description||"")+'</textarea></label><button class="btn primary" id="save">Save Ceremony</button><hr><div class="tvRowTitle">Segments</div>'+editor("segments",seg.data||[],"title","segment_type","sort_order")+'<div class="tvRowTitle">Presenters</div>'+editor("presenters",pre.data||[],"name","role","sort_order")+'<div class="tvRowTitle">Performers</div>'+editor("performers",perf.data||[],"name","role","sort_order")+'<div class="tvRowTitle">Media</div>'+editor("media",media.data||[],"title","media_type","release_at");
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