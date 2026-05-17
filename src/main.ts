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

function getGameDateString(now: number): string {
  // Game day starts at 4:00 AM Bangkok time (UTC+7) = 21:00 UTC.
  // To map 21:00 UTC to midnight for correct date extraction, we shift by +3 hours.
  const d = new Date(now + 3 * 3600 * 1000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getActiveActivities() {
  if (!state) return ACTIVITIES;
  const hidden = state.hiddenActivities || [];
  const custom = state.customActivities || [];
  return [...ACTIVITIES, ...custom].filter(a => !hidden.includes(a.id));
}

let selectedDateString: string = getGameDateString(Date.now());

const appEl = document.querySelector<HTMLDivElement>('#app')!;

function initApp() {
  const now = Date.now();
  
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
      state.nextResetBoundaries.daily = nextDailyReset(now);
      changed = true;
    }
    
    // Check individual rolling resets
    for (const [, itemState] of Object.entries(state.items)) {
      if (itemState.completed && itemState.nextResetAt && now >= itemState.nextResetAt) {
        itemState.completed = false;
        delete itemState.nextResetAt;
        changed = true;
      }
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
        daily: nextDailyReset(now),
        threeDay: nextThreeDayReset(now, THREE_DAY_ANCHOR_DATE),
        weekly: nextWeeklyReset(now),
      }
    };
    StorageService.save(state);
  }

  // Set selected date to today initially
  selectedDateString = getGameDateString(Date.now());

  renderApp();
  startTimers();
}

function handleToggle(id: string) {
  const todayString = getGameDateString(Date.now());
  const isHistorical = selectedDateString !== todayString;

  if (isHistorical) {
    if (!state.history[selectedDateString]) {
      state.history[selectedDateString] = {};
    }
    const currentVal = state.history[selectedDateString][id] || false;
    state.history[selectedDateString][id] = !currentVal;
    StorageService.save(state);
    renderChecklist();
    return;
  }

  const item = state.items[id];
  if (item) {
    item.completed = !item.completed;
    item.lastChangedAt = Date.now();
    
    if (item.completed) {
      const activityType = getActiveActivities().find(a => a.id === id)?.type;
      if (activityType?.startsWith('Three_Day')) {
        item.nextResetAt = Date.now() + 72 * 3600 * 1000;
      } else if (activityType?.startsWith('Weekly')) {
        item.nextResetAt = Date.now() + 7 * 24 * 3600 * 1000;
      }
    } else {
      delete item.nextResetAt;
    }
    
    // Record into history for today
    if (!state.history[todayString]) {
      state.history[todayString] = {};
    }
    state.history[todayString][id] = item.completed;
    
    StorageService.save(state);
    renderChecklist(); 
    renderCalendar(); // Refresh calendar to update dots
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

  const gameNow = new Date(Date.now() + 3 * 3600 * 1000);
  const year = gameNow.getUTCFullYear();
  const month = gameNow.getUTCMonth();
  const todayDateStr = getGameDateString(Date.now());

  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  
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

  const activeActs = getActiveActivities();
  const actTypeById = new Map(activeActs.map(a => [a.id, a.type]));

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const isToday = dateStr === todayDateStr;
    const isSelected = dateStr === selectedDateString;
    
    // Game day boundaries (Starts at 21:00 UTC previous day, which is -3 hours from midnight UTC)
    const gameStartMs = Date.UTC(year, month, d) - (3 * 3600 * 1000);
    const gameEndMs = gameStartMs + 86400000;
    
    let hasWeekly = false;
    let hasThreeDay = false;
    
    // Check item resets
    for (const [id, itemState] of Object.entries(state.items)) {
      if (itemState.nextResetAt && itemState.nextResetAt >= gameStartMs && itemState.nextResetAt < gameEndMs) {
        const activityType = actTypeById.get(id);
        if (activityType?.startsWith('Three_Day')) hasThreeDay = true;
        if (activityType?.startsWith('Weekly')) hasWeekly = true;
      }
    }
    
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
  
  const todayString = getGameDateString(Date.now());
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
        Viewing Historical Data
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
      const disabledAttr = '';
      const displayName = state.customNames?.[act.id] || act.name;
      
      html += `
        <label class="checklist-item">
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
    let changed = false;
    
    if (now >= state.nextResetBoundaries.daily) {
      state.items = applyResets(state.items, 'daily');
      state.nextResetBoundaries.daily = nextDailyReset(now);
      changed = true;
    }
    
    // Check individual rolling resets
    for (const [, itemState] of Object.entries(state.items)) {
      if (itemState.completed && itemState.nextResetAt && now >= itemState.nextResetAt) {
        itemState.completed = false;
        delete itemState.nextResetAt;
        changed = true;
      }
    }
    
    if (changed) {
      StorageService.save(state);
      
      // Auto-update selectedDateString if it was on the previous 'today'
      const oldToday = selectedDateString;
      const newToday = getGameDateString(Date.now());
      if (oldToday !== newToday) {
         selectedDateString = newToday; // keep the user on "today" automatically
      }
      
      renderChecklist();
      renderCalendar(); // Refresh calendar if day changes
    }
  }, 1000);
}

initApp();
