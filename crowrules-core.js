/* CrowRules Unified Core v1.0
   Shared Supabase integration for every CrowRules branch.
   Public client key only; never place a service-role key in browser code. */
(function(){
  'use strict';
  const SUPABASE_URL='https://zauxdqyssratvzmomozf.supabase.co';
  const SUPABASE_ANON_KEY='sb_publishable_-Z6wecSOxwOk6IBut2zLnw_8DfRxnE9';
  const BRANCHES=[
    {slug:'entertainment',name:'CrowRules Entertainment',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/',icon:'🏠'},
    {slug:'tv',name:'CrowRules TV',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/tv',icon:'📺'},
    {slug:'yearbook',name:'CrowRules Yearbooks',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/yearbook',icon:'📚'},
    {slug:'awards',name:'CrowRules Awards',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/awards',icon:'🏆'},
    {slug:'tacoma-nights',name:'Tacoma Nights',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/tacoma-nights',icon:'🌃'},
    {slug:'backdeckcrew',name:'Back Deck Crew',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/backdeckcrew',icon:'🎥'},
    {slug:'pnwm',name:'PNW Music',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/pnwm',icon:'🎵'},
    {slug:'crowrules-records',name:'CrowRules Records',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/crowrules-records',icon:'💿'},
    {slug:'admin',name:'Admin Pro',url:'https://crowrulesentertainment-oss.github.io/crowrulestv/admin',icon:'⚙️'}
  ];
  function ready(fn){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});else fn();}
  function loadSupabase(){return window.supabase?.createClient?Promise.resolve(window.supabase):new Promise((resolve,reject)=>{let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=()=>resolve(window.supabase);s.onerror=reject;document.head.appendChild(s)})}
  async function client(){const s=await loadSupabase();if(!window.__crowrulesSupabase)window.__crowrulesSupabase=s.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'crowrules-unified-session',flowType:'pkce'}});return window.__crowrulesSupabase}
  function branchMenu(){if(document.getElementById('crowrules-network-menu'))return;const wrap=document.createElement('div');wrap.id='crowrules-network-menu';wrap.innerHTML='<button aria-label="CrowRules Network">☰ CrowRules Network</button><div></div>';Object.assign(wrap.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'99999',fontFamily:'system-ui,sans-serif'});const b=wrap.querySelector('button');Object.assign(b.style,{background:'#10131a',color:'#fff',border:'1px solid #394151',borderRadius:'10px',padding:'10px 14px',fontWeight:'800',cursor:'pointer'});const menu=wrap.querySelector('div');Object.assign(menu.style,{display:'none',marginBottom:'7px',background:'#0b0e14',border:'1px solid #394151',borderRadius:'12px',padding:'8px',boxShadow:'0 15px 40px #0008',minWidth:'220px'});BRANCHES.filter(x=>x.slug!=='admin').forEach(x=>{const a=document.createElement('a');a.href=x.url;a.textContent=x.icon+' '+x.name;a.target='_self';Object.assign(a.style,{display:'block',color:'#fff',padding:'9px',textDecoration:'none',borderRadius:'7px'});a.onmouseenter=()=>a.style.background='#1b202b';a.onmouseleave=()=>a.style.background='transparent';menu.appendChild(a)});b.onclick=()=>menu.style.display=menu.style.display==='none'?'block':'none';document.body.appendChild(wrap)}
  async function publishBranchRegistry(){try{const c=await client();return c.from('crowrules_branches').select('id,name,slug,description,url,icon,sort_order,is_featured,is_active').eq('is_active',true).order('sort_order')}catch(e){return {data:BRANCHES,error:e}}}
  async function session(){const c=await client();return c.auth.getSession()}
  async function signOut(){const c=await client();return c.auth.signOut()}
  ready(()=>{branchMenu();document.documentElement.dataset.crowrulesCore='1'});
  window.CrowRulesCore={version:'1.0.0',supabaseUrl:SUPABASE_URL,branches:BRANCHES,client,session,signOut,publishBranchRegistry};
})();
