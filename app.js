```javascript
/* ==========================================================
   CROWRULES TV ULTIMATE V2
   app.js
   ========================================================== */

"use strict";

/* ==========================================================
   GLOBAL STATE
   ========================================================== */

const APP = {
    startTime: Date.now(),
    events: [],
    schedule: [],
    currentShow: null,
    nextShow: null,

    stats: {
        viewers: 0,
        likes: 0,
        subscribers: 0,
        goal: 1000
    }
};

/* ==========================================================
   DOM HELPERS
   ========================================================== */

const $ = id => document.getElementById(id);

function setText(id, value){
    const el = $(id);
    if(el) el.textContent = value;
}

/* ==========================================================
   CLOCK
   ========================================================== */

function updateClock(){

    const now = new Date();

    setText(
        "clock",
        now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    );
}

setInterval(updateClock,1000);
updateClock();

/* ==========================================================
   UPTIME
   ========================================================== */

function updateUptime(){

    const diff = Date.now() - APP.startTime;

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    setText(
        "uptime",
        `${String(h).padStart(2,'0')}:` +
        `${String(m).padStart(2,'0')}:` +
        `${String(s).padStart(2,'0')}`
    );
}

setInterval(updateUptime,1000);
updateUptime();

/* ==========================================================
   ALERT FEED
   ========================================================== */

function addAlert(message, playSound = true){

    const container = $("alerts");

    if(!container) return;

    const div = document.createElement("div");

    div.className = "alert";
    div.textContent = message;

    container.prepend(div);

    while(container.children.length > 10){
        container.removeChild(container.lastChild);
    }

    if(playSound){
        const audio = $("alertSound");

        if(audio){
            audio.currentTime = 0;
            audio.play().catch(()=>{});
        }
    }

    APP.events.unshift(message);

    if(APP.events.length > 50){
        APP.events.pop();
    }

    setText("eventCount", APP.events.length);
}

/* ==========================================================
   BREAKING NEWS
   ========================================================== */

function breakingNews(text, duration = 10000){

    const banner = $("breakingNews");

    if(!banner) return;

    setText("breakingText", text);

    banner.classList.remove("hidden");

    setTimeout(() => {
        banner.classList.add("hidden");
    }, duration);
}

/* ==========================================================
   GOAL SYSTEM
   ========================================================== */

function updateGoal(){

    const current = APP.stats.subscribers;
    const goal = APP.stats.goal;

    const percent = Math.min(
        (current / goal) * 100,
        100
    );

    const fill = $("goalFill");

    if(fill){
        fill.style.width = percent + "%";
    }

    setText(
        "goalText",
        `${current} / ${goal}`
    );
}

/* ==========================================================
   STATS
   ========================================================== */

function updateStats(){

    setText(
        "viewers",
        APP.stats.viewers
    );

    setText(
        "likes",
        APP.stats.likes
    );

    setText(
        "subs",
        APP.stats.subscribers
    );

    updateGoal();
}

/* ==========================================================
   LEADERBOARD
   ========================================================== */

async function loadLeaderboard(){

    try{

        const response = await fetch(
            "leaders.txt?cache=" + Date.now()
        );

        const text = await response.text();

        let items = text
            .split("\n")
            .map(x => x.trim())
            .filter(Boolean);

        if(items.length === 0){
            items = [
                "CrowRules TV Online"
            ];
        }

        buildLeaderboard(items);

    }catch(error){

        buildLeaderboard([
            "Tacoma Nights Tonight",
            "Bonded In Mystery",
            "Game Night Live",
            "Join Crow's Nest"
        ]);

        console.error(error);
    }
}

function buildLeaderboard(items){

    const track = $("leaderboardTrack");

    if(!track) return;

    track.innerHTML = "";

    const loop = [...items, ...items];

    loop.forEach(item => {

        const div = document.createElement("div");

        div.className = "leader-item";
        div.textContent = item;

        track.appendChild(div);
    });
}

loadLeaderboard();

setInterval(
    loadLeaderboard,
    15000
);

/* ==========================================================
   SCHEDULE ENGINE
   schedule.json example:

   [
      {
         "time":"20:00",
         "show":"Game Night Live",
         "episode":"Season 1 Episode 5"
      }
   ]
   ========================================================== */

async function loadSchedule(){

    try{

        const response = await fetch(
            "schedule.json?cache=" + Date.now()
        );

        APP.schedule =
            await response.json();

        updateSchedule();

    }catch(error){

        console.error(
            "Schedule error:",
            error
        );
    }
}

function updateSchedule(){

    if(!APP.schedule.length){
        return;
    }

    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    let current = null;
    let next = null;

    for(let i=0;i<APP.schedule.length;i++){

        const show = APP.schedule[i];

        const [h,m] =
            show.time
                .split(":")
                .map(Number);

        const showMinutes =
            h * 60 + m;

        if(currentMinutes >= showMinutes){
            current = show;
            next =
                APP.schedule[
                    (i+1) %
                    APP.schedule.length
                ];
        }
    }

    if(current){

        APP.currentShow = current;
        APP.nextShow = next;

        setText(
            "currentShow",
            current.show
        );

        setText(
            "episodeInfo",
            current.episode || ""
        );

        if(next){
            setText(
                "nextShow",
                next.show
            );
        }
    }
}

loadSchedule();

setInterval(
    updateSchedule,
    60000
);

/* ==========================================================
   WEATHER PLACEHOLDER
   ========================================================== */

function updateWeather(){

    setText(
        "weather",
        "Tacoma • 61°F"
    );
}

updateWeather();

/* ==========================================================
   TICKER
   ========================================================== */

function updateTicker(text){

    const el = $("tickerText");

    if(el){
        el.textContent = text;
    }
}

/* ==========================================================
   STREAMLABS
   ========================================================== */

function initStreamlabs(){

    if(typeof io === "undefined"){

        console.warn(
            "Streamlabs unavailable"
        );

        return;
    }

    try{

        const socket = io(
            "https://sockets.streamlabs.com",
            {
                transports:["websocket"]
            }
        );

        socket.on(
            "connect",
            () => {

                addAlert(
                    "Streamlabs Connected",
                    false
                );
            }
        );

        socket.on(
            "event",
            event => {

                handleStreamEvent(
                    event
                );
            }
        );

        socket.on(
            "connect_error",
            error => {

                console.error(
                    error
                );
            }
        );

    }catch(error){

        console.error(error);
    }
}

function handleStreamEvent(event){

    console.log(event);

    let message =
        "New Event Received";

    if(event.message){

        message = event.message;
    }

    addAlert(message);

    APP.stats.subscribers++;

    updateStats();
}

/* ==========================================================
   DEMO MODE
   Remove in production
   ========================================================== */

function startDemoMode(){

    setInterval(() => {

        const demos = [

            "New Subscriber: TacomaViewer",

            "Donation: $10",

            "New Member: Crow Fan",

            "Follower: MysteryHunter",

            "Game Night Starting Soon"
        ];

        const msg =
            demos[
                Math.floor(
                    Math.random() *
                    demos.length
                )
            ];

        addAlert(msg);

        APP.stats.viewers +=
            Math.floor(
                Math.random() * 5
            );

        APP.stats.likes +=
            Math.floor(
                Math.random() * 2
            );

        updateStats();

    },30000);
}

/* ==========================================================
   EMERGENCY ALERT SYSTEM
   ========================================================== */

window.triggerEAS =
function(message){

    breakingNews(
        message,
        15000
    );

    addAlert(
        "EAS: " + message
    );
};

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.CrowRulesTV = {

    setViewers(count){

        APP.stats.viewers = count;

        updateStats();
    },

    setSubscribers(count){

        APP.stats.subscribers = count;

        updateStats();
    },

    setLikes(count){

        APP.stats.likes = count;

        updateStats();
    },

    setShow(
        show,
        episode
    ){

        setText(
            "currentShow",
            show
        );

        setText(
            "episodeInfo",
            episode
        );
    },

    addAlert,

    breakingNews,

    updateTicker
};

/* ==========================================================
   INIT
   ========================================================== */

function init(){

    updateStats();

    initStreamlabs();

    startDemoMode();

    addAlert(
        "CrowRules TV Network Online",
        false
    );
}

window.addEventListener(
    "load",
    init
);
```
