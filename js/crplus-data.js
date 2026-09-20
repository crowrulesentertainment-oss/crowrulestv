/* CrowRules+ database bridge */
(function(){
"use strict";
window.CRP_DB=window.CRP_DB||{};
const db=()=>window.CROW_SUPABASE;
function map(row){
const m=row.metadata||{}, p=String(row.playback_type||"external").toLowerCase();
let type="uploaded", youtubeId=m.youtubeId||m.youtube_id||"";
if(p==="youtube"||p==="youtube_live")type=p; else if(p==="hls"||p==="custom_live")type="custom_live"; else if(!row.video_url&&youtubeId)type="youtube";
return {id:row.id,title:row.title,description:row.description||"",type,source:type==="uploaded"?"supabase":type==="custom_live"?"hls":"youtube",youtubeId,videoUrl:row.video_url||"",hlsUrl:m.hlsUrl||m.hls_url||m.playbackUrl||"",thumbnail:row.thumbnail_url||"",category:row.division_key||"CrowRules+",original:true,live:type==="youtube_live"||type==="custom_live"||m.live===true,isLive:m.isLive===true||m.is_live===true||m.status==="live",featured:row.is_featured===true,membership_level:row.membership_level||0,dbId:row.id};
}
CRP_DB.loadContent=async()=>{const c=db();if(!c)return[];const {data,error}=await c.from("crplus_content").select("*").order("is_featured",{ascending:false}).order("release_at",{ascending:false});if(error){console.warn("CrowRules+ content:",error.message);return[]}return(data||[]).map(map)};
CRP_DB.toggleMyList=async id=>{const c=db();if(!c||!id)return false;const {data:{user}}=await c.auth.getUser();if(!user)return false;const {data:e}=await c.from("crplus_my_list").select("content_id").eq("user_id",user.id).eq("content_id",id).maybeSingle();if(e){await c.from("crplus_my_list").delete().eq("user_id",user.id).eq("content_id",id);return false}const {error}=await c.from("crplus_my_list").insert({user_id:user.id,content_id:id});if(error){console.warn(error.message);return false}return true};
CRP_DB.saveWatch=async(id,pos,dur)=>{const c=db();if(!c||!id)return;const {data:{user}}=await c.auth.getUser();if(!user)return;const completed=dur>0&&pos>=Math.max(dur-15,0);await c.from("crplus_watch_history").upsert({user_id:user.id,content_id:id,position_seconds:Math.floor(pos||0),completed});await c.from("crplus_play_events").insert({user_id:user.id,content_id:id,event_type:completed?"completed":"progress",position_seconds:Math.floor(pos||0)})};
CRP_DB.getMembership=async()=>{const c=db();if(!c)return null;const {data,error}=await c.from("crplus_universal_membership").select("*").maybeSingle();if(error){console.warn("Membership:",error.message);return null}return data||null};
CRP_DB.refresh=async()=>{const rows=await CRP_DB.loadContent();if(rows.length){window.CRP_DATA=rows;if(window.CRP)window.CRP.items=rows}return rows};
})();