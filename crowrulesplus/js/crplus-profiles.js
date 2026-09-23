/* CrowRules+ Profiles & Household Engine v1 */
(() => {
  "use strict";

  const state = { user:null, profiles:[], active:null };

  function esc(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  async function boot(){
    const {data,error}=await supabase.auth.getUser();
    if(error || !data?.user){
      location.href="../login.html?returnTo="+encodeURIComponent(location.href);
      return;
    }
    state.user=data.user;
    document.getElementById("account").textContent=state.user.email || "Signed in";
    await load();
    render();
    bind();
  }

  async function load(){
    const {data,error}=await supabase
      .from("crplus_profiles")
      .select("id,user_id,display_name,avatar_url,profile_theme,is_kids,maturity_level,autoplay,is_default,created_at,updated_at")
      .eq("user_id",state.user.id)
      .order("is_default",{ascending:false})
      .order("created_at",{ascending:true});

    if(error){ console.error(error); return; }
    state.profiles=data||[];

    const stored=localStorage.getItem("crplus_active_profile");
    state.active=state.profiles.find(p=>p.id===stored) ||
      state.profiles.find(p=>p.is_default) ||
      state.profiles[0] || null;
  }

  function render(){
    const grid=document.getElementById("profiles");
    grid.innerHTML="";

    state.profiles.forEach(profile=>{
      const button=document.createElement("button");
      button.className="profile";
      const avatar=profile.avatar_url
        ? '<img src="'+esc(profile.avatar_url)+'" alt="">'
        : '<span>'+esc((profile.display_name||"?").charAt(0).toUpperCase())+"</span>";

      button.innerHTML='<div class="avatar">'+avatar+'</div>'+
        '<span class="name">'+esc(profile.display_name)+'</span>'+
        (profile.is_kids?'<span class="kid">KIDS</span>':"");

      button.addEventListener("click",()=>select(profile));
      grid.appendChild(button);
    });

    const add=document.createElement("button");
    add.className="profile add";
    add.innerHTML='<div class="avatar"><span>+</span></div><span class="name">Add Profile</span>';
    add.addEventListener("click",openModal);
    grid.appendChild(add);
  }

  function select(profile){
    state.active=profile;
    localStorage.setItem("crplus_active_profile",profile.id);
    window.dispatchEvent(new CustomEvent("crplus:profile-changed",{detail:profile}));
    location.href="../home.html";
  }

  function openModal(){
    document.getElementById("modal").classList.add("open");
    document.getElementById("modal").setAttribute("aria-hidden","false");
    setTimeout(()=>document.getElementById("displayName").focus(),50);
  }

  function closeModal(){
    document.getElementById("modal").classList.remove("open");
    document.getElementById("modal").setAttribute("aria-hidden","true");
    document.getElementById("status").textContent="";
  }

  async function create(e){
    e.preventDefault();
    const status=document.getElementById("status");
    const displayName=document.getElementById("displayName").value.trim();
    const avatarUrl=document.getElementById("avatarUrl").value.trim() || null;
    const kids=document.getElementById("kids").checked;
    if(!displayName) return;

    status.textContent="Creating profile…";

    const hasDefault=state.profiles.some(p=>p.is_default);
    const {data,error}=await supabase.from("crplus_profiles").insert({
      user_id:state.user.id,
      display_name:displayName,
      avatar_url:avatarUrl,
      is_kids:kids,
      maturity_level:kids?12:18,
      is_default:!hasDefault
    }).select().single();

    if(error){
      console.error(error);
      status.textContent=error.message || "Could not create profile.";
      return;
    }

    state.profiles.push(data);
    state.profiles.sort((a,b)=>
      Number(b.is_default)-Number(a.is_default) ||
      new Date(a.created_at)-new Date(b.created_at)
    );
    document.getElementById("form").reset();
    closeModal();
    render();
  }

  function bind(){
    document.getElementById("manage").addEventListener("click",()=>{
      alert("Profile management is ready for the next management-panel pass. Use Add Profile here to create viewing profiles.");
    });
    document.getElementById("home").addEventListener("click",()=>location.href="../home.html");
    document.getElementById("close").addEventListener("click",closeModal);
    document.getElementById("form").addEventListener("submit",create);
    document.getElementById("modal").addEventListener("click",e=>{
      if(e.target.id==="modal") closeModal();
    });
  }

  window.CrowProfiles={
    init:boot,
    getActiveProfile:()=>state.active,
    getProfiles:()=>[...state.profiles],
    setActiveProfile:select
  };

  document.addEventListener("DOMContentLoaded",boot);
})();