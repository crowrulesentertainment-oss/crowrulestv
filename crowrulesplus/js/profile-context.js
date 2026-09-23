/* CrowRules+ Profile Context v1 — shared active-profile helper */
(() => {
  "use strict";
  const KEY="crplus_active_profile";
  const getId=()=>localStorage.getItem(KEY);
  const set=(profile)=>{ if(profile?.id) localStorage.setItem(KEY,profile.id); return profile; };
  async function resolve(supabase){
    const {data,error}=await supabase.auth.getUser();
    if(error||!data?.user) return {user:null,profile:null};
    let q=supabase.from("crplus_profiles").select("*").eq("user_id",data.user.id);
    const stored=getId();
    if(stored) q=q.eq("id",stored);
    let {data:profiles}=await q.limit(1);
    let profile=profiles?.[0]||null;
    if(!profile){
      const r=await supabase.from("crplus_profiles").select("*").eq("user_id",data.user.id).order("is_default",{ascending:false}).order("created_at",{ascending:true}).limit(1);
      profile=r.data?.[0]||null;
    }
    if(profile) set(profile);
    return {user:data.user,profile};
  }
  window.CrowProfileContext={KEY,getId,set,resolve};
})();