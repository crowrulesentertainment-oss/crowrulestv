const sb=supabase.createClient("https://cevylpnoexugwgygvtgu.supabase.co","sb_publishable_AdfM5y6RqvF3tbvEVzDZSg_JuGTQLD-");
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const statuses=["submitted","under_review","eligible","ineligible","consideration","official_nominee","withdrawn","archived"];
let awards=[],categories=[],submissions=[],current=null;
const $=id=>document.getElementById(id);
async function init(){
 const u=await sb.auth.getUser();
 if(!u.data?.user){$("gate").innerHTML='<div class="tvRowTitle">Access denied</div><div class="tvEmpty">Sign in with an administrator account to continue.</div>';return}
 const a=await sb.from("crplus_admins").select("role,is_active").eq("user_id",u.data.user.id).eq("is_active",true).maybeSingle();
 if(a.error||!a.data){$("gate").innerHTML='<div class="tvRowTitle">Access denied</div><div class="tvEmpty">This account is not an active CrowRules+ administrator.</div>';return}
 $("gate").innerHTML='<div class="tvRowTitle">Administrator access granted</div><p>Role: <strong>'+esc(a.data.role)+'</strong></p>';
 $("app").hidden=false; await Promise.all([loadAwards(),loadSubmissions(),loadCeremonies()]);
}
async function loadAwards(){
 const r=await sb.from("spectrum_awards").select("id,award_year,title,status").neq("status","archived").order("award_year",{ascending:false});
 awards=r.data||[];$("awardFilter").innerHTML='<option value="">All award years</option>'+awards.map(a=>'<option value="'+a.id+'">'+esc(a.award_year)+' · '+esc(a.title)+'</option>').join("");
 $("editAward").innerHTML='<option value="">Select award</option>'+awards.map(a=>'<option value="'+a.id+'">'+esc(a.award_year)+' · '+esc(a.title)+'</option>').join("");
 await loadCategories();
}
async function loadCategories(){
 const r=await sb.from("spectrum_categories").select("id,award_id,name,description,sort_order").order("sort_order");
 categories=r.data||[]; fillCategories("");
}
function fillCategories(awardId,selected=""){
 const list=categories.filter(c=>!awardId||c.award_id===awardId);
 $("editCategory").innerHTML='<option value="">Select category</option>'+list.map(c=>'<option value="'+c.id+'" '+(c.id===selected?"selected":"")+'>'+esc(c.name)+'</option>').join("");
}
async function loadSubmissions(){
 let q=sb.from("spectrum_submissions").select("id,user_id,title,description,submission_type,status,submitter_note,award_id,category_id,project_id,content_id,reviewed_by,reviewed_at,created_at,spectrum_awards(award_year,title),spectrum_categories(name)").order("created_at",{ascending:false});
 const status=$("statusFilter").value, award=$("awardFilter").value;
 if(status)q=q.eq("status",status);if(award)q=q.eq("award_id",award);
 const r=await q; submissions=r.data||[];
 $("queue").innerHTML=r.error?'<div class="tvEmpty">'+esc(r.error.message)+'</div>':submissions.length?submissions.map(x=>'<button class="tvRowCard" data-id="'+x.id+'"><strong>'+esc(x.title)+'</strong><small>'+esc(x.status.replaceAll("_"," "))+' · '+esc(x.spectrum_awards?.award_year||"No year")+'</small><p>'+esc(x.spectrum_categories?.name||"Category unassigned")+'</p></button>').join(""):'<div class="tvEmpty">No submissions match the current filters.</div>';
 document.querySelectorAll("#queue [data-id]").forEach(b=>b.onclick=()=>openSubmission(b.dataset.id));
}
async function openSubmission(id){
 current=submissions.find(x=>x.id===id);if(!current)return;
 $("editor").hidden=false;$("details").innerHTML='<article class="panel"><h3>'+esc(current.title)+'</h3><p>'+esc(current.description||"")+'</p><p class="muted">'+esc(current.submission_type)+' · submitted '+esc(new Date(current.created_at).toLocaleString())+'</p><p><strong>Submitter note:</strong> '+esc(current.submitter_note||"—")+'</p></article>';
 $("editStatus").innerHTML=statuses.map(s=>'<option '+(s===current.status?"selected":"")+'>'+s+'</option>').join("");
 $("editAward").value=current.award_id||"";fillCategories(current.award_id||"",current.category_id||"");$("reviewNote").value="";
 const h=await sb.from("spectrum_submission_reviews").select("from_status,to_status,note,created_at,spectrum_categories!spectrum_submission_reviews_to_category_id_fkey(name)").eq("submission_id",id).order("created_at",{ascending:false});
 $("history").innerHTML='<div class="tvRowTitle">Review History</div>'+((h.data||[]).length?(h.data||[]).map(x=>'<div class="tvRowCard"><strong>'+esc(x.from_status||"new")+' → '+esc(x.to_status)+'</strong><small>'+esc(new Date(x.created_at).toLocaleString())+'</small><p>'+esc(x.note||"No note")+'</p></div>').join(""):'<div class="tvEmpty">No review history yet.</div>');
 window.scrollTo({top:$("editor").offsetTop-20,behavior:"smooth"});
}
$("editAward").onchange=()=>fillCategories($("editAward").value,"");
$("statusFilter").onchange=loadSubmissions;$("awardFilter").onchange=loadSubmissions;
$("closeEditor").onclick=()=>{$("editor").hidden=true;current=null};
$("saveReview").onclick=async()=>{
 if(!current)return;
 const u=await sb.auth.getUser(), status=$("editStatus").value, awardId=$("editAward").value||null, categoryId=$("editCategory").value||null, note=$("reviewNote").value.trim()||null;
 const up=await sb.from("spectrum_submissions").update({status,award_id:awardId,category_id:categoryId,reviewed_by:u.data.user.id,reviewed_at:new Date().toISOString()}).eq("id",current.id);
 if(up.error){alert(up.error.message);return}
 const ins=await sb.from("spectrum_submission_reviews").insert({submission_id:current.id,reviewer_user_id:u.data.user.id,from_status:current.status,to_status:status,from_category_id:current.category_id||null,to_category_id:categoryId,note});
 if(ins.error){alert("Submission saved, but review history could not be recorded: "+ins.error.message)} else alert("Review saved.");
 await loadSubmissions();current=submissions.find(x=>x.id===current.id)||current;openSubmission(current.id);
};
$("promote").onclick=async()=>{
 if(!current)return;
 if(!["official_nominee","consideration"].includes($("editStatus").value)){alert("Advance the submission to consideration or official_nominee first.");return}
 const awardId=$("editAward").value||current.award_id, categoryId=$("editCategory").value||current.category_id;
 if(!awardId||!categoryId){alert("Assign an award and category first.");return}
 const exists=await sb.from("spectrum_nominees").select("id").eq("award_id",awardId).eq("category_id",categoryId).eq("name",current.title).maybeSingle();
 if(exists.data){alert("A matching nominee already exists.");return}
 const r=await sb.from("spectrum_nominees").insert({award_id:awardId,category_id:categoryId,name:current.title,description:current.description,project_id:current.project_id,content_id:current.content_id,creator_user_id:current.user_id,status:"official"}).select("id").single();
 if(r.error){alert(r.error.message);return}
 await sb.from("spectrum_submissions").update({status:"official_nominee",reviewed_by:(await sb.auth.getUser()).data.user.id,reviewed_at:new Date().toISOString()}).eq("id",current.id);
 alert("Official nominee created.");await loadSubmissions();openSubmission(current.id);
};
async function loadCeremonies(){
 const r=await sb.from("spectrum_ceremonies").select("id,title,starts_at,ends_at,stream_url,spectrum_awards(award_year,title)").order("starts_at",{ascending:true});
 $("ceremonies").innerHTML=r.error?'<div class="tvEmpty">'+esc(r.error.message)+'</div>':(r.data||[]).length?(r.data||[]).map(c=>'<article class="tvRowCard"><strong>'+esc(c.title)+'</strong><small>'+esc(c.spectrum_awards?.award_year||"")+'</small><p>'+esc(c.starts_at?new Date(c.starts_at).toLocaleString():"Date TBD")+'</p><span>'+ (c.stream_url?"Stream configured":"Stream not configured") +'</span></article>').join(""):'<div class="tvEmpty">No ceremonies scheduled yet.</div>';
}
init();