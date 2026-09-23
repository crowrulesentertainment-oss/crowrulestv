/* CrowRules+ Watch Profile Adapter v2 */
(() => {
  "use strict";
  async function init(supabase){
    const ctx=await CrowProfileContext.resolve(supabase);
    if(!ctx.user||!ctx.profile) return ctx;
    window.CrowPlusUser=ctx.user;
    window.CrowPlusProfile=ctx.profile;
    return ctx;
  }
  async function saveProgress(supabase,contentId,positionSeconds,durationSeconds){
    const ctx=await CrowProfileContext.resolve(supabase);
    if(!ctx.user||!ctx.profile||!contentId) return;
    const completed=durationSeconds>0 && positionSeconds/durationSeconds>=.9;
    const payload={user_id:ctx.user.id,profile_id:ctx.profile.id,content_id:contentId,position_seconds:Math.max(0,Math.floor(positionSeconds||0)),completed,last_watched_at:new Date().toISOString()};
    const q=supabase.from("crplus_watch_history").upsert(payload,{onConflict:"profile_id,content_id"});
    const {error}=await q;
    if(error) console.warn("CrowRules+ progress save:",error.message);
  }
  window.CrowWatchProfileV2={init,saveProgress};
})();