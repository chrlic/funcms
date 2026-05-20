import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireAuth } from '~/server/lib/auth'
import type { Page } from '~/types'

export default defineEventHandler(async (event) => {
  const { slug, preview, sid } = getQuery(event)

  if (!slug || typeof slug !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'slug query param required' })
  }

  const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`

  const isPreview = preview === '1' || preview === 'true'
  if (isPreview) {
    try { requireAuth(event) } catch {
      throw createError({ statusCode: 401, statusMessage: 'Preview requires authentication' })
    }
  }

  const store = useGitStore()

  // If a session id is provided with preview, scan the worktree for the page
  if (isPreview && sid && typeof sid === 'string') {
    const sessionPages = await store.sessionFind<Page>(sid, COLLECTION.PAGES, (r) => r.slug === normalizedSlug)
    if (sessionPages.length > 0) return { data: sessionPages[0] }
  }

  const page = await store.findOne<Page>(
    COLLECTION.PAGES,
    (r) => r.slug === normalizedSlug && (isPreview ? true : r.status === 'published')
  )

  if (!page) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return { data: page }
})
