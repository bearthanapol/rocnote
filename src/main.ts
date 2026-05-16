import './style.css';
import { ACTIVITIES, THREE_DAY_ANCHOR_DATE } from './config';
import { StorageService } from './storageService';
import {
  nextDailyReset,
  nextThreeDayReset,
  nextWeeklyReset,
  applyResets,
} from './resetEngine';
import type { PersistedState, ItemState } from './types';

// Global App State
let state: PersistedState;

function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getActiveActivities() {
  if (!state) return ACTIVITIES;
  const hidden = state.hiddenActivities || [];
  const custom = state.customActivities || [];
  return [...ACTIVITIES, ...custom].filter(a => !hidden.includes(a.id));
}

let selectedDateString: string = getLocalDateString(new Date());

const appEl = document.querySelector<HTMLDivElement>('#app')!;

function getTimezoneOffset() {
  return -new Date().getTimezoneOffset() * 60_000;
}

function initApp() {
  const now = Date.now();
  const tzOffset = getTimezoneOffset();
  
  // Load existing state
  const loadedState = StorageService.load();
  
  if (loadedState) {
    state = loadedState;
    if (!state.customNames) {
      state.customNames = {};
    }
    if (!state.customActivities) {
      state.customActivities = [];
    }
    if (!state.hiddenActivities) {
      state.hiddenActivities = [];
    }
    let changed = false;
    
    if (now >= state.nextResetBoundaries.daily) {
      state.items = applyResets(state.items, 'daily');
      state.nextResetBoundaries.daily = nextDailyReset(now, tzOffset);
      changed = true;
    }
    
    if (now >= state.nextResetBoundaries.threeDay) {
      state.items = applyResets(state.items, 'three-day');
      state.nextResetBoundaries.threeDay = nextThreeDayReset(now, THREE_DAY_ANCHOR_DATE);
      changed = true;
    }
    
    if (now >= state.nextResetBoundaries.weekly) {
      state.items = applyResets(state.items, 'weekly');
      state.nextResetBoundaries.weekly = nextWeeklyReset(now);
      changed = true;
    }
    
    if (changed) {
      StorageService.save(state);
    }
  } else {
    // Create new state
    const items: Record<string, ItemState> = {};
    ACTIVITIES.forEach(act => {
      items[act.id] = { completed: false, lastChangedAt: now };
    });
    
    state = {
      version: 2,
      items,
      history: {},
      customNames: {},
      customActivities: [],
      hiddenActivities: [],
      nextResetBoundaries: {
        daily: nextDailyReset(now, tzOffset),
        threeDay: nextThreeDayReset(now, THREE_DAY_ANCHOR_DATE),
        weekly: nextWeeklyReset(now),
      }
    };
    StorageService.save(state);
  }

  // Set selected date to today initially
  selectedDateString = getLocalDateString(new Date());

  renderApp();
  startTimers();
}

function handleToggle(id: string) {
  const todayString = getLocalDateString(new Date());
  if (selectedDateString !== todayString) {
    return; // Read-only for past dates
  }

  const item = state.items[id];
  if (item) {
    item.completed = !item.completed;
    item.lastChangedAt = Date.now();
    
    // Record into history for today
    if (!state.history[todayString]) {
      state.history[todayString] = {};
    }
    state.history[todayString][id] = item.completed;
    
    StorageService.save(state);
    renderChecklist(); 
  }
}

function handleEditName(id: string) {
  const currentName = state.customNames?.[id] || ACTIVITIES.find(a => a.id === id)?.name || '';
  const newName = prompt('Enter a new name for this task:', currentName);
  
  if (newName !== null && newName.trim() !== '') {
    if (!state.customNames) state.customNames = {};
    state.customNames[id] = newName.trim();
    StorageService.save(state);
    renderChecklist();
  } else if (newName !== null && newName.trim() === '') {
    // If they empty it, revert to default
    if (state.customNames && state.customNames[id]) {
      delete state.customNames[id];
      StorageService.save(state);
      renderChecklist();
    }
  }
}

function handleAddActivity(groupKey: string) {
  const name = prompt('Enter a name for the new activity:');
  if (!name || name.trim() === '') return;

  const id = `custom-${Date.now()}`;
  let type: import('./types').ActivityType = 'Daily_Quest';
  if (groupKey === 'three-day') type = 'Three_Day_Instance';
  if (groupKey === 'weekly') type = 'Weekly_Quest';

  if (!state.customActivities) state.customActivities = [];
  state.customActivities.push({ id, name: name.trim(), type });

  // Initialize its state
  state.items[id] = { completed: false, lastChangedAt: Date.now() };

  StorageService.save(state);
  renderChecklist();
}

function handleRemoveActivity(id: string) {
  if (!confirm('Are you sure you want to remove this activity?')) return;
  
  if (!state.hiddenActivities) state.hiddenActivities = [];
  state.hiddenActivities.push(id);
  StorageService.save(state);
  renderChecklist();
}

// Event delegation for checkboxes
appEl.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target && target.matches('.item-checkbox')) {
    handleToggle(target.dataset.id!);
  }
});

// Event delegation for calendar dates and buttons
appEl.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  
  const editBtn = target.closest('.edit-name-btn');
  if (editBtn) {
    e.preventDefault(); // Prevent label click
    handleEditName((editBtn as HTMLElement).dataset.id!);
    return;
  }

  const removeBtn = target.closest('.remove-activity-btn');
  if (removeBtn) {
    e.preventDefault();
    handleRemoveActivity((removeBtn as HTMLElement).dataset.id!);
    return;
  }

  const addBtn = target.closest('.add-activity-btn');
  if (addBtn) {
    e.preventDefault();
    handleAddActivity((addBtn as HTMLElement).dataset.group!);
    return;
  }
  
  const dayEl = target.closest('.calendar-day');
  if (dayEl && !dayEl.classList.contains('empty')) {
    const dateStr = dayEl.getAttribute('data-date');
    if (dateStr && dateStr !== selectedDateString) {
      selectedDateString = dateStr;
      renderCalendar();
      renderChecklist();
    }
  }
});

function renderApp() {
  appEl.innerHTML = `
    <header class="animate-fade-in">
      <h1>RocNote</h1>
      <p>Game Checklist & Reset Tracker</p>
    </header>
    <div id="calendar-container"></div>
    <div id="checklist-container" class="glass-panel animate-fade-in" style="animation-delay: 0.2s"></div>
  `;
  renderCalendar();
  renderChecklist();
}

function renderCalendar() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDateStr = getLocalDateString(now);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  let html = `
    <div class="calendar-wrapper glass-panel animate-fade-in" style="animation-delay: 0.1s">
      <div class="calendar-header">
        <div class="calendar-title">${monthNames[month]} ${year}</div>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday">Sun</div>
        <div class="calendar-weekday">Mon</div>
        <div class="calendar-weekday">Tue</div>
        <div class="calendar-weekday">Wed</div>
        <div class="calendar-weekday">Thu</div>
        <div class="calendar-weekday">Fri</div>
        <div class="calendar-weekday">Sat</div>
  `;

  // Pad empty days
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const loopDate = new Date(year, month, d);
    const dateStr = getLocalDateString(loopDate);
    
    const isToday = dateStr === todayDateStr;
    const isSelected = dateStr === selectedDateString;
    
    // Local day boundaries
    const localStart = new Date(year, month, d, 0, 0, 0, 0).getTime();
    const localEnd = localStart + 86400000;
    
    // Check if the next weekly reset falls on this day
    const weeklyBoundary = nextWeeklyReset(localStart - 1);
    const hasWeekly = weeklyBoundary >= localStart && weeklyBoundary < localEnd;
    
    // Check if the next 3-day reset falls on this day
    const threeDayBoundary = nextThreeDayReset(localStart - 1, THREE_DAY_ANCHOR_DATE);
    const hasThreeDay = threeDayBoundary >= localStart && threeDayBoundary < localEnd;
    
    let badgesHtml = '';
    if (hasWeekly || hasThreeDay) {
      badgesHtml += '<div class="badges-container">';
      if (hasWeekly) badgesHtml += '<div class="reset-dot dot-weekly" title="Weekly Reset"></div>';
      if (hasThreeDay) badgesHtml += '<div class="reset-dot dot-threeday" title="3-Day Reset"></div>';
      badgesHtml += '</div>';
    }

    html += `
      <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
        <span class="day-number">${d}</span>
        ${badgesHtml}
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderChecklist() {
  const container = document.getElementById('checklist-container');
  if (!container) return;
  
  const todayString = getLocalDateString(new Date());
  const isHistorical = selectedDateString !== todayString;
  const historyData = state.history[selectedDateString] || {};
  
  // Group activities
  const groups: Record<string, { label: string, items: import('./types').ActivityDefinition[] }> = {
    'daily': { label: 'Daily', items: [] },
    'three-day': { label: '3-Day', items: [] },
    'weekly': { label: 'Weekly', items: [] }
  };
  
  getActiveActivities().forEach(act => {
    if (act.type.startsWith('Daily')) groups['daily'].items.push(act);
    else if (act.type.startsWith('Three_Day')) groups['three-day'].items.push(act);
    else if (act.type.startsWith('Weekly')) groups['weekly'].items.push(act);
  });
  
  let html = '';
  
  if (isHistorical) {
    html += `
      <div style="margin-bottom: 1rem; text-align: center; color: var(--warning-color); font-weight: 600; font-size: 0.875rem;">
        Viewing Historical Data (Read-Only)
      </div>
    `;
  }
  
  for (const [groupKey, group] of Object.entries(groups)) {
    if (group.items.length === 0) continue;
    
    const completedCount = group.items.filter(act => {
      return isHistorical ? (historyData[act.id] || false) : (state.items[act.id]?.completed || false);
    }).length;
    
    html += `
      <div class="checklist-group">
        <div class="group-header">
          <div class="group-title-container">
            <span class="group-title">${group.label} Activities</span>
            ${!isHistorical ? `<button class="add-activity-btn" data-group="${groupKey}" title="Add Activity">+</button>` : ''}
          </div>
          <span class="group-badge">${completedCount} / ${group.items.length}</span>
        </div>
        <div class="items-list">
    `;
    
    group.items.forEach(act => {
      const isCompleted = isHistorical ? (historyData[act.id] || false) : (state.items[act.id]?.completed || false);
      const disabledAttr = isHistorical ? 'disabled' : '';
      const displayName = state.customNames?.[act.id] || act.name;
      
      html += `
        <label class="checklist-item ${isHistorical ? 'read-only' : ''}">
          <input type="checkbox" class="item-checkbox" data-id="${act.id}" ${isCompleted ? 'checked' : ''} ${disabledAttr} />
          <div class="checkbox-custom"></div>
          <span class="item-name">${displayName}</span>
          <div class="item-actions">
            ${!isHistorical ? `
              <button class="edit-name-btn" data-id="${act.id}" title="Edit Name">✎</button>
              <button class="remove-activity-btn" data-id="${act.id}" title="Remove">🗑️</button>
            ` : ''}
          </div>
        </label>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function startTimers() {
  setInterval(() => {
    const now = Date.now();
    const tzOffset = getTimezoneOffset();
    let changed = false;
    
    if (now >= state.nextResetBoundaries.daily) {
      state.items = applyResets(state.items, 'daily');
      state.nextResetBoundaries.daily = nextDailyReset(now, tzOffset);
      changed = true;
    }
    
    if (now >= state.nextResetBoundaries.threeDay) {
      state.items = applyResets(state.items, 'three-day');
      state.nextResetBoundaries.threeDay = nextThreeDayReset(now, THREE_DAY_ANCHOR_DATE);
      changed = true;
    }
    
    if (now >= state.nextResetBoundaries.weekly) {
      state.items = applyResets(state.items, 'weekly');
      state.nextResetBoundaries.weekly = nextWeeklyReset(now);
      changed = true;
    }
    
    if (changed) {
      StorageService.save(state);
      
      // Auto-update selectedDateString if it was on the previous 'today'
      const oldToday = selectedDateString;
      const newToday = getLocalDateString(new Date());
      if (oldToday !== newToday) {
         selectedDateString = newToday; // keep the user on "today" automatically
      }
      
      renderChecklist();
      renderCalendar(); // Refresh calendar if day changes
    }
  }, 1000);
}

initApp();
