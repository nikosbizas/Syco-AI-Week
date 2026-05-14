import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getMyEvents, toggleMyEvent, isMyEvent } from './lib/store'
import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory, hasConflict, timeToMinutes } from './lib/utils'
import type { Event, CategoryId } from './lib/types'
import eventsData from './data/events.json'

const allEvents: Event[] = eventsData.events as Event[]

;(window as any).Alpine = Alpine
Alpine.start()
initApp('events')

let currentCategory: CategoryId | '' = ''
let currentDay = 1
let currentView: 'list' | 'timeline' = 'list'
let currentModalEvent: Event | null = null

// Parse URL params
const params = new URLSearchParams(window.location.search)
const urlCat = params.get('category') as CategoryId | null
if (urlCat) currentCategory = urlCat

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

  return allEvents
    .filter(e => {
      if (e.date !== dateStr) return false
      if (currentCategory && !e.categories.includes(currentCategory)) return false
      if (query) {
        const searchStr = [e.title, ...e.speakers.map(s => s.name + ' ' + s.company)].join(' ').toLowerCase()
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
  const container = document.getElementById('timeline-content')
  if (!container) return

  // Time slots 10:00 - 19:00 in 30min increments
  const slots: string[] = []
  for (let h = 10; h <= 19; h++) {
    slots.push(`${h.toString().padStart(2,'0')}:00`)
    if (h < 19) slots.push(`${h.toString().padStart(2,'0')}:30`)
  }

  const myIds = getMyEvents()

  const slotsHtml = slots.map(slot => {
    const slotMins = timeToMinutes(slot)
    const eventsInSlot = filtered.filter(e => {
      const start = timeToMinutes(e.startTime)
      const end = timeToMinutes(e.endTime)
      return start <= slotMins && end > slotMins
    })

    const isHalf = slot.endsWith(':30')

    return `
      <div class="flex items-start gap-2 min-h-[52px] py-1" style="border-bottom:1px solid var(--border)">
        <div class="text-xs flex-shrink-0 w-12 pt-1" style="color:var(--text-2);text-align:right">
          ${!isHalf ? slot : ''}
        </div>
        <div class="flex-1 flex flex-col gap-1 min-h-[36px]">
          ${eventsInSlot.map(e => {
            const catId = primaryCategory(e)
            const catColor = CATEGORY_COLORS[catId]
            const saved = myIds.includes(e.id)
            return `
              <div class="timeline-event-block cursor-pointer"
                   style="background:${catColor}22;color:${catColor};border-left:3px solid ${catColor};${saved ? `box-shadow:0 0 0 1px ${catColor}` : ''}"
                   onclick="openEventModal('${e.id}')">
                <span class="font-semibold">${formatTime(e.startTime)}</span>
                <span class="ml-1 opacity-90">${e.title.substring(0, 45)}${e.title.length > 45 ? '…' : ''}</span>
              </div>
            `
          }).join('')}
        </div>
      </div>
    `
  }).join('')

  container.innerHTML = slotsHtml
}

function render() {
  if (currentView === 'list') {
    renderEventsList()
  } else {
    renderTimeline()
  }
}

// Public functions
;(window as any).eventsFilter = () => render()

;(window as any).eventsSetCategory = (cat: CategoryId | '') => {
  currentCategory = cat
  // Update chip states
  document.querySelectorAll('[id^="cat-"]').forEach(el => el.classList.remove('active'))
  document.getElementById(cat ? `cat-${cat}` : 'cat-all')?.classList.add('active')
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

;(window as any).toggleSave = (id: string) => {
  const added = toggleMyEvent(id)
  const event = allEvents.find(e => e.id === id)
  if (event) {
    showToast(added ? `Saved: ${event.title.substring(0, 40)}…` : 'Removed from My List')
    // Check for conflicts
    if (added) {
      const myIds = getMyEvents()
      if (hasConflict(event, myIds, allEvents)) {
        setTimeout(() => showToast('⚡ Time conflict with another saved event', 'var(--warning)'), 2600)
      }
    }
  }
  render()
}

;(window as any).openEventModal = (id: string) => {
  const event = allEvents.find(e => e.id === id)
  if (!event) return
  currentModalEvent = event

  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId]
  const catLabel = CATEGORY_LABELS[catId]
  const saved = isMyEvent(id)

  const modalEl = document.getElementById('event-modal')
  const titleEl = document.getElementById('modal-title')
  const timeEl = document.getElementById('modal-time')
  const stageEl = document.getElementById('modal-stage')
  const speakersEl = document.getElementById('modal-speakers')
  const catBadgeEl = document.getElementById('modal-cat-badge')
  const saveBtn = document.getElementById('modal-save-btn')

  if (catBadgeEl) catBadgeEl.innerHTML = `<span class="cat-badge cat-${catId}">${catLabel}</span>`
  if (titleEl) titleEl.textContent = event.title
  if (timeEl) timeEl.textContent = `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
  if (stageEl) stageEl.textContent = event.stage + (event.date === '2026-05-19' ? ' · Day 1, May 19' : ' · Day 2, May 20')
  if (speakersEl) {
    speakersEl.innerHTML = event.speakers.map(s => `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style="background:${catColor}22;color:${catColor}">${s.name.charAt(0)}</div>
        <div>
          <div class="text-sm font-medium" style="color:var(--text-1)">${s.name}</div>
          <div class="text-xs" style="color:var(--text-2)">${[s.role, s.company].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
    `).join('')
  }
  if (saveBtn) {
    saveBtn.textContent = saved ? '✓ In My List — Remove' : 'Save to My List'
    saveBtn.style.background = saved ? 'var(--bg-elevated)' : 'var(--accent)'
    saveBtn.style.border = saved ? '1px solid var(--accent)' : 'none'
    saveBtn.style.color = saved ? 'var(--accent)' : 'white'
  }
  modalEl?.classList.remove('hidden')
}

;(window as any).closeEventModal = (e?: MouseEvent) => {
  if (!e || e.target === document.getElementById('event-modal')) {
    document.getElementById('event-modal')?.classList.add('hidden')
  }
}

;(window as any).modalToggleSave = () => {
  if (!currentModalEvent) return
  const added = toggleMyEvent(currentModalEvent.id)
  ;(window as any).openEventModal(currentModalEvent.id)
  render()
  showToast(added ? 'Saved to My List' : 'Removed from My List')
}

// Init
if (urlCat) {
  ;(window as any).eventsSetCategory(urlCat)
} else {
  render()
}

// Set active day based on today
const today = new Date()
if (today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 20) {
  ;(window as any).eventsSetDay(2)
}
