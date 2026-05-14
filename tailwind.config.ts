import type { Config } from 'tailwindcss'

export default {
  content: ['./*.html', './src/**/*.{ts,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: [],
} satisfies Config
