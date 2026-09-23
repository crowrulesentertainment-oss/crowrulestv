/* CrowRules+ Personalization Engine v2 — profile-aware */
(() => {
  "use strict";
  const state={user:null,profile:null,history:[],list:[]};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  async function init(supabase){
    const ctx=await CrowProfileContext.resolve(supabase);
    state.user=ctx.user; state.profile=ctx.profile;
    if(!state.user||!state.profile) return state;
    const [h,l]=await Promise.all([
      supabase.from("crplus_watch_history").select("content_id,position_seconds,completed,last_watched_at").eq("user_id",state.user.id).eq("profile_id",state.profile.id).order("last_watched_at",{ascending:false}).limit(50),
      supabase.from("crplus_my_list").select("content_id,created_at").eq("user_id",state.user.id).eq("profile_id",state.profile.id).order("created_at",{ascending:false}).limit(100)
    ]);
    state.history=h.data||[]; state.list=l.data||[];
    return state;
  }
  function allowed(c){
    if(!state.profile?.is_kids) return true;
    const r=String(c.age_rating||"").toUpperCase();
    return ["G","TV-G","TV-Y","TV-Y7","Y","Y7","PG"].includes(r);
  }
  async function catalog(supabase){
    const r=await supabase.from("crplus_content").select("id,title,slug,description,thumbnail_url,backdrop_url,content_type,division_key,release_at,is_featured,age_rating,tags,duration_seconds,season_number,episode_number,show_id").eq("is_published",true).order("release_at",{ascending:false}).limit(500);
    return (r.data||[]).filter(allowed);
  }
  function score(c){
    let s=(c.is_featured?4:0);
    const tags=(c.tags||[]).map(String).map(x=>x.toLowerCase());
    for(const h of state.history){
      if(h.content_id===c.id) s+=12;
    }
    for(const l of state.list) if(l.content_id===c.id) s+=8;
    if(state.profile?.is_kids) s+=allowed(c)?2:-100;
    s+=tags.length?Math.min(tags.length,4):0;
    return s;
  }
  function rank(items){return [...items].sort((a,b)=>score(b)-score(a)||new Date(b.release_at||0)-new Date(a.release_at||0));}
  window.CrowPersonalizationV2={state,init,catalog,rank,allowed};
})();