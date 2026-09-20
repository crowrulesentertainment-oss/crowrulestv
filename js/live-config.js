/* CrowRules TV / CrowRules+ Custom HLS Live configuration.
   Never put RTMP/SRT ingest credentials in this file.
   Only public playback URLs belong here. */
window.CROWRULES_LIVE_CONFIG = {
  channels: [
    { slug:"crowrules-main", name:"CrowRules Main", description:"Primary CrowRules custom live channel.", sourceType:"custom_live", playbackType:"hls", playbackUrl:"", isLive:false, isFeatured:true },
    { slug:"tacoma-nights", name:"Tacoma Nights", description:"Tacoma-focused CrowRules live channel.", sourceType:"custom_live", playbackType:"hls", playbackUrl:"", isLive:false, isFeatured:false },
    { slug:"events", name:"CrowRules Events", description:"Live events and special broadcasts.", sourceType:"custom_live", playbackType:"hls", playbackUrl:"", isLive:false, isFeatured:false }
  ]
};
window.getCrowRulesLiveChannel = function(slug){
  return window.CROWRULES_LIVE_CONFIG.channels.find(c=>c.slug===slug)||null;
};
