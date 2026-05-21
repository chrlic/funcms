// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-05-21',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    '@nuxtjs/color-mode',
  ],

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  colorMode: {
    classSuffix: '',
  },

  runtimeConfig: {
    // Server-only secrets
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    // Git store config
    contentDir: process.env.CONTENT_DIR || '../funcms-content',
    gitAuthorName: process.env.GIT_AUTHOR_NAME || 'FunCMS',
    gitAuthorEmail: process.env.GIT_AUTHOR_EMAIL || 'cms@localhost',
    gitRemote: process.env.GIT_REMOTE || '',
    // Public (exposed to client)
    public: {
      appName: process.env.APP_NAME || 'FunCMS',
      apiBase: process.env.API_BASE || '/api',
    },
  },

  nitro: {
    plugins: ['~/server/plugins/git-store.ts'],
  },

  vite: {
    server: {
      allowedHosts: true,  // allow any hostname in dev — safe behind a firewall/proxy
    },
    optimizeDeps: {
      exclude: ['#app-manifest'],
    },
  },

  experimental: {
    appManifest: true,
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  routeRules: {
    '/admin/**': { ssr: true, headers: { 'X-Robots-Tag': 'noindex' } },
    '/api/**': { cors: true },
  },

  imports: {
    dirs: ['stores', 'composables', 'types'],
  },
})
