import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireAuth } from '~/server/lib/auth'
import type { Page } from '~/types'

export default defineEventHandler(async (event) => {
  const { slug, locale, preview, sid } = getQuery(event)

  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'slug query param required' })
  }

  const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`
  const localeCode = typeof locale === 'string' ? locale : ''

  const isPreview = preview === '1' || preview === 'true'
  if (isPreview) {
    try { requireAuth(event) } catch {
      throw createError({ statusCode: 401, statusMessage: 'Preview requires authentication' })
    }
  }

  const store = useGitStore()

  let page: Page | null = null

  if (isPreview && sid && typeof sid === 'string') {
    const sessionPages = await store.sessionFind<Page>(sid, COLLECTION.PAGES, (r) => r.slug === normalizedSlug)
    if (sessionPages.length > 0) page = sessionPages[0]
  }

  if (!page) {
    page = await store.findOne<Page>(
      COLLECTION.PAGES,
      (r) => {
        if (r.slug !== normalizedSlug) return false
        if (isPreview) return true
        // For locale-specific requests, check that variant is published
        if (localeCode) {
          const variant = (r as Page).locales?.[localeCode]
          return variant ? variant.status === 'published' : r.status === 'published'
        }
        return r.status === 'published'
      }
    )
  }

  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  // Merge locale variant fields over root fields so the renderer gets a flat Page
  if (localeCode && page.locales?.[localeCode]) {
    const variant = page.locales[localeCode]
    return {
      data: {
        ...page,
        title: variant.title,
        meta: variant.meta,
        blocks: variant.blocks,
        status: variant.status,
        // Keep layout/style/layoutOptions from root (shared)
      }
    }
  }

  return { data: page }
})
