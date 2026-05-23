import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, getSessionId, userAuthor } from '~/server/lib/auth'
import type { SiteSettings } from '~/types'

const SETTINGS_ID = 'site'

const defaults: SiteSettings = {
  siteName: 'FunCMS',
  tagline: '',
  logo: '',
  favicon: '',
  navStyle: 'topbar',
  nav: [],
  footer: [],
  socialLinks: {},
  customCss: '',
  headScripts: '',
  typography: {
    bodyFont: 'system-ui, sans-serif',
    headingFont: 'system-ui, sans-serif',
    baseSize: '16px',
    styles: [],
  },
}

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  if (event.method === 'GET') {
    const settings = await store.findById<SiteSettings>(COLLECTION.SETTINGS, SETTINGS_ID)
    return { data: settings ?? { _id: SETTINGS_ID, ...defaults } }
  }

  if (event.method === 'PUT') {
    const user = requireRole(event, 'admin')
    const sessionId = getSessionId(event)
    const body = await readBody(event) as Partial<SiteSettings>

    if (sessionId) {
      const existing = await store.findById<SiteSettings>(COLLECTION.SETTINGS, SETTINGS_ID)
      const updated = existing
        ? await store.sessionUpdate<SiteSettings>(sessionId, COLLECTION.SETTINGS, SETTINGS_ID, body, 'feat(settings): update site settings')
        : await store.sessionCreate<SiteSettings>(sessionId, COLLECTION.SETTINGS, { _id: SETTINGS_ID, ...defaults, ...body }, 'feat(settings): init site settings')
      return { data: updated }
    }

    const existing = await store.findById<SiteSettings>(COLLECTION.SETTINGS, SETTINGS_ID)
    const author = userAuthor(user)
    const updated = existing
      ? await store.update<SiteSettings>(COLLECTION.SETTINGS, SETTINGS_ID, body, 'feat(settings): update site settings', author)
      : await store.create<SiteSettings>(COLLECTION.SETTINGS, { _id: SETTINGS_ID, ...defaults, ...body }, 'feat(settings): init site settings', author)
    return { data: updated }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
