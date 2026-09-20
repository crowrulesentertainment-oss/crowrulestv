/* CrowRules Universal HLS Player */
(function(){
"use strict";
window.CrowRulesHLS={
 attach(video,streamUrl,options={}){
  if(!video||!streamUrl) throw new Error("A video element and HLS playback URL are required.");
  const status=options.statusElement||null;
  const setStatus=(m,s)=>{if(status){status.textContent=m;status.dataset.state=s||"";}};
  setStatus("Connecting to live stream…","connecting");
  if(window.Hls&&window.Hls.isSupported()){
   const hls=new window.Hls({enableWorker:true,lowLatencyMode:true,backBufferLength:30,liveSyncDurationCount:3,liveMaxLatencyDurationCount:6});
   hls.loadSource(streamUrl); hls.attachMedia(video);
   hls.on(window.Hls.Events.MANIFEST_PARSED,()=>{setStatus("LIVE","live");video.play().catch(()=>{});});
   hls.on(window.Hls.Events.ERROR,(_e,data)=>{
    if(!data.fatal)return;
    setStatus("Stream connection lost — retrying…","error");
    if(data.type===window.Hls.ErrorTypes.NETWORK_ERROR)hls.startLoad();
    else if(data.type===window.Hls.ErrorTypes.MEDIA_ERROR)hls.recoverMediaError();
    else hls.destroy();
   });
   return {destroy:()=>hls.destroy()};
  }
  if(video.canPlayType("application/vnd.apple.mpegurl")){
   video.src=streamUrl;
   video.addEventListener("loadedmetadata",()=>{setStatus("LIVE","live");video.play().catch(()=>{});},{once:true});
   video.addEventListener("error",()=>setStatus("Unable to play this live stream.","error"));
   return {destroy:()=>{video.pause();video.removeAttribute("src");video.load();}};
  }
  setStatus("This browser does not support HLS playback.","error");
  throw new Error("HLS is not supported by this browser.");
 }
};
})();
