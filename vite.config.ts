import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        events: resolve(__dirname, 'events.html'),
        'my-events': resolve(__dirname, 'my-events.html'),
        access: resolve(__dirname, 'access.html'),
        profile: resolve(__dirname, 'profile.html'),
      }
    }
  }
})
