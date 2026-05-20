import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page } from '~/types'

/**
 * POST /api/sessions/:id/publish
 * Promotes all draft pages in the session to published, then merges into main.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const store = useGitStore()
  const id = getRouterParam(event, 'id')!
  const user = requireRole(event, 'editor')

  const session = store.getSession(id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })
  if (user.role !== 'admin' && session.userId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Promote draft pages to published before merging
  const draftPages = await store.sessionFind<Page>(
    id, COLLECTION.PAGES, (p) => p.status === 'draft'
  )
  for (const page of draftPages) {
    await store.sessionUpdate(id, COLLECTION.PAGES, page._id!, { status: 'published' },
      `feat(pages): publish "${page.title}"`)
  }

  const result = await store.publishSession(id)

  if (result.status === 'conflict') {
    setResponseStatus(event, 409)
  }

  return { data: result }
})
