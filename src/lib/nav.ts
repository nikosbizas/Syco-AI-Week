import { getMyEvents, getProfile } from './store'
import { applyAccentColor } from './utils'

export type PageId = 'dashboard' | 'events' | 'my-events' | 'access' | 'profile'

export function initApp(activePage: PageId) {
  // Apply saved accent color
  const profile = getProfile()
  if (profile.accent) applyAccentColor(profile.accent)

  // Set active nav state
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach(el => {
    if (el.dataset.nav === activePage) {
      el.classList.add('nav-active')
    }
  })

  // Update My Events badge count
  function updateBadge() {
    const count = getMyEvents().length
    document.querySelectorAll<HTMLElement>('[data-my-events-count]').forEach(el => {
      el.textContent = String(count)
      el.classList.toggle('hidden', count === 0)
    })
  }
  updateBadge()
  window.addEventListener('myevents-changed', updateBadge)

  // Burger menu
  const burgerBtn = document.getElementById('burger-btn')
  const drawer = document.getElementById('burger-drawer')
  const overlay = document.getElementById('burger-overlay')

  function openDrawer() {
    drawer?.classList.remove('translate-x-full')
    overlay?.classList.remove('hidden')
  }
  function closeDrawer() {
    drawer?.classList.add('translate-x-full')
    overlay?.classList.add('hidden')
  }

  burgerBtn?.addEventListener('click', openDrawer)
  overlay?.addEventListener('click', closeDrawer)
  document.getElementById('close-drawer')?.addEventListener('click', closeDrawer)

  // Export data
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const data = {
      myEvents: JSON.parse(localStorage.getItem('syco_my_events') || '[]'),
      notes: JSON.parse(localStorage.getItem('syco_notes') || '{}'),
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'syco-aiweek-data.json'
    a.click()
    closeDrawer()
  })

  // Clear data
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Διαγραφή όλων των δεδομένων (My Events, Notes, Profile);')) {
      localStorage.clear()
      window.location.reload()
    }
  })
}
