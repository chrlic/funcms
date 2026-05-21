import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'
import { join } from 'path'

const contentDir = process.env.CONTENT_DIR || '../funcms-content'

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.ts',
    './app.vue',
    // Custom block sources stored in the content repo
    join(contentDir, 'block-types/*.json'),
  ],
  theme: {
    extend: {},
  },
  plugins: [typography],
} satisfies Config
