import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory } from './utils'
import { isMyEvent, toggleMyEvent } from './store'
import type { Event } from './types'

let _allEvents: Event[] = []
let _currentEvent: Event | null = null
let _onAfterToggle: (() => void) | null = null

export function initEventModal(events: Event[], onAfterToggle?: () => void) {
  _allEvents = events
  if (onAfterToggle) _onAfterToggle = onAfterToggle
}

export function openEventModal(id: string) {
  const event = _allEvents.find(e => e.id === id)
  if (!event) return
  _currentEvent = event

  const catId = primaryCategory(event)
  const catColor = CATEGORY_COLORS[catId] || '#888'
  const catLabel = CATEGORY_LABELS[catId] || catId
  const saved = isMyEvent(id)

  const modalEl   = document.getElementById('event-modal')
  const titleEl   = document.getElementById('modal-title')
  const timeEl    = document.getElementById('modal-time')
  const stageEl   = document.getElementById('modal-stage')
  const speakersEl= document.getElementById('modal-speakers')
  const descEl    = document.getElementById('modal-description')
  const catBadgeEl= document.getElementById('modal-cat-badge')
  const saveBtn   = document.getElementById('modal-save-btn')

  if (catBadgeEl) catBadgeEl.innerHTML = `<span class="cat-badge cat-${catId}">${catLabel}</span>`
  if (titleEl)    titleEl.textContent = event.title
  if (timeEl)     timeEl.textContent = `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
  if (stageEl)    stageEl.textContent = event.stage + (event.date === '2026-05-19' ? ' · Day 1, May 19' : ' · Day 2, May 20')

  if (descEl) {
    const desc = (event.description || '').trim()
    if (desc) {
      descEl.textContent = desc
      ;(descEl as HTMLElement).style.display = 'block'
    } else {
      ;(descEl as HTMLElement).style.display = 'none'
    }
  }

  if (speakersEl) {
    speakersEl.innerHTML = event.speakers.map(s => {
      const avatar = s.photo
        ? `<img src="${s.photo}" class="w-9 h-9 rounded-full object-cover flex-shrink-0" loading="lazy" />`
        : `<div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style="background:${catColor}22;color:${catColor}">${s.name.charAt(0)}</div>`
      return `
        <div class="flex items-center gap-2">
          ${avatar}
          <div>
            <div class="text-sm font-medium" style="color:var(--text-1)">${s.name}</div>
            <div class="text-xs" style="color:var(--text-2)">${[s.role, s.company].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      `
    }).join('')
  }

  if (saveBtn) {
    saveBtn.textContent = saved ? '✓ In My List — Remove' : 'Save to My List'
    saveBtn.style.cssText = saved
      ? 'background:var(--bg-elevated);border:1px solid var(--accent);color:var(--accent)'
      : 'background:var(--accent);border:none;color:white'
  }

  modalEl?.classList.add('is-open')
}

export function closeEventModal(e?: Event | MouseEvent) {
  if (!e || (e as MouseEvent).target === document.getElementById('event-modal')) {
    document.getElementById('event-modal')?.classList.remove('is-open')
  }
}

export function modalToggleSave() {
  if (!_currentEvent) return
  toggleMyEvent(_currentEvent.id)
  openEventModal(_currentEvent.id)
  _onAfterToggle?.()
}

export function getCurrentModalEvent(): Event | null {
  return _currentEvent
}
