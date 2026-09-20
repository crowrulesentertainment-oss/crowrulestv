window.CRP = window.CRP || {};
CRP.items = Array.isArray(window.CRP_DATA) ? window.CRP_DATA : [];
CRP.card = function(x) {
  const type = String(x.type || "youtube").toLowerCase();
  const params = new URLSearchParams({type:type,id:x.youtubeId || x.id || x.slug || "",title:x.title || "CrowRules+"});
  if (type === "custom_live") params.set("channel", x.channel || x.channelSlug || x.slug || x.id || "");
  return '<article class="card"><a href="watch.html?' + params.toString() + '">' +
    '<div class="thumb">' + (x.thumbnail ? '<img src="' + x.thumbnail + '" alt="">' : '') +
    '<span class="badge ' + (x.live ? "live-badge" : "") + '">' + (x.live ? "● LIVE" : String(x.source || type).toUpperCase()) +
    '</span></div><div class="card-body"><h3>' + (x.title || "Untitled") + '</h3><p>' + (x.description || "") +
    '</p></div></a></article>';
};
CRP.render = function(el, items) { if (el) el.innerHTML = items.map(CRP.card).join("") || "<p>No titles found.</p>"; };
CRP.initBrowse = function() {
  const el = document.querySelector("#browseGrid"); CRP.render(el, CRP.items);
  document.querySelectorAll(".filters button").forEach(b => b.onclick = () => {
    document.querySelectorAll(".filters button").forEach(x => x.classList.remove("selected"));
    b.classList.add("selected"); const f = b.dataset.filter;
    CRP.render(el, f==="all" ? CRP.items : f==="live" ? CRP.items.filter(x=>x.live) :
      f==="original" ? CRP.items.filter(x=>x.original) : CRP.items.filter(x=>String(x.source||"").toLowerCase()===f));
  });
};
CRP.initLive = () => CRP.render(document.querySelector("#livePageGrid"), CRP.items.filter(x=>x.live));
CRP.initMyList = () => { const ids=JSON.parse(localStorage.getItem("crp_my_list")||"[]"); CRP.render(document.querySelector("#myListGrid"), CRP.items.filter(x=>ids.includes(x.id))); };
CRP.initSearch = () => {
  const f=document.querySelector("#searchForm"), i=document.querySelector("#searchInput"), g=document.querySelector("#searchGrid"); if(!f)return;
  f.onsubmit=e=>{e.preventDefault();const q=i.value.toLowerCase().trim();CRP.render(g,CRP.items.filter(x=>(x.title+" "+x.description+" "+x.category).toLowerCase().includes(q)));};
};
document.addEventListener("DOMContentLoaded",()=>{CRP.render(document.querySelector("#liveGrid"),CRP.items.filter(x=>x.live));CRP.render(document.querySelector("#originalGrid"),CRP.items.filter(x=>x.original));});