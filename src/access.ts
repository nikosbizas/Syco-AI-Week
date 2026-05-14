import './styles/main.css'
import Alpine from 'alpinejs'
import { initApp } from './lib/nav'
import { getProfile } from './lib/store'

;(window as any).Alpine = Alpine
Alpine.start()
initApp('access')

function openLightbox(src: string) {
  const lb = document.getElementById('badge-lightbox')
  const img = document.getElementById('lightbox-img') as HTMLImageElement
  if (!lb || !img) return
  img.src = src
  lb.style.display = 'flex'
}

function closeLightbox() {
  const lb = document.getElementById('badge-lightbox')
  if (lb) lb.style.display = 'none'
}

;(window as any).openBadgeLightbox = openLightbox
;(window as any).closeBadgeLightbox = closeLightbox

// Show badge photo if available
const profile = getProfile()
const badgeDisplay = document.getElementById('badge-display')
if (badgeDisplay && profile.badgePhoto) {
  badgeDisplay.innerHTML = `
    <div class="flex flex-col items-center gap-3">
      <img src="${profile.badgePhoto}"
           class="w-full max-w-xs rounded-xl object-contain cursor-pointer"
           style="max-height:300px;border:2px solid var(--border)"
           onclick="openBadgeLightbox(this.src)"
           title="Tap to view full size" />
      <div class="text-xs" style="color:var(--text-2)">Tap to enlarge · Use for entry</div>
    </div>
  `
}
