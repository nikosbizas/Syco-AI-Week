import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getProfile } from './lib/store'

;(window as any).Alpine = Alpine
Alpine.start()
initApp('access')

// Show badge photo if available
const profile = getProfile()
const badgeDisplay = document.getElementById('badge-display')
if (badgeDisplay && profile.badgePhoto) {
  badgeDisplay.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <img src="${profile.badgePhoto}"
           class="w-full max-w-xs rounded-xl object-contain cursor-pointer"
           style="max-height:300px;border:2px solid var(--border)"
           onclick="this.classList.toggle('scale-125')"
           title="Tap to zoom" />
      <div class="text-xs" style="color:var(--text-2)">Tap to zoom · Use for entry</div>
    </div>
  `
}
