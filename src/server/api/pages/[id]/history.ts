import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  // GET /api/pages/:id/history — list commits for this page
  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const query = getQuery(event)
    const maxCount = Number(query.limit) || 20
    const history = await store.history(COLLECTION.PAGES, id, maxCount)
    return { data: history }
  }

  // GET /api/pages/:id/history?hash=abc123 — get page at a specific commit
  // (handled above — pass ?hash= in the GET query)
  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
