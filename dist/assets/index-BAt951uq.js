(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&s(c)}).observe(document,{childList:!0,subtree:!0});function a(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function s(i){if(i.ep)return;i.ep=!0;const o=a(i);fetch(i.href,o)}})();const w=[{id:"daily-instance-1",name:"Daily Instance A",type:"Daily_Instance"},{id:"daily-instance-2",name:"Daily Instance B",type:"Daily_Instance"},{id:"daily-quest-1",name:"Daily Quest A",type:"Daily_Quest"},{id:"daily-quest-2",name:"Daily Quest B",type:"Daily_Quest"},{id:"three-day-instance-1",name:"3-Day Instance A",type:"Three_Day_Instance"},{id:"three-day-instance-2",name:"3-Day Instance B",type:"Three_Day_Instance"},{id:"weekly-instance-1",name:"Weekly Instance A",type:"Weekly_Instance"},{id:"weekly-instance-2",name:"Weekly Instance B",type:"Weekly_Instance"},{id:"weekly-quest-1",name:"Weekly Quest A",type:"Weekly_Quest"},{id:"weekly-quest-2",name:"Weekly Quest B",type:"Weekly_Quest"}],S=new Date("2024-01-01T00:00:00Z").getTime(),O="game-checklist-state";function j(e){if(e===null||typeof e!="object"||Array.isArray(e))return console.warn("[StorageService] Invalid root: expected a non-null object"),null;const n=e,a=n.version;if(a!==1&&a!==2)return console.warn("[StorageService] Schema version mismatch: expected 1 or 2, got",a),null;const s=n.items;if(s===null||typeof s!="object"||Array.isArray(s))return console.warn('[StorageService] Invalid "items": expected a non-null object'),null;for(const[l,d]of Object.entries(s)){if(d===null||typeof d!="object"||Array.isArray(d))return console.warn(`[StorageService] Invalid item "${l}": expected an object`),null;const r=d;if(typeof r.completed!="boolean")return console.warn(`[StorageService] Invalid item "${l}": "completed" must be a boolean`),null;if(typeof r.lastChangedAt!="number")return console.warn(`[StorageService] Invalid item "${l}": "lastChangedAt" must be a number`),null}const i=n.nextResetBoundaries;if(i===null||typeof i!="object"||Array.isArray(i))return console.warn('[StorageService] Invalid "nextResetBoundaries": expected a non-null object'),null;const o=i;for(const l of["daily","threeDay","weekly"])if(typeof o[l]!="number"||o[l]<=0)return console.warn(`[StorageService] Invalid "nextResetBoundaries.${l}": must be a positive number`),null;let c={};if(a===2){const l=n.history;if(l===null||typeof l!="object"||Array.isArray(l))return console.warn('[StorageService] Invalid "history": expected a non-null object'),null;for(const[d,r]of Object.entries(l)){if(r===null||typeof r!="object"||Array.isArray(r))return console.warn(`[StorageService] Invalid history day "${d}": expected an object`),null;for(const[m,h]of Object.entries(r))if(typeof h!="boolean")return console.warn(`[StorageService] Invalid history entry for "${d} / ${m}": "completed" must be boolean`),null}c=l}return{version:2,items:s,history:c,nextResetBoundaries:{daily:o.daily,threeDay:o.threeDay,weekly:o.weekly}}}const y={load(){let e;try{e=localStorage.getItem(O)}catch(a){return console.warn("[StorageService] Failed to read from localStorage:",a),null}if(e===null)return null;let n;try{n=JSON.parse(e)}catch(a){return console.warn("[StorageService] Failed to parse stored JSON:",a),null}return j(n)},save(e){try{const n=JSON.stringify(e);return localStorage.setItem(O,n),{ok:!0}}catch(n){return{ok:!1,error:n instanceof Error?n.message:String(n)}}}};function I(e,n){const a=e+n,s=864e5;return Math.floor(a/s)*s+s-n}function A(e,n){const s=e-n,i=Math.floor(s/2592e5);return n+(i+1)*2592e5}function k(e){const a=Math.floor(e/864e5)*864e5;let o=(3-new Date(a).getUTCDay()+7)%7;return o===0&&e>=a&&(o=7),a+o*864e5}const L={daily:["Daily_Instance","Daily_Quest"],"three-day":["Three_Day_Instance"],weekly:["Weekly_Instance","Weekly_Quest"]};function g(e,n){const a=new Map(w.map(o=>[o.id,o.type])),s=new Set(L[n]),i={};for(const[o,c]of Object.entries(e)){const l=a.get(o);l!==void 0&&s.has(l)?i[o]={...c,completed:!1}:i[o]=c}return i}let t;function p(e){const n=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),s=String(e.getDate()).padStart(2,"0");return`${n}-${a}-${s}`}function C(){if(!t)return w;const e=t.hiddenActivities||[],n=t.customActivities||[];return[...w,...n].filter(a=>!e.includes(a.id))}let u=p(new Date);const x=document.querySelector("#app");function W(){return-new Date().getTimezoneOffset()*6e4}function P(){const e=Date.now(),n=W(),a=y.load();if(a){t=a,t.customNames||(t.customNames={}),t.customActivities||(t.customActivities=[]),t.hiddenActivities||(t.hiddenActivities=[]);let s=!1;e>=t.nextResetBoundaries.daily&&(t.items=g(t.items,"daily"),t.nextResetBoundaries.daily=I(e,n),s=!0),e>=t.nextResetBoundaries.threeDay&&(t.items=g(t.items,"three-day"),t.nextResetBoundaries.threeDay=A(e,S),s=!0),e>=t.nextResetBoundaries.weekly&&(t.items=g(t.items,"weekly"),t.nextResetBoundaries.weekly=k(e),s=!0),s&&y.save(t)}else{const s={};w.forEach(i=>{s[i.id]={completed:!1,lastChangedAt:e}}),t={version:2,items:s,history:{},customNames:{},customActivities:[],hiddenActivities:[],nextResetBoundaries:{daily:I(e,n),threeDay:A(e,S),weekly:k(e)}},y.save(t)}u=p(new Date),Y(),q()}function M(e){const n=p(new Date);if(u!==n)return;const a=t.items[e];a&&(a.completed=!a.completed,a.lastChangedAt=Date.now(),t.history[n]||(t.history[n]={}),t.history[n][e]=a.completed,y.save(t),v())}function Q(e){var s,i;const n=((s=t.customNames)==null?void 0:s[e])||((i=w.find(o=>o.id===e))==null?void 0:i.name)||"",a=prompt("Enter a new name for this task:",n);a!==null&&a.trim()!==""?(t.customNames||(t.customNames={}),t.customNames[e]=a.trim(),y.save(t),v()):a!==null&&a.trim()===""&&t.customNames&&t.customNames[e]&&(delete t.customNames[e],y.save(t),v())}function H(e){const n=prompt("Enter a name for the new activity:");if(!n||n.trim()==="")return;const a=`custom-${Date.now()}`;let s="Daily_Quest";e==="three-day"&&(s="Three_Day_Instance"),e==="weekly"&&(s="Weekly_Quest"),t.customActivities||(t.customActivities=[]),t.customActivities.push({id:a,name:n.trim(),type:s}),t.items[a]={completed:!1,lastChangedAt:Date.now()},y.save(t),v()}function F(e){confirm("Are you sure you want to remove this activity?")&&(t.hiddenActivities||(t.hiddenActivities=[]),t.hiddenActivities.push(e),y.save(t),v())}x.addEventListener("change",e=>{const n=e.target;n&&n.matches(".item-checkbox")&&M(n.dataset.id)});x.addEventListener("click",e=>{const n=e.target,a=n.closest(".edit-name-btn");if(a){e.preventDefault(),Q(a.dataset.id);return}const s=n.closest(".remove-activity-btn");if(s){e.preventDefault(),F(s.dataset.id);return}const i=n.closest(".add-activity-btn");if(i){e.preventDefault(),H(i.dataset.group);return}const o=n.closest(".calendar-day");if(o&&!o.classList.contains("empty")){const c=o.getAttribute("data-date");c&&c!==u&&(u=c,R(),v())}});function Y(){x.innerHTML=`
    <header class="animate-fade-in">
      <h1>RocNote</h1>
      <p>Game Checklist & Reset Tracker</p>
    </header>
    <div id="calendar-container"></div>
    <div id="checklist-container" class="glass-panel animate-fade-in" style="animation-delay: 0.2s"></div>
  `,R(),v()}function R(){const e=document.getElementById("calendar-container");if(!e)return;const n=new Date,a=n.getFullYear(),s=n.getMonth(),i=p(n),o=new Date(a,s,1).getDay(),c=new Date(a,s+1,0).getDate();let d=`
    <div class="calendar-wrapper glass-panel animate-fade-in" style="animation-delay: 0.1s">
      <div class="calendar-header">
        <div class="calendar-title">${["January","February","March","April","May","June","July","August","September","October","November","December"][s]} ${a}</div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday">Sun</div>
        <div class="calendar-weekday">Mon</div>
        <div class="calendar-weekday">Tue</div>
        <div class="calendar-weekday">Wed</div>
        <div class="calendar-weekday">Thu</div>
        <div class="calendar-weekday">Fri</div>
        <div class="calendar-weekday">Sat</div>
  `;for(let r=0;r<o;r++)d+='<div class="calendar-day empty"></div>';for(let r=1;r<=c;r++){const m=new Date(a,s,r),h=p(m),T=h===i,b=h===u,f=new Date(a,s,r,0,0,0,0).getTime(),N=f+864e5,E=k(f-1),$=E>=f&&E<N,B=A(f-1,S),_=B>=f&&B<N;let D="";($||_)&&(D+='<div class="badges-container">',$&&(D+='<div class="reset-dot dot-weekly" title="Weekly Reset"></div>'),_&&(D+='<div class="reset-dot dot-threeday" title="3-Day Reset"></div>'),D+="</div>"),d+=`
      <div class="calendar-day ${T?"today":""} ${b?"selected":""}" data-date="${h}">
        <span class="day-number">${r}</span>
        ${D}
      </div>
    `}d+=`
      </div>
    </div>
  `,e.innerHTML=d}function v(){const e=document.getElementById("checklist-container");if(!e)return;const n=p(new Date),a=u!==n,s=t.history[u]||{},i={daily:{label:"Daily",items:[]},"three-day":{label:"3-Day",items:[]},weekly:{label:"Weekly",items:[]}};C().forEach(c=>{c.type.startsWith("Daily")?i.daily.items.push(c):c.type.startsWith("Three_Day")?i["three-day"].items.push(c):c.type.startsWith("Weekly")&&i.weekly.items.push(c)});let o="";a&&(o+=`
      <div style="margin-bottom: 1rem; text-align: center; color: var(--warning-color); font-weight: 600; font-size: 0.875rem;">
        Viewing Historical Data (Read-Only)
      </div>
    `);for(const[c,l]of Object.entries(i)){if(l.items.length===0)continue;const d=l.items.filter(r=>{var m;return a?s[r.id]||!1:((m=t.items[r.id])==null?void 0:m.completed)||!1}).length;o+=`
      <div class="checklist-group">
        <div class="group-header">
          <div class="group-title-container">
            <span class="group-title">${l.label} Activities</span>
            ${a?"":`<button class="add-activity-btn" data-group="${c}" title="Add Activity">+</button>`}
          </div>
          <span class="group-badge">${d} / ${l.items.length}</span>
        </div>
        <div class="items-list">
    `,l.items.forEach(r=>{var b,f;const m=a?s[r.id]||!1:((b=t.items[r.id])==null?void 0:b.completed)||!1,h=a?"disabled":"",T=((f=t.customNames)==null?void 0:f[r.id])||r.name;o+=`
        <label class="checklist-item ${a?"read-only":""}">
          <input type="checkbox" class="item-checkbox" data-id="${r.id}" ${m?"checked":""} ${h} />
          <div class="checkbox-custom"></div>
          <span class="item-name">${T}</span>
          <div class="item-actions">
            ${a?"":`
              <button class="edit-name-btn" data-id="${r.id}" title="Edit Name">✎</button>
              <button class="remove-activity-btn" data-id="${r.id}" title="Remove">🗑️</button>
            `}
          </div>
        </label>
      `}),o+=`
        </div>
      </div>
    `}e.innerHTML=o}function q(){setInterval(()=>{const e=Date.now(),n=W();let a=!1;if(e>=t.nextResetBoundaries.daily&&(t.items=g(t.items,"daily"),t.nextResetBoundaries.daily=I(e,n),a=!0),e>=t.nextResetBoundaries.threeDay&&(t.items=g(t.items,"three-day"),t.nextResetBoundaries.threeDay=A(e,S),a=!0),e>=t.nextResetBoundaries.weekly&&(t.items=g(t.items,"weekly"),t.nextResetBoundaries.weekly=k(e),a=!0),a){y.save(t);const s=u,i=p(new Date);s!==i&&(u=i),v(),R()}},1e3)}P();
