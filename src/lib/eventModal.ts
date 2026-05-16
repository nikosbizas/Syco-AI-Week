import { formatTime, speakerText, CATEGORY_COLORS, CATEGORY_LABELS, primaryCategory } from './utils'
import { isMyEvent, toggleMyEvent } from './store'
import type { Event } from './types'

let _allEvents: Event[] = []
let _currentEvent: Event | null = null
let _onAfterToggle: (() => void) | null = null
let _navList: string[] = []
let _animating = false

export function setModalNavList(ids: string[]) {
  _navList = ids
}

export function modalNavPrev() {
  if (!_currentEvent) return
  const idx = _navList.indexOf(_currentEvent.id)
  if (idx <= 0) return
  const newId = _navList[idx - 1]
  animateNav('right', () => openEventModal(newId))
}

export function modalNavNext() {
  if (!_currentEvent) return
  const idx = _navList.indexOf(_currentEvent.id)
  if (idx === -1 || idx >= _navList.length - 1) return
  const newId = _navList[idx + 1]
  animateNav('left', () => openEventModal(newId))
}

function animateNav(direction: 'left' | 'right', callback: () => void) {
  if (_animating) return
  _animating = true
  setTimeout(() => { _animating = false }, 280)

  const sheet = document.querySelector('#event-modal .modal-sheet') as HTMLElement | null
  if (!sheet) {
    callback()
    return
  }

  // Exit: slide out in the given direction
  const exitX = direction === 'left' ? '-50px' : '50px'
  sheet.style.transition = 'transform 0.12s ease-in, opacity 0.12s ease-in'
  sheet.style.transform = `translateX(${exitX})`
  sheet.style.opacity = '0'

  setTimeout(() => {
    // Run callback to update content
    callback()

    // Enter: start from opposite side
    const enterX = direction === 'left' ? '50px' : '-50px'
    sheet.style.transition = 'none'
    sheet.style.transform = `translateX(${enterX})`
    sheet.style.opacity = '0'

    // Force reflow
    void sheet.offsetHeight

    // Animate to final position
    sheet.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out'
    sheet.style.transform = 'translateX(0)'
    sheet.style.opacity = '1'
  }, 130)
}

export function initEventModal(events: Event[], onAfterToggle?: () => void) {
  _allEvents = events
  if (onAfterToggle) _onAfterToggle = onAfterToggle

  const sheet = document.querySelector('#event-modal .modal-sheet') as HTMLElement | null
  if (sheet) {
    let touchStartX = 0
    let touchStartY = 0

    sheet.addEventListener('touchstart', (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }, { passive: true })

    sheet.addEventListener('touchend', (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX
      const dy = e.changedTouches[0].clientY - touchStartY
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          modalNavNext()
        } else {
          modalNavPrev()
        }
      }
    }, { passive: true })
  }
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

  // Update nav UI
  const navEl     = document.getElementById('modal-nav')
  const navPosEl  = document.getElementById('modal-nav-pos')
  const prevBtn   = document.getElementById('modal-prev-btn') as HTMLButtonElement | null
  const nextBtn   = document.getElementById('modal-next-btn') as HTMLButtonElement | null
  const idx = _navList.indexOf(id)

  if (_navList.length > 1 && idx !== -1) {
    if (navEl) navEl.style.display = 'flex'
    if (navPosEl) navPosEl.textContent = `${idx + 1} / ${_navList.length}`
    if (prevBtn) {
      prevBtn.disabled = idx === 0
      prevBtn.style.opacity = idx === 0 ? '0.3' : '1'
    }
    if (nextBtn) {
      nextBtn.disabled = idx === _navList.length - 1
      nextBtn.style.opacity = idx === _navList.length - 1 ? '0.3' : '1'
    }
  } else {
    if (navEl) navEl.style.display = 'none'
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
