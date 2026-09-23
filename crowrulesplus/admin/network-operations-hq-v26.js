const sb=window.supabaseClient||window.supabase;
const $=id=>document.getElementById(id);
let events=[],channels=[],seen=new Set(),timer=null;

async function boot(){
  if(!sb){$('status').textContent='Supabase client unavailable.';return}
  const {data:{user}}=await sb.auth.getUser();
  if(!user){$('status').textContent='Authentication required.';return}
  const {data:admin}=await sb.rpc('crplus_is_admin');
  if(admin!==true){$('status').textContent='Admin access required.';return}
  await load(); subscribe(); $('status').innerHTML='<span class="online">● REALTIME CORRELATION BUS ONLINE</span> • reconciliation every 120s';
  timer=setInterval(load,120000);
}
async function load(){
  const [e,c]=await Promise.all([
    sb.from('crplus_command_events').select('*').order('last_seen_at',{ascending:false}).limit(100),
    sb.from('crplus_live_channels').select('id,name,channel_key')
  ]);
  if(e.error){$('status').textContent=e.error.message;return}
  events=e.data||[]; channels=c.data||[]; render();
}
function channelName(id){return channels.find(x=>x.id===id)?.name||'Network-wide'}
function render(){
  const active=events.filter(x=>x.status!=='resolved');
  const occ=active.reduce((n,x)=>n+(x.occurrence_count||1),0);
  $('mActive').textContent=active.length;
  $('mOcc').textContent=occ;
  $('mGroups').textContent=active.filter(x=>x.correlation_key).length;
  $('mRatio').textContent=active.length?((1-(active.length/Math.max(occ,1)))*100).toFixed(0)+'%':'0%';
  $('alerts').innerHTML=active.length?active.map(alertHTML).join(''):'<div class="empty">No active correlated alerts.</div>';
  $('timeline').innerHTML=events.slice(0,14).map(x=>`<div class="item"><div class="row"><strong class="sev-${x.severity}">${esc(x.title)}</strong><span class="pill">${esc(x.status)}</span></div><div class="small">${esc(channelName(x.channel_id))} • ${fmt(x.last_seen_at)} • ×${x.occurrence_count||1}</div></div>`).join('')||'<div class="empty">No events.</div>';
}
function alertHTML(x){
 return `<div class="item ${x.severity==='critical'?'critical':x.severity==='warning'?'warning':''}">
 <div class="row"><div><strong class="sev-${x.severity}">${esc(x.title)}</strong> <span class="pill">${esc(x.severity)}</span></div><span class="pill">×${x.occurrence_count||1}</span></div>
 <div style="margin:8px 0">${esc(x.message)}</div>
 <div class="small">Channel: ${esc(channelName(x.channel_id))} • First seen: ${fmt(x.first_seen_at)} • Last seen: ${fmt(x.last_seen_at)}</div>
 <div class="small">Correlation: <code>${esc(x.correlation_key||'unassigned')}</code></div>
 <div class="actions" style="margin-top:9px">${x.status==='new'?'<button onclick="ack(\''+x.id+'\')">ACKNOWLEDGE</button>':''}<button onclick="resolveEvent(\''+x.id+'\')">RESOLVE</button></div></div>`;
}
async function ack(id){const {error}=await sb.rpc('crplus_acknowledge_command_event',{p_event_id:id});if(error)alert(error.message);else await load()}
async function resolveEvent(id){const note=prompt('Resolution note:','Resolved by operator');if(note===null)return;const {error}=await sb.rpc('crplus_resolve_command_event',{p_event_id:id,p_resolution:note});if(error)alert(error.message);else await load()}
async function ingest(source,row){
 const mapped=map(source,row); if(!mapped)return;
 const key=mapped.key+'';
 const fingerprint=source+':'+(row.id||row.channel_id||'na')+':'+(row.status||row.severity||row.event_type||'');
 if(seen.has(fingerprint))return; seen.add(fingerprint);
 const {error}=await sb.rpc('crplus_ingest_command_event',{
   p_correlation_key:key,p_event_key:fingerprint,p_source_table:source,p_source_id:row.id||null,
   p_channel_id:row.channel_id||null,p_incident_id:row.incident_id||null,p_severity:mapped.severity,
   p_title:mapped.title,p_message:mapped.message,p_metadata:{source_event:fingerprint}
 });
 if(error)console.warn('correlation ingest',error.message);
 else await load();
}
function map(t,r){
 if(t==='crplus_command_events')return null;
 if(t==='crplus_network_incidents'&&r.status==='open')return {key:'incident:'+r.id,title:'Incident: '+r.incident_type,message:r.message,severity:r.severity||'warning'};
 if(t==='crplus_recovery_actions'&&['failed','approved','recommended'].includes(r.status))return {key:'incident:'+r.incident_id,title:'Recovery '+r.status,message:'Recovery action '+r.action+' is '+r.status,severity:r.status==='failed'?'critical':'warning'};
 if(t==='crplus_recovery_escalations'&&r.status!=='resolved')return {key:'incident:'+r.incident_id,title:'Recovery escalation L'+r.level,message:r.message||r.reason||'Recovery escalation active',severity:'critical'};
 if(t==='crplus_stream_health'&&['offline','degraded'].includes(r.status))return {key:'channel-health:'+r.channel_id,title:'Stream '+r.status,message:r.message||('Channel stream is '+r.status),severity:r.status==='offline'?'critical':'warning'};
 if(t==='crplus_network_operations'&&r.status==='attention')return {key:'network-operation:'+r.id,title:'Network operation attention',message:(r.details&&r.details.message)||'Operator attention required',severity:'warning'};
 if(t==='crplus_automation_runs'&&['failed','attention'].includes(r.status))return {key:'automation:'+r.id,title:'Automation '+r.status,message:(r.details&&r.details.message)||r.action||'Automation requires attention',severity:r.status==='failed'?'critical':'warning'};
 return null;
}
function subscribe(){
 ['crplus_network_incidents','crplus_recovery_actions','crplus_recovery_escalations','crplus_stream_health','crplus_network_operations','crplus_automation_runs'].forEach(table=>{
   sb.channel('v26-'+table).on('postgres_changes',{event:'*',schema:'public',table},p=>ingest(table,p.new||p.old||{})).subscribe();
 });
}
function fmt(v){return v?new Date(v).toLocaleString(): '—'}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
boot();