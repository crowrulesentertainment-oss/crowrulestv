/* CrowRules TV Admin — editable data workspaces.
   Uses the existing authenticated Supabase browser client. RLS remains authoritative. */
(()=>{
"use strict";
const A=window.CrowRulesAdminAuth;
if(!A||!A.client){console.warn("CrowRules TV editor: existing admin client not found.");return;}
const db=A.client;
const D={
channels:{title:"TV Channels",table:"tv_channels",pk:"id",fields:[
["channel_key","Channel key","text",1],["name","Name","text",1],["short_name","Short name"],["description","Description","textarea"],["logo_url","Logo URL","url"],["banner_url","Banner URL","url"],["stream_url","Stream URL","url"],["stream_type","Stream type"],["status","Status","select",0,["offline","online","maintenance"]],["current_title","Current title"],["current_show_id","Current show ID"],["current_episode_id","Current episode ID"],["sort_order","Sort order","number"],["is_featured","Featured","bool"],["is_active","Active","bool"]]},
catalog:{title:"Content Catalog",table:"crowrules_tv_catalog",pk:"id",fields:[
["catalog_key","Catalog key"],["slug","Slug"],["title","Title","text",1],["description","Description","textarea"],["year","Year","number"],["genre","Genre"],["runtime_minutes","Runtime minutes","number"],["runtime_seconds","Runtime seconds","number"],["rating","Rating"],["category","Category"],["content_type","Content type"],["license","License"],["license_url","License URL","url"],["source","Source"],["source_url","Source URL","url"],["stream_url","Stream URL","url"],["video_url","Video URL","url"],["thumbnail_url","Thumbnail URL","url"],["poster_url","Poster URL","url"],["is_featured","Featured","bool"],["is_active","Active","bool"],["is_published","Published","bool"],["sort_order","Sort order","number"],["metadata","Metadata JSON","json"],["production_id","Production ID"]]},
events:{title:"Network Events",table:"tv_events",pk:"id",fields:[
["title","Title","text",1],["slug","Slug","text",1],["description","Description","textarea"],["event_type","Event type"],["starts_at","Starts at","datetime",1],["ends_at","Ends at","datetime"],["timezone","Timezone"],["location","Location"],["stream_url","Stream URL","url"],["replay_url","Replay URL","url"],["thumbnail_url","Thumbnail URL","url"],["status","Status","select",0,["draft","scheduled","live","completed","cancelled"]],["is_featured","Featured","bool"],["is_published","Published","bool"]]},
settings:{title:"Network Settings",table:"tv_network_settings",pk:"id",fields:[
["setting_key","Setting key","text",1],["setting_value","Setting value / JSON","json"],["description","Description","textarea"],["is_public","Public","bool"],["is_active","Active","bool"]]},
schedule:{title:"Programming Schedule",table:"schedule_items",pk:"id",fields:[
["channel_id","TV channel UUID"],["show_id","Show UUID"],["title","Program title","text",1],["description","Description","textarea"],["content_type","Content type"],["content_id","Content UUID"],["start_time","Start time","datetime",1],["end_time","End time","datetime"],["duration_minutes","Duration minutes","number"],["is_live","Live program","bool"],["is_active","Active","bool"],["sort_order","Sort order","number"],["metadata","Metadata JSON","json"]]},
hosts:{title:"Remote Host Profiles",table:"tacoma_nights_remote_hosts",pk:"id",fields:[
["application_id","Application UUID"],["name","Name","text",1],["on_air_name","On-air name"],["email","Email","email",1],["location","Location"],["role","Role"],["team_status","Team status","select",0,["active","inactive","pending","paused","archived"]],["segment_interests","Segment interests","textarea"],["availability","Availability","textarea"],["internal_notes","Internal notes","textarea"],["user_id","Linked user UUID"]]},
applications:{title:"Remote Host Applications",table:"tacoma_nights_host_applications",pk:"id",fields:[
["name","Applicant name","text",1],["on_air_name","On-air name"],["email","Email","email",1],["location","Location","text",1],["availability","Availability","text",1],["format","Format","text",1],["interests","Interests","textarea",1],["experience","Experience","textarea"],["setup","Recording setup","textarea"],["why","Why join","textarea",1],["volunteer_acknowledgement","Volunteer acknowledgement","bool"],["contact_consent","Contact consent","bool"],["status","Application status","select",0,["new","reviewing","interview","approved","rejected","archived"]],["internal_notes","Internal notes","textarea"],["interview_at","Interview at","datetime"],["reviewed_at","Reviewed at","datetime"],["interview_confirmed","Interview confirmed","bool"],["follow_up_at","Follow-up at","datetime"],["follow_up_status","Follow-up status"],["interview_notes","Interview notes","textarea"],["segment_name_idea","Segment name idea"],["volunteer_positions","Volunteer positions JSON array","json"],["segment_categories","Segment categories JSON array","json"],["segment_frequency","Segment frequency"],["role_details","Role details","textarea"],["short_bio","Short bio","textarea"],["avatar_path","Avatar path"]]}
};
const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let active=null,records=[],editing=null,playlistOnly=false;
function install(){
 const map=[["channels","channels","Edit channel records"],["catalog","catalog","Edit every catalog field"],["events","events","Edit event records"],["playlists","playlists","Manage playlist definitions"],["schedule","schedule","Edit schedule entries"],["director","settings","Edit director/network settings"],["hosts","hosts","Manage host profiles"],["hosts","applications","Review/edit applications"],["system","settings","Edit all network settings"]];
 map.forEach(([view,key,label])=>{const section=$("view-"+view);if(!section)return;const head=section.querySelector(".section");if(!head||head.querySelector('[data-editor="'+key+'"]'))return;const b=document.createElement("button");b.className="btn";b.textContent=label;b.dataset.editor=key;head.appendChild(b);b.addEventListener("click",()=>open(key));});
 const p=$("view-playlists");if(p&&!p.querySelector("[data-playlist-create]")){const b=document.createElement("button");b.className="btn primary";b.textContent="＋ Create playlist";b.dataset.playlistCreate="1";const h=p.querySelector(".section");if(h)h.appendChild(b);b.addEventListener("click",()=>createPlaylist());}
}
function ensureModal(){
 if($("crEditModal"))return;
 const m=document.createElement("div");m.id="crEditModal";m.className="modal";m.innerHTML='<form class="dialog" id="crEditForm"><div class="eyebrow">CrowRules TV · Data editor</div><h2 id="crEditTitle">Edit records</h2><div class="tools"><input id="crEditSearch" placeholder="Filter records…"><span class="pill" id="crEditCount"></span></div><div id="crEditList"></div><div id="crEditFields" class="formgrid" hidden></div><div class="form-actions"><button class="btn" type="button" id="crEditClose">Close</button><button class="btn" type="button" id="crEditNew">＋ New record</button><button class="btn primary" type="submit" id="crEditSave" hidden>Save</button></div><div class="error" id="crEditError"></div></form>';
 document.body.appendChild(m);
 $("crEditClose").onclick=()=>m.classList.remove("open");
 $("crEditNew").onclick=()=>form(null);
 $("crEditSearch").oninput=renderList;
 $("crEditForm").onsubmit=save;
}
async function open(key){
 if($("app")?.hidden){alert("Administrator sign-in is required.");return;}
 active=key;playlistOnly=key==="playlists";editing=null;ensureModal();
 const d=D[key];$("crEditTitle").textContent=playlistOnly?"Playlist Definitions (tv_network_settings)":d.title;
 $("crEditError").textContent="";$("crEditFields").hidden=true;$("crEditSave").hidden=true;$("crEditNew").hidden=false;$("crEditList").innerHTML='<div class="empty">Loading records…</div>';$("crEditModal").classList.add("open");
 let q=db.from(playlistOnly?"tv_network_settings":d.table).select("*").limit(300);
 if(playlistOnly)q=q.like("setting_key","tv_playlist:%");
 const {data,error}=await q;
 if(error){$("crEditList").innerHTML='<div class="empty">Could not load records: '+esc(error.message)+'</div>';$("crEditError").textContent="Supabase/RLS response: "+error.message;records=[];return;}
 records=data||[];renderList();
}
function renderList(){
 const q=($("crEditSearch")?.value||"").toLowerCase(),filtered=records.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
 $("crEditCount").textContent=filtered.length+" records";
 if(!filtered.length){$("crEditList").innerHTML='<div class="empty">No records found. Use New record to add one.</div>';return;}
 const cols=playlistOnly?["setting_key","description","is_active"]:active==="settings"?["setting_key","description","is_active"]:active==="schedule"?["title","start_time","end_time","is_active"]:active==="hosts"?["name","on_air_name","email","team_status"]:active==="applications"?["name","email","status","created_at"]:active==="channels"?["channel_key","name","status","is_active"]:active==="catalog"?["title","category","content_type","is_active","is_published"]:["title","event_type","starts_at","status"];
 $("crEditList").innerHTML='<div class="table-wrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join("")+'<th>Actions</th></tr></thead><tbody>'+filtered.map((r,i)=>'<tr>'+cols.map(c=>'<td>'+esc(typeof r[c]==="object"?JSON.stringify(r[c]):r[c]??"—")+'</td>').join("")+'<td><div class="actions"><button type="button" class="btn" data-row-edit="'+i+'">Edit</button><button type="button" class="btn danger" data-row-delete="'+i+'">Delete</button></div></td></tr>').join("")+'</tbody></table></div>';
 $("crEditList").querySelectorAll("[data-row-edit]").forEach(b=>b.onclick=()=>form(filtered[+b.dataset.rowEdit]));
 $("crEditList").querySelectorAll("[data-row-delete]").forEach(b=>b.onclick=()=>remove(filtered[+b.dataset.rowDelete]));
}
function form(row){
 editing=row;const d=playlistOnly?D.settings:D[active];$("crEditList").hidden=true;$("crEditFields").hidden=false;$("crEditSave").hidden=false;$("crEditNew").hidden=true;$("crEditTitle").textContent=(row?"Edit ":"Create ")+(playlistOnly?"playlist definition":d.title);
 let fields=d.fields;
 if(playlistOnly){
   const sv=row?.setting_value||{};
   fields=[["setting_key","Playlist key (tv_playlist:channel:slug)","text",1],["description","Playlist name / description","text",1],["channel_key","CrowRules+ channel key","text",1],["youtube_url","YouTube playlist URL","url",1],["playback_order","Playback order","number"],["repeat","Repeat playlist","bool"],["shuffle","Shuffle playlist","bool"],["autoplay","Autoplay when channel opens","bool"],["fallback_mode","When unavailable","select",0,["standby","skip"]],["is_public","Publish to CrowRules+ player","bool"],["is_active","Enabled","bool"]];
   row={...(row||{}),channel_key:sv.channel_key||"cr-talk",youtube_url:sv.youtube_url||"",playback_order:sv.playback_order??0,repeat:sv.repeat!==false,shuffle:sv.shuffle===true,autoplay:sv.autoplay!==false,fallback_mode:sv.fallback_mode||"standby",is_public:row?.is_public!==false,is_active:row?.is_active!==false};
 }
 $("crEditFields").innerHTML=fields.map(([name,label,type="text",required=false,opts])=>{
 let v=row?.[name];if(v===undefined)v=type==="bool"?false:type==="json"?"{}":"";
 if(type==="datetime"&&v){const dt=new Date(v);v=new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 let input=type==="bool"?'<input type="checkbox" name="'+name+'" '+(v===true?"checked":"")+'/>':type==="select"?'<select name="'+name+'">'+opts.map(o=>'<option '+(v===o?"selected":"")+'>'+esc(o)+'</option>').join("")+'</select>':type==="textarea"||type==="json"?'<textarea name="'+name+'" '+(required?"required":"")+'>'+esc(type==="json"?(typeof v==="object"?JSON.stringify(v,null,2):v):v)+'</textarea>':'<input name="'+name+'" type="'+(type==="datetime"?"datetime-local":type)+'" value="'+esc(v??"")+'" '+(required?"required":"")+'/>';
 return '<div class="formfield '+(["json","textarea"].includes(type)?"wide":"")+'"><label>'+esc(label)+(required?" · REQUIRED":"")+'</label>'+input+'</div>';
 }).join("");
 $("crEditError").textContent="";
}
async function save(e){
 e.preventDefault();const d=playlistOnly?D.settings:D[active],payload={};
 for(const [name,label,type="text"] of (playlistOnly?[["setting_key","Key"],["description","Description"],["channel_key","Channel"],["youtube_url","YouTube playlist URL"],["playback_order","Playback order","number"],["repeat","Repeat","bool"],["shuffle","Shuffle","bool"],["autoplay","Autoplay","bool"],["fallback_mode","Fallback"],["is_public","Public","bool"],["is_active","Active","bool"]]:d.fields)){
 const el=e.target.elements[name];if(!el)continue;let v=type==="bool"?el.checked:el.value;
 if(type==="json"){try{v=v.trim()?JSON.parse(v):{};}catch(_){$("crEditError").textContent=label+" must be valid JSON.";return;}}
 if(type==="number")v=v===""?0:Number(v);
 if(type==="datetime")v=v?new Date(v).toISOString():null;
 if(v==="")v=null;
 payload[name]=v;
 }
 if(playlistOnly){
   const raw=String(payload.youtube_url||"").trim(),match=raw.match(/[?&]list=([A-Za-z0-9_-]+)/)||raw.match(/^([A-Za-z0-9_-]{10,})$/);
   if(!match){$("crEditError").textContent="Enter a valid YouTube playlist URL containing a list= playlist ID.";return;}
   const channel=String(payload.channel_key||"").trim();
   if(!channel){$("crEditError").textContent="Enter the CrowRules+ channel key.";return;}
   payload.setting_key="tv_playlist:"+channel+":"+String(payload.setting_key||"playlist").replace(/^tv_playlist:[^:]+:/,"").replace(/[^a-z0-9_-]+/gi,"-").toLowerCase();
   payload.setting_value={channel_key:channel,youtube_url:raw,youtube_playlist_id:match[1],playback_order:Number(payload.playback_order||0),repeat:payload.repeat!==false,shuffle:payload.shuffle===true,autoplay:payload.autoplay!==false,fallback_mode:payload.fallback_mode||"standby"};
   payload.is_public=payload.is_public!==false;
 }
 const table=playlistOnly?"tv_network_settings":d.table;
 const result=editing?await db.from(table).update(payload).eq(d.pk,editing[d.pk]):await db.from(table).insert(payload);
 if(result.error){$("crEditError").textContent="Save failed (existing RLS applies): "+result.error.message;return;}
 $("crEditFields").hidden=true;$("crEditList").hidden=false;$("crEditSave").hidden=true;$("crEditNew").hidden=false;
 await open(active);
}
async function remove(row){
 const d=playlistOnly?D.settings:D[active];if(!confirm("Delete this record? This cannot be undone."))return;
 const {error}=await db.from(playlistOnly?"tv_network_settings":d.table).delete().eq(d.pk,row[d.pk]);
 if(error){$("crEditError").textContent="Delete failed (existing RLS applies): "+error.message;return;}
 await open(active);
}
function createPlaylist(){
 active="playlists";playlistOnly=true;ensureModal();$("crEditModal").classList.add("open");$("crEditList").hidden=true;$("crEditFields").hidden=false;$("crEditSave").hidden=false;$("crEditNew").hidden=true;$("crEditTitle").textContent="Create playlist definition";
 editing=null;
 const seed={channel_key:"cr-talk",youtube_url:"",youtube_playlist_id:"",playback_order:0,repeat:true,shuffle:false,autoplay:true,fallback_mode:"standby"};
 form({setting_key:"tv_playlist:cr-talk:new-playlist",description:"New YouTube playlist",setting_value:seed,is_public:true,is_active:true});
 editing=null;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
window.CrowRulesTVDataEditor={open};
})();