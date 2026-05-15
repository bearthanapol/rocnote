(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const D=[{id:"daily-instance-1",name:"Daily Instance A",type:"Daily_Instance"},{id:"daily-instance-2",name:"Daily Instance B",type:"Daily_Instance"},{id:"daily-quest-1",name:"Daily Quest A",type:"Daily_Quest"},{id:"daily-quest-2",name:"Daily Quest B",type:"Daily_Quest"},{id:"three-day-instance-1",name:"3-Day Instance A",type:"Three_Day_Instance"},{id:"three-day-instance-2",name:"3-Day Instance B",type:"Three_Day_Instance"},{id:"weekly-instance-1",name:"Weekly Instance A",type:"Weekly_Instance"},{id:"weekly-instance-2",name:"Weekly Instance B",type:"Weekly_Instance"},{id:"weekly-quest-1",name:"Weekly Quest A",type:"Weekly_Quest"},{id:"weekly-quest-2",name:"Weekly Quest B",type:"Weekly_Quest"}],p=new Date("2024-01-01T00:00:00Z").getTime(),x="game-checklist-state";function _(t){if(t===null||typeof t!="object"||Array.isArray(t))return console.warn("[StorageService] Invalid root: expected a non-null object"),null;const e=t;if(e.version!==1)return console.warn("[StorageService] Schema version mismatch: expected 1, got",e.version),null;const n=e.items;if(n===null||typeof n!="object"||Array.isArray(n))return console.warn('[StorageService] Invalid "items": expected a non-null object'),null;for(const[i,o]of Object.entries(n)){if(o===null||typeof o!="object"||Array.isArray(o))return console.warn(`[StorageService] Invalid item "${i}": expected an object`),null;const c=o;if(typeof c.completed!="boolean")return console.warn(`[StorageService] Invalid item "${i}": "completed" must be a boolean`),null;if(typeof c.lastChangedAt!="number")return console.warn(`[StorageService] Invalid item "${i}": "lastChangedAt" must be a number`),null}const a=e.nextResetBoundaries;if(a===null||typeof a!="object"||Array.isArray(a))return console.warn('[StorageService] Invalid "nextResetBoundaries": expected a non-null object'),null;const s=a;for(const i of["daily","threeDay","weekly"])if(typeof s[i]!="number"||s[i]<=0)return console.warn(`[StorageService] Invalid "nextResetBoundaries.${i}": must be a positive number`),null;return{version:1,items:n,nextResetBoundaries:{daily:s.daily,threeDay:s.threeDay,weekly:s.weekly}}}const m={load(){let t;try{t=localStorage.getItem(x)}catch(n){return console.warn("[StorageService] Failed to read from localStorage:",n),null}if(t===null)return null;let e;try{e=JSON.parse(t)}catch(n){return console.warn("[StorageService] Failed to parse stored JSON:",n),null}return _(e)},save(t){try{const e=JSON.stringify(t);return localStorage.setItem(x,e),{ok:!0}}catch(e){return{ok:!1,error:e instanceof Error?e.message:String(e)}}}};function g(t,e){const n=t+e,a=864e5;return Math.floor(n/a)*a+a-e}function h(t,e){const a=t-e,s=Math.floor(a/2592e5);return e+(s+1)*2592e5}function v(t){const n=Math.floor(t/864e5)*864e5;let i=(3-new Date(n).getUTCDay()+7)%7;return i===0&&t>=n&&(i=7),n+i*864e5}const O={daily:["Daily_Instance","Daily_Quest"],"three-day":["Three_Day_Instance"],weekly:["Weekly_Instance","Weekly_Quest"]};function d(t,e){const n=new Map(D.map(i=>[i.id,i.type])),a=new Set(O[e]),s={};for(const[i,o]of Object.entries(t)){const c=n.get(i);c!==void 0&&a.has(c)?s[i]={...o,completed:!1}:s[i]=o}return s}let r;const A=document.querySelector("#app");function R(){return-new Date().getTimezoneOffset()*6e4}function W(){const t=Date.now(),e=R(),n=m.load();if(n){r=n;let a=!1;t>=r.nextResetBoundaries.daily&&(r.items=d(r.items,"daily"),r.nextResetBoundaries.daily=g(t,e),a=!0),t>=r.nextResetBoundaries.threeDay&&(r.items=d(r.items,"three-day"),r.nextResetBoundaries.threeDay=h(t,p),a=!0),t>=r.nextResetBoundaries.weekly&&(r.items=d(r.items,"weekly"),r.nextResetBoundaries.weekly=v(t),a=!0),a&&m.save(r)}else{const a={};D.forEach(s=>{a[s.id]={completed:!1,lastChangedAt:t}}),r={version:1,items:a,nextResetBoundaries:{daily:g(t,e),threeDay:h(t,p),weekly:v(t)}},m.save(r)}$(),P()}function N(t){const e=r.items[t];e&&(e.completed=!e.completed,e.lastChangedAt=Date.now(),m.save(r),w())}A.addEventListener("change",t=>{const e=t.target;e&&e.matches(".item-checkbox")&&N(e.dataset.id)});function $(){A.innerHTML=`
    <header class="animate-fade-in">
      <h1>RocNote</h1>
      <p>Game Checklist & Reset Tracker</p>
    </header>
    <div id="calendar-container"></div>
    <div id="checklist-container" class="glass-panel animate-fade-in" style="animation-delay: 0.2s"></div>
  `,B(),w()}function B(){const t=document.getElementById("calendar-container");if(!t)return;const e=new Date,n=e.getFullYear(),a=e.getMonth(),s=e.getDate(),i=new Date(n,a,1).getDay(),o=new Date(n,a+1,0).getDate();let f=`
    <div class="calendar-wrapper glass-panel animate-fade-in" style="animation-delay: 0.1s">
      <div class="calendar-header">
        <div class="calendar-title">${["January","February","March","April","May","June","July","August","September","October","November","December"][a]} ${n}</div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday">Sun</div>
        <div class="calendar-weekday">Mon</div>
        <div class="calendar-weekday">Tue</div>
        <div class="calendar-weekday">Wed</div>
        <div class="calendar-weekday">Thu</div>
        <div class="calendar-weekday">Fri</div>
        <div class="calendar-weekday">Sat</div>
  `;for(let l=0;l<i;l++)f+='<div class="calendar-day empty"></div>';for(let l=1;l<=o;l++){const E=l===s,y=new Date(n,a,l,0,0,0,0).getTime(),k=y+864e5,b=v(y-1),S=b>=y&&b<k,T=h(y-1,p),I=T>=y&&T<k;let u="";(S||I)&&(u+='<div class="badges-container">',S&&(u+='<div class="reset-dot dot-weekly" title="Weekly Reset"></div>'),I&&(u+='<div class="reset-dot dot-threeday" title="3-Day Reset"></div>'),u+="</div>"),f+=`
      <div class="calendar-day ${E?"today":""}">
        <span class="day-number">${l}</span>
        ${u}
      </div>
    `}f+=`
      </div>
    </div>
  `,t.innerHTML=f}function w(){const t=document.getElementById("checklist-container");if(!t)return;const e={daily:{label:"Daily",items:[]},"three-day":{label:"3-Day",items:[]},weekly:{label:"Weekly",items:[]}};D.forEach(a=>{a.type.startsWith("Daily")?e.daily.items.push(a):a.type.startsWith("Three_Day")?e["three-day"].items.push(a):a.type.startsWith("Weekly")&&e.weekly.items.push(a)});let n="";for(const[,a]of Object.entries(e))a.items.length!==0&&(n+=`
      <div class="checklist-group">
        <div class="group-header">
          <span class="group-title">${a.label} Activities</span>
          <span class="group-badge">${a.items.filter(s=>{var i;return(i=r.items[s.id])==null?void 0:i.completed}).length} / ${a.items.length}</span>
        </div>
        <div class="items-list">
    `,a.items.forEach(s=>{var o;const i=((o=r.items[s.id])==null?void 0:o.completed)||!1;n+=`
        <label class="checklist-item">
          <input type="checkbox" class="item-checkbox" data-id="${s.id}" ${i?"checked":""} />
          <div class="checkbox-custom"></div>
          <span class="item-name">${s.name}</span>
        </label>
      `}),n+=`
        </div>
      </div>
    `);t.innerHTML=n}function P(){setInterval(()=>{const t=Date.now(),e=R();let n=!1;t>=r.nextResetBoundaries.daily&&(r.items=d(r.items,"daily"),r.nextResetBoundaries.daily=g(t,e),n=!0),t>=r.nextResetBoundaries.threeDay&&(r.items=d(r.items,"three-day"),r.nextResetBoundaries.threeDay=h(t,p),n=!0),t>=r.nextResetBoundaries.weekly&&(r.items=d(r.items,"weekly"),r.nextResetBoundaries.weekly=v(t),n=!0),n&&(m.save(r),w(),B())},1e3)}W();
