import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, toggleMyEvent, getProfile } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, hasConflict, timeToMinutes, isSuggestedEvent, getEventPrimaryTeam, isEnglishEvent } from './lib/utils'
import { initEventModal, openEventModal, closeEventModal, modalToggleSave, setModalNavList, modalNavPrev, modalNavNext } from './lib/eventModal'
import type { Event, CategoryId } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()
initApp('events')
initEventModal(allEvents, () => render())

// All unique stages for the filter dropdown
const ALL_STAGES = [...new Set(allEvents.map(e => e.stage))].sort()

const TEAM_CHIP_LABELS: Record<string, string> = {
  'social-content':  '✨ For Social',
  'creative-design': '✨ For Creative',
  'development':     '✨ For Dev',
  'account':         '✨ For Account',
}

let currentCategory: CategoryId | '' = ''
let currentStage = ''
let currentDay = 1
let currentView: 'list' | 'timeline' = 'list'
let showSuggestedOnly = false
let showTeamOnly = false
let showEnglishOnly = false

// Parse URL params
const params = new URLSearchParams(window.location.search)
const urlCat = params.get('category') as CategoryId | null
if (urlCat) currentCategory = urlCat
if (params.get('filter') === 'for-syco') showSuggestedOnly = true
if (params.get('filter') === 'for-team') showTeamOnly = true
if (params.get('filter') === 'english') showEnglishOnly = true

function buildStageSelect() {
  const sel = document.getElementById('stage-select') as HTMLSelectElement
  if (!sel) return
  sel.innerHTML = `<option value="">All Stages</option>` +
    ALL_STAGES.map(s => `<option value="${s}">${s}</option>`).join('')
}

function buildTeamChip() {
  const profile = getProfile()
  if (!profile.role) return

  const label = TEAM_CHIP_LABELS[profile.role]
  if (!label) return

  // Insert chip after the "For Syco" chip
  const forSycoBtn = document.getElementById('cat-for-syco')
  if (!forSycoBtn || document.getElementById('cat-for-team')) return

  const btn = document.createElement('button')
  btn.id = 'cat-for-team'
  btn.className = 'filter-chip flex-shrink-0'
  btn.style.borderColor = 'var(--accent)'
  btn.textContent = label
  btn.onclick = () => (window as any).eventsSetTeam()
  forSycoBtn.insertAdjacentElement('afterend', btn)
}

function showToast(msg: string, color = 'var(--accent)') {
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = msg
  t.style.borderColor = color
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

function getFilteredEvents(): Event[] {
  const dateStr = currentDay === 1 ? '2026-05-19' : '2026-05-20'
  const query = (document.getElementById('search-input') as HTMLInputElement)?.value.toLowerCase() || ''
  const profile = getProfile()

  return allEvents
    .filter(e => {
      if (e.date !== dateStr) return false
      if (showSuggestedOnly && !isSuggestedEvent(e)) return false
      if (showTeamOnly) {
        if (!isSuggestedEvent(e)) return false
        const team = getEventPrimaryTeam(e)
        if (team && team !== profile.role) return false
      }
      if (showEnglishOnly && !isEnglishEvent(e)) return false
      if (currentCategory && !e.categories.includes(currentCategory)) return false
      if (currentStage && e.stage !== currentStage) return false
      if (query) {
        const searchStr = [e.title, e.description || '', ...e.speakers.map(s => s.name + ' ' + s.company)].join(' ').toLowerCase()
        if (!searchStr.includes(query)) return false
      }
      return true
    })
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

function renderEventsList() {
  const filtered = getFilteredEvents()
  const myIds = getMyEvents()
  const container = document.getElementById('events-list')
  const countEl = document.getElementById('events-count')
  if (!container) return

  if (countEl) countEl.textContent = `${filtered.length} session${filtered.length !== 1 ? 's' : ''}`

  if (filtered.length === 0) {
    container.innerHTML = `<div class="event-card text-center py-8" style="color:var(--text-2)">No events found</div>`
    return
  }

  container.innerHTML = filtered.map(event => {
    const catId = primaryCategory(event)
    const catColor = CATEGORY_COLORS[catId] || '#888'
    const catLabel = CATEGORY_LABELS[catId] || catId
    const saved = myIds.includes(event.id)
    const conflict = saved ? false : hasConflict(event, myIds, allEvents)

    return `
      <div class="event-card ${saved ? 'saved' : ''} ${conflict ? 'conflict' : ''}" id="card-${event.id}">
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0 cursor-pointer" onclick="openEventModal('${event.id}')">
            <div class="flex items-center gap-2 mb-1.5 flex-wrap">
              <span style="font-size:11px;font-weight:600;color:${catColor}">${formatTime(event.startTime)} – ${formatTime(event.endTime)}</span>
              <span class="cat-badge cat-${catId}">${catLabel}</span>
              ${conflict ? `<span class="cat-badge" style="background:rgba(245,158,11,0.15);color:#f59e0b">⚡ Conflict</span>` : ''}
              ${saved ? `<span class="cat-badge" style="background:var(--accent-dim);color:var(--accent)">✓ Saved</span>` : ''}
            </div>
            <div class="font-semibold text-sm leading-snug" style="color:var(--text-1)">${event.title}</div>
            ${event.speakers.length ? `<div class="text-xs mt-1" style="color:var(--text-2)">${speakerText(event)}</div>` : ''}
            <div class="text-xs mt-0.5" style="color:var(--text-2);opacity:0.6">${event.stage}</div>
          </div>
          <button onclick="toggleSave('${event.id}')" class="btn-icon flex-shrink-0 ${saved ? 'active' : ''}" title="${saved ? 'Remove from My List' : 'Save to My List'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    `
  }).join('')
}

function renderTimeline() {
  const filtered = getFilteredEvents()
  const myIds = getMyEvents()
  const container = document.getElementById('timeline-content')
  if (!container) return

  if (filtered.length === 0) {
    container.innerHTML = `<div class="event-card text-center py-8" style="color:var(--text-2)">No events found</div>`
    return
  }

  const HOUR_H = 80
  const TSTART = 9 * 60
  const GUTTER = 44
  const COL_W = 160
  const HEADER_H = 36
  const PX_MIN = HOUR_H / 60

  // One column per stage, sorted by earliest event in that stage
  const stageFirst = new Map<string, number>()
  filtered.forEach(e => {
    const t = timeToMinutes(e.startTime)
    const cur = stageFirst.get(e.stage)
    if (cur === undefined || t < cur) stageFirst.set(e.stage, t)
  })
  const stages = [...stageFirst.keys()].sort((a, b) => stageFirst.get(a)! - stageFirst.get(b)!)
  const stageCol = new Map(stages.map((s, i) => [s, i]))
  const totalW = GUTTER + stages.length * COL_W

  // Header background + stage name labels
  const headersHtml =
    `<div style="position:absolute;top:0;left:0;width:${totalW}px;height:${HEADER_H}px;background:var(--bg-elevated);border-bottom:2px solid var(--border);pointer-events:none"></div>` +
    stages.map((stage, i) => {
      const left = GUTTER + i * COL_W
      return `<div style="position:absolute;top:0;left:${left + 1}px;width:${COL_W - 2}px;height:${HEADER_H}px;padding:0 7px;font-size:10px;font-weight:700;letter-spacing:0.03em;color:var(--text-1);display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${stage}</div>`
    }).join('')

  // Vertical separators (gutter edge + between every stage column)
  const vSepsHtml =
    `<div style="position:absolute;top:0;left:${GUTTER}px;width:1px;height:100%;background:var(--border);pointer-events:none"></div>` +
    stages.slice(1).map((_, i) => {
      const left = GUTTER + (i + 1) * COL_W
      return `<div style="position:absolute;top:${HEADER_H}px;left:${left}px;width:1px;height:${11 * HOUR_H}px;background:var(--border);opacity:0.4;pointer-events:none"></div>`
    }).join('')

  // Hour grid lines
  const hoursHtml = Array.from({ length: 12 }, (_, i) => {
    const h = 9 + i
    const top = HEADER_H + i * HOUR_H
    return `<div style="position:absolute;top:${top}px;left:0;width:${totalW}px;display:flex;align-items:flex-start;pointer-events:none">
      <span style="width:${GUTTER}px;flex-shrink:0;font-size:10px;color:var(--text-2);text-align:right;padding-right:6px;margin-top:-7px">${h.toString().padStart(2, '0')}:00</span>
      <div style="flex:1;border-top:1px solid var(--border)"></div>
    </div>`
  }).join('')

  // Half-hour dashed lines
  const halfHtml = Array.from({ length: 11 }, (_, i) => {
    const top = HEADER_H + i * HOUR_H + HOUR_H / 2
    return `<div style="position:absolute;top:${top}px;left:${GUTTER}px;width:${totalW - GUTTER}px;border-top:1px dashed var(--border);opacity:0.3;pointer-events:none"></div>`
  }).join('')

  // Event blocks — each event goes into its stage's column
  const blocksHtml = filtered.map(e => {
    const catId = primaryCategory(e)
    const catColor = CATEGORY_COLORS[catId] || '#888'
    const catLabel = CATEGORY_LABELS[catId] || catId
    const saved = myIds.includes(e.id)
    const col = stageCol.get(e.stage) ?? 0
    const startMins = timeToMinutes(e.startTime) - TSTART
    const durMins = timeToMinutes(e.endTime) - timeToMinutes(e.startTime)
    const top = HEADER_H + startMins * PX_MIN
    const height = Math.max(durMins * PX_MIN, 22)
    const left = GUTTER + col * COL_W + 2
    const width = COL_W - 4
    return `<div class="cursor-pointer" onclick="openEventModal('${e.id}')"
         style="position:absolute;top:${top}px;left:${left}px;width:${width}px;height:${height}px;
                background:${catColor}22;border-left:3px solid ${catColor};color:${catColor};
                border-radius:4px;padding:3px 6px;overflow:hidden;
                ${saved ? `box-shadow:0 0 0 1px ${catColor};` : ''}">
      <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${formatTime(e.startTime)} ${e.title}</div>
      ${height >= 30 ? `<div style="font-size:10px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3">${catLabel}</div>` : ''}
    </div>`
  }).join('')

  const totalH = HEADER_H + 11 * HOUR_H
  container.innerHTML = `<div style="position:relative;width:${totalW}px;height:${totalH}px">${headersHtml}${vSepsHtml}${hoursHtml}${halfHtml}${blocksHtml}</div>`
}

function render() {
  setModalNavList(getFilteredEvents().map(e => e.id))
  if (currentView === 'list') {
    renderEventsList()
  } else {
    renderTimeline()
  }
}

// Public functions
;(window as any).eventsFilter = () => render()

// "All" resets everything. A specific category only affects category chips —
// special toggles (For Syco, English, For Team) are preserved.
;(window as any).eventsSetCategory = (cat: CategoryId | '') => {
  currentCategory = cat
  if (cat === '') {
    // All button: full reset
    showSuggestedOnly = false
    showTeamOnly = false
    showEnglishOnly = false
    document.querySelectorAll('[id^="cat-"]').forEach(el => el.classList.remove('active'))
    document.getElementById('cat-all')?.classList.add('active')
  } else {
    // Category chip: exclusive among category chips, keep special filters intact
    document.querySelectorAll('[id^="cat-"]:not(#cat-for-syco):not(#cat-for-team):not(#cat-english)').forEach(el => el.classList.remove('active'))
    document.getElementById(`cat-${cat}`)?.classList.add('active')
  }
  render()
}

// Toggle — independent from other special filters
;(window as any).eventsSetSuggested = () => {
  showSuggestedOnly = !showSuggestedOnly
  if (showSuggestedOnly) {
    showTeamOnly = false
    currentCategory = ''
    document.querySelectorAll('[id^="cat-"]:not(#cat-for-syco):not(#cat-for-team):not(#cat-english)').forEach(el => el.classList.remove('active'))
    document.getElementById('cat-all')?.classList.add('active')
    document.getElementById('cat-for-team')?.classList.remove('active')
  }
  document.getElementById('cat-for-syco')?.classList.toggle('active', showSuggestedOnly)
  render()
}

;(window as any).eventsSetTeam = () => {
  showTeamOnly = !showTeamOnly
  if (showTeamOnly) {
    showSuggestedOnly = false
    currentCategory = ''
    document.querySelectorAll('[id^="cat-"]:not(#cat-for-syco):not(#cat-for-team):not(#cat-english)').forEach(el => el.classList.remove('active'))
    document.getElementById('cat-all')?.classList.add('active')
    document.getElementById('cat-for-syco')?.classList.remove('active')
  }
  document.getElementById('cat-for-team')?.classList.toggle('active', showTeamOnly)
  render()
}

// Toggle — independent from all other filters
;(window as any).eventsSetEnglish = () => {
  showEnglishOnly = !showEnglishOnly
  document.getElementById('cat-english')?.classList.toggle('active', showEnglishOnly)
  render()
}

;(window as any).eventsSetDay = (day: number) => {
  currentDay = day
  document.getElementById('day1-tab')?.classList.toggle('active', day === 1)
  document.getElementById('day2-tab')?.classList.toggle('active', day === 2)
  render()
}

;(window as any).eventsSetView = (view: 'list' | 'timeline') => {
  currentView = view
  document.getElementById('list-view')?.classList.toggle('hidden', view !== 'list')
  document.getElementById('timeline-view')?.classList.toggle('hidden', view !== 'timeline')

  const listBtn = document.getElementById('view-list-btn')
  const timelineBtn = document.getElementById('view-timeline-btn')
  if (listBtn && timelineBtn) {
    if (view === 'list') {
      listBtn.style.cssText = 'background:var(--accent);color:white'
      timelineBtn.style.cssText = 'background:var(--bg-surface);color:var(--text-2)'
    } else {
      timelineBtn.style.cssText = 'background:var(--accent);color:white'
      listBtn.style.cssText = 'background:var(--bg-surface);color:var(--text-2)'
    }
  }
  render()
}

;(window as any).eventsSetStage = (stage: string) => {
  currentStage = stage
  render()
}

;(window as any).toggleSave = (id: string) => {
  const added = toggleMyEvent(id)
  const event = allEvents.find(e => e.id === id)
  if (event) {
    showToast(added ? `Saved: ${event.title.substring(0, 40)}…` : 'Removed from My List')
    if (added) {
      const myIds = getMyEvents()
      if (hasConflict(event, myIds, allEvents)) {
        setTimeout(() => showToast('⚡ Time conflict with another saved event', 'var(--warning)'), 2600)
      }
    }
  }
  render()
}

;(window as any).openEventModal = openEventModal
;(window as any).closeEventModal = closeEventModal
;(window as any).modalToggleSave = modalToggleSave
;(window as any).modalNavPrev = modalNavPrev
;(window as any).modalNavNext = modalNavNext

// Init
buildStageSelect()
buildTeamChip()

// Activate chips from URL params (multiple can be active simultaneously)
if (showSuggestedOnly) document.getElementById('cat-for-syco')?.classList.add('active')
if (showTeamOnly) document.getElementById('cat-for-team')?.classList.add('active')
if (showEnglishOnly) document.getElementById('cat-english')?.classList.add('active')
if (!showSuggestedOnly && !showTeamOnly && !urlCat) {
  document.getElementById('cat-all')?.classList.add('active')
}
if (urlCat) {
  document.querySelectorAll('[id^="cat-"]:not(#cat-for-syco):not(#cat-for-team):not(#cat-english)').forEach(el => el.classList.remove('active'))
  document.getElementById(`cat-${urlCat}`)?.classList.add('active')
}
render()

const today = new Date()
if (today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 20) {
  ;(window as any).eventsSetDay(2)
}
