/* CrowRules Unified Core v1.2
   Shared Supabase integration for every CrowRules branch.
   Public client key only; never place a service-role key in browser code.
   TV/Admin bridge: Public TV reads the same canonical Supabase records
   managed by Admin Pro and can refresh when schedule/channel/playlist data changes. */
(function(){
  'use strict';

  const SUPABASE_URL='https://zauxdqyssratvzmomozf.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_-Z6wecSOxwOk6IBut2zLnw_8DfRxnE9';
  const ADMIN_PRO_URL='https://crowrulesentertainment-oss.github.io/crowrulestv/admin';
  const TV_URL='https://crowrulesentertainment-oss.github.io/crowrulestv/tv';

  const BRANCHES=[
    {slug:'entertainment',name:'CrowRules Entertainment',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/',icon:'🏠'},
    {slug:'tv',name:'CrowRules TV',url:TV_URL,icon:'📺'},
    {slug:'yearbook',name:'CrowRules Yearbooks',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/yearbook',icon:'📚'},
    {slug:'awards',name:'CrowRules Awards',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/awards',icon:'🏆'},
    {slug:'tacoma-nights',name:'Tacoma Nights',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/tacoma-nights',icon:'🌃'},
    {slug:'backdeckcrew',name:'Back Deck Crew',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/backdeckcrew',icon:'🎥'},
    {slug:'pnwm',name:'Pacific Northwest Mothers',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/pnwm',icon:'👩‍👧‍👦'},
    {slug:'crowrules-records',name:'CrowRules Records',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/crowrules-records',icon:'💿'},
    {slug:'admin',name:'Admin Pro',url:ADMIN_PRO_URL,icon:'⚙️'}
  ];

  function ready(fn){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',fn,{once:true});
    }else fn();
  }

  function loadSupabase(){
    if(window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=()=>resolve(window.supabase);
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  async function client(){
    const s=await loadSupabase();
    if(!window.__crowrulesSupabase){
      window.__crowrulesSupabase=s.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth:{
            persistSession:true,
            autoRefreshToken:true,
            detectSessionInUrl:true,
            storageKey:'crowrules-unified-session',
            flowType:'pkce'
          }
        }
      );
    }
    return window.__crowrulesSupabase;
  }

  function branchMenu(){
    if(document.getElementById('crowrules-network-menu')) return;

    const wrap=document.createElement('div');
    wrap.id='crowrules-network-menu';
    wrap.innerHTML='<button aria-label="CrowRules Network">☰ CrowRules Network</button><div></div>';

    Object.assign(wrap.style,{
      position:'fixed',right:'16px',bottom:'16px',zIndex:'99999',fontFamily:'system-ui,sans-serif'
    });

    const b=wrap.querySelector('button');
    Object.assign(b.style,{
      background:'#10131a',color:'#fff',border:'1px solid #394151',borderRadius:'10px',padding:'10px 14px',fontWeight:'800',cursor:'pointer'
    });

    const menu=wrap.querySelector('div');
    Object.assign(menu.style,{
      display:'none',marginBottom:'7px',background:'#0b0e14',border:'1px solid #394151',borderRadius:'12px',padding:'8px',boxShadow:'0 15px 40px #0008',minWidth:'230px'
    });

    BRANCHES.forEach(x=>{
      const a=document.createElement('a');
      a.href=x.url;
      a.textContent=x.icon+' '+x.name;
      a.target='_self';
      Object.assign(a.style,{
        display:'block',color:'#fff',padding:'9px',textDecoration:'none',borderRadius:'7px'
      });
      a.onmouseenter=()=>a.style.background='#1b202b';
      a.onmouseleave=()=>a.style.background='transparent';
      menu.appendChild(a);
    });

    b.onclick=()=>menu.style.display=menu.style.display==='none'?'block':'none';
    document.body.appendChild(wrap);
  }

  async function publishBranchRegistry(){
    try{
      const c=await client();
      return await c.from('crowrules_branches')
        .select('id,name,slug,description,url,icon,sort_order,is_featured,is_active')
        .eq('is_active',true)
        .order('sort_order');
    }catch(e){
      return {data:BRANCHES,error:e};
    }
  }

  async function session(){
    const c=await client();
    return c.auth.getSession();
  }

  async function signOut(){
    const c=await client();
    return c.auth.signOut();
  }

  async function getTVSnapshot(channelId=null){
    const c=await client();

    const channels=await c.from('tv_channels')
      .select('*')
      .eq('is_active',true)
      .order('sort_order',{ascending:true})
      .order('channel_number',{ascending:true});

    const schedules=channelId
      ? await c.from('schedule_items').select('*').eq('channel_id',channelId).limit(500)
      : {data:[],error:null};

    const playlists=channelId
      ? await c.from('tv_channel_playlist').select('*').eq('channel_id',channelId).eq('enabled',true).order('playlist_position',{ascending:true})
      : {data:[],error:null};

    return {
      channels:channels.data||[],
      schedules:schedules.data||[],
      playlists:playlists.data||[],
      errors:[channels.error,schedules.error,playlists.error].filter(Boolean)
    };
  }

  function setupTVRealtime(){
    if(window.__crowrulesTVRealtimeReady) return window.__crowrulesTVRealtime;

    let channel;
    client().then(c=>{
      channel=c.channel('crowrules-unified-tv-sync')
        .on('postgres_changes',{event:'*',schema:'public',table:'schedule_items'},payload=>{
          window.dispatchEvent(new CustomEvent('crowrules:tv-sync',{detail:{table:'schedule_items',payload}}));
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'tv_channel_playlist'},payload=>{
          window.dispatchEvent(new CustomEvent('crowrules:tv-sync',{detail:{table:'tv_channel_playlist',payload}}));
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'tv_channels'},payload=>{
          window.dispatchEvent(new CustomEvent('crowrules:tv-sync',{detail:{table:'tv_channels',payload}}));
        })
        .on('postgres_changes',{event:'*',schema:'public',table:'episodes'},payload=>{
          window.dispatchEvent(new CustomEvent('crowrules:tv-sync',{detail:{table:'episodes',payload}}));
        })
        .subscribe();
    });

    window.__crowrulesTVRealtimeReady=true;
    window.__crowrulesTVRealtime=channel||true;
    return window.__crowrulesTVRealtime;
  }

  function adminLink(){
    return ADMIN_PRO_URL;
  }

  ready(()=>{
    branchMenu();
    setupTVRealtime();
    document.documentElement.dataset.crowrulesCore='1.2';

    /* Public TV v2.6 already has its own realtime loader. This event
       provides a second, unified bridge without requiring Admin Pro
       credentials or exposing privileged Supabase access. */
    window.addEventListener('crowrules:tv-sync',event=>{
      if(typeof window.refreshLiveData==='function' &&
         event.detail?.table==='schedule_items'){
        window.refreshLiveData();
      }
    });
  });

  window.CrowRulesCore={
    version:'1.2.0',
    supabaseUrl:SUPABASE_URL,
    adminUrl:ADMIN_PRO_URL,
    tvUrl:TV_URL,
    branches:BRANCHES,
    client,
    session,
    signOut,
    publishBranchRegistry,
    getTVSnapshot,
    setupTVRealtime,
    adminLink
  };
})();
