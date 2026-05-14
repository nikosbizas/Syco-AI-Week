import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getProfile, saveProfile, getMyEvents, getNotes } from './lib/store'
import { applyAccentColor } from './lib/utils'

;(window as any).Alpine = Alpine
Alpine.start()
initApp('profile')

// Load saved profile
const profile = getProfile()

// Populate fields
const nameInput = document.getElementById('profile-name') as HTMLInputElement
if (nameInput) nameInput.value = profile.name || ''

// Set active role
if (profile.role) setRole(profile.role)

// Set accent color
if (profile.accent) {
  pickColor(profile.accent)
  const customInput = document.getElementById('custom-color') as HTMLInputElement
  if (customInput) customInput.value = profile.accent
}

// Show badge if exists
if (profile.badgePhoto) renderBadgePreview(profile.badgePhoto)

// Stats
const myEventsCount = getMyEvents().length
const notesCount = Object.values(getNotes()).filter(n => n.text || n.images?.length > 0 || n.audioUrl).length
const statEvents = document.getElementById('stat-events')
const statNotes = document.getElementById('stat-notes')
if (statEvents) statEvents.textContent = String(myEventsCount)
if (statNotes) statNotes.textContent = String(notesCount)

function renderBadgePreview(src: string) {
  const preview = document.getElementById('badge-preview')
  if (!preview) return
  preview.innerHTML = `
    <img src="${src}" class="w-full max-w-[200px] mx-auto rounded-xl object-contain mb-2"
         style="max-height:250px;border:2px solid var(--border)" />
  `
  document.getElementById('clear-badge-btn')?.classList.remove('hidden')
}

;(window as any).handleBadgeUpload = (event: Event) => {
  const input = (event as unknown as { target: HTMLInputElement }).target
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    saveProfile({ badgePhoto: dataUrl })
    renderBadgePreview(dataUrl)
  }
  reader.readAsDataURL(file)
}

;(window as any).clearBadge = () => {
  saveProfile({ badgePhoto: '' })
  const preview = document.getElementById('badge-preview')
  if (preview) {
    preview.innerHTML = `
      <div class="w-24 h-32 rounded-xl mx-auto flex items-center justify-center" style="background:var(--bg-elevated);border:2px dashed var(--border)">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-2)"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
    `
  }
  document.getElementById('clear-badge-btn')?.classList.add('hidden')
}

;(window as any).setRole = function setRole(role: string) {
  const roles = ['social-content', 'creative-design', 'development']
  roles.forEach(r => {
    document.getElementById(`role-${r}`)?.classList.toggle('active', r === role)
  })
  ;(window as any).__selectedRole = role
}
// also make it work globally
function setRole(role: string) { (window as any).setRole(role) }

;(window as any).pickColor = function pickColor(color: string) {
  if (!color.match(/^#[0-9a-fA-F]{6}$/)) return
  applyAccentColor(color)

  // Update swatch selected state
  document.querySelectorAll<HTMLElement>('.color-swatch').forEach(el => {
    el.classList.toggle('selected', el.dataset.color === color)
  })

  // Update preview
  const preview = document.getElementById('color-preview')
  if (preview) preview.style.background = color

  // Update input
  const customInput = document.getElementById('custom-color') as HTMLInputElement
  if (customInput) customInput.value = color
}

;(window as any).saveProfileData = () => {
  const nameEl = document.getElementById('profile-name') as HTMLInputElement
  const colorEl = document.getElementById('custom-color') as HTMLInputElement
  const name = nameEl?.value || ''
  const accent = colorEl?.value || '#7c5cfc'
  const role = (window as any).__selectedRole || ''

  saveProfile({ name, accent, role })

  // Show success toast
  const existing = document.querySelector('.toast')
  if (existing) existing.remove()
  const t = document.createElement('div')
  t.className = 'toast'
  t.textContent = '✓ Profile saved'
  t.style.borderColor = 'var(--success)'
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}
