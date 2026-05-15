(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function a(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=a(s);fetch(s.href,i)}})();const p=[{id:"daily-instance-1",name:"Daily Instance A",type:"Daily_Instance"},{id:"daily-instance-2",name:"Daily Instance B",type:"Daily_Instance"},{id:"daily-quest-1",name:"Daily Quest A",type:"Daily_Quest"},{id:"daily-quest-2",name:"Daily Quest B",type:"Daily_Quest"},{id:"three-day-instance-1",name:"3-Day Instance A",type:"Three_Day_Instance"},{id:"three-day-instance-2",name:"3-Day Instance B",type:"Three_Day_Instance"},{id:"weekly-instance-1",name:"Weekly Instance A",type:"Weekly_Instance"},{id:"weekly-instance-2",name:"Weekly Instance B",type:"Weekly_Instance"},{id:"weekly-quest-1",name:"Weekly Quest A",type:"Weekly_Quest"},{id:"weekly-quest-2",name:"Weekly Quest B",type:"Weekly_Quest"}],y=new Date("2024-01-01T00:00:00Z").getTime(),v="game-checklist-state";function k(t){if(t===null||typeof t!="object"||Array.isArray(t))return console.warn("[StorageService] Invalid root: expected a non-null object"),null;const e=t;if(e.version!==1)return console.warn("[StorageService] Schema version mismatch: expected 1, got",e.version),null;const a=e.items;if(a===null||typeof a!="object"||Array.isArray(a))return console.warn('[StorageService] Invalid "items": expected a non-null object'),null;for(const[i,o]of Object.entries(a)){if(o===null||typeof o!="object"||Array.isArray(o))return console.warn(`[StorageService] Invalid item "${i}": expected an object`),null;const c=o;if(typeof c.completed!="boolean")return console.warn(`[StorageService] Invalid item "${i}": "completed" must be a boolean`),null;if(typeof c.lastChangedAt!="number")return console.warn(`[StorageService] Invalid item "${i}": "lastChangedAt" must be a number`),null}const n=e.nextResetBoundaries;if(n===null||typeof n!="object"||Array.isArray(n))return console.warn('[StorageService] Invalid "nextResetBoundaries": expected a non-null object'),null;const s=n;for(const i of["daily","threeDay","weekly"])if(typeof s[i]!="number"||s[i]<=0)return console.warn(`[StorageService] Invalid "nextResetBoundaries.${i}": must be a positive number`),null;return{version:1,items:a,nextResetBoundaries:{daily:s.daily,threeDay:s.threeDay,weekly:s.weekly}}}const d={load(){let t;try{t=localStorage.getItem(v)}catch(a){return console.warn("[StorageService] Failed to read from localStorage:",a),null}if(t===null)return null;let e;try{e=JSON.parse(t)}catch(a){return console.warn("[StorageService] Failed to parse stored JSON:",a),null}return k(e)},save(t){try{const e=JSON.stringify(t);return localStorage.setItem(v,e),{ok:!0}}catch(e){return{ok:!1,error:e instanceof Error?e.message:String(e)}}}};function u(t,e){const a=t+e,n=864e5;return Math.floor(a/n)*n+n-e}function m(t,e){const n=t-e,s=Math.floor(n/2592e5);return e+(s+1)*2592e5}function f(t){const a=Math.floor(t/864e5)*864e5;let i=(3-new Date(a).getUTCDay()+7)%7;return i===0&&t>=a&&(i=7),a+i*864e5}function b(t){const e=Math.floor(t/1e3),a=e%60,n=Math.floor(e/60),s=n%60,i=Math.floor(n/60);return[String(i).padStart(2,"0"),String(s).padStart(2,"0"),String(a).padStart(2,"0")].join(":")}function g(t){const e=Math.floor(t/6e4),a=e%60,n=Math.floor(e/60),s=n%24,i=Math.floor(n/24);return[String(i).padStart(2,"0"),String(s).padStart(2,"0"),String(a).padStart(2,"0")].join(":")}const x={daily:["Daily_Instance","Daily_Quest"],"three-day":["Three_Day_Instance"],weekly:["Weekly_Instance","Weekly_Quest"]};function l(t,e){const a=new Map(p.map(i=>[i.id,i.type])),n=new Set(x[e]),s={};for(const[i,o]of Object.entries(t)){const c=a.get(i);c!==void 0&&n.has(c)?s[i]={...o,completed:!1}:s[i]=o}return s}let r;const D=document.querySelector("#app");function S(){return-new Date().getTimezoneOffset()*6e4}function R(){const t=Date.now(),e=S(),a=d.load();if(a){r=a;let n=!1;t>=r.nextResetBoundaries.daily&&(r.items=l(r.items,"daily"),r.nextResetBoundaries.daily=u(t,e),n=!0),t>=r.nextResetBoundaries.threeDay&&(r.items=l(r.items,"three-day"),r.nextResetBoundaries.threeDay=m(t,y),n=!0),t>=r.nextResetBoundaries.weekly&&(r.items=l(r.items,"weekly"),r.nextResetBoundaries.weekly=f(t),n=!0),n&&d.save(r)}else{const n={};p.forEach(s=>{n[s.id]={completed:!1,lastChangedAt:t}}),r={version:1,items:n,nextResetBoundaries:{daily:u(t,e),threeDay:m(t,y),weekly:f(t)}},d.save(r)}I(),A()}function T(t){const e=r.items[t];e&&(e.completed=!e.completed,e.lastChangedAt=Date.now(),d.save(r),h())}D.addEventListener("change",t=>{const e=t.target;e&&e.matches(".item-checkbox")&&T(e.dataset.id)});function I(){D.innerHTML=`
    <header class="animate-fade-in">
      <h1>RocNote</h1>
      <p>Game Checklist & Reset Tracker</p>
    </header>
    <div id="timers-container" class="glass-panel animate-fade-in" style="animation-delay: 0.1s"></div>
    <div id="checklist-container" class="glass-panel animate-fade-in" style="animation-delay: 0.2s"></div>
  `,w(),h()}function w(){const t=document.getElementById("timers-container");if(!t)return;const e=Date.now(),a=Math.max(0,r.nextResetBoundaries.daily-e),n=Math.max(0,r.nextResetBoundaries.threeDay-e),s=Math.max(0,r.nextResetBoundaries.weekly-e);t.innerHTML=`
    <div class="timers-grid">
      <div class="timer-card">
        <div class="timer-label">Daily Reset</div>
        <div class="timer-value">${b(a)}</div>
      </div>
      <div class="timer-card">
        <div class="timer-label">3-Day Reset</div>
        <div class="timer-value">${g(n)}</div>
      </div>
      <div class="timer-card">
        <div class="timer-label">Weekly Reset</div>
        <div class="timer-value">${g(s)}</div>
      </div>
    </div>
  `}function h(){const t=document.getElementById("checklist-container");if(!t)return;const e={daily:{label:"Daily",items:[]},"three-day":{label:"3-Day",items:[]},weekly:{label:"Weekly",items:[]}};p.forEach(n=>{n.type.startsWith("Daily")?e.daily.items.push(n):n.type.startsWith("Three_Day")?e["three-day"].items.push(n):n.type.startsWith("Weekly")&&e.weekly.items.push(n)});let a="";for(const[,n]of Object.entries(e))n.items.length!==0&&(a+=`
      <div class="checklist-group">
        <div class="group-header">
          <span class="group-title">${n.label} Activities</span>
          <span class="group-badge">${n.items.filter(s=>{var i;return(i=r.items[s.id])==null?void 0:i.completed}).length} / ${n.items.length}</span>
        </div>
        <div class="items-list">
    `,n.items.forEach(s=>{var o;const i=((o=r.items[s.id])==null?void 0:o.completed)||!1;a+=`
        <label class="checklist-item">
          <input type="checkbox" class="item-checkbox" data-id="${s.id}" ${i?"checked":""} />
          <div class="checkbox-custom"></div>
          <span class="item-name">${s.name}</span>
        </label>
      `}),a+=`
        </div>
      </div>
    `);t.innerHTML=a}function A(){setInterval(()=>{const t=Date.now(),e=S();let a=!1;t>=r.nextResetBoundaries.daily&&(r.items=l(r.items,"daily"),r.nextResetBoundaries.daily=u(t,e),a=!0),t>=r.nextResetBoundaries.threeDay&&(r.items=l(r.items,"three-day"),r.nextResetBoundaries.threeDay=m(t,y),a=!0),t>=r.nextResetBoundaries.weekly&&(r.items=l(r.items,"weekly"),r.nextResetBoundaries.weekly=f(t),a=!0),a&&(d.save(r),h()),w()},1e3)}R();
