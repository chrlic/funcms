import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const query = getQuery(event)

    // ?hash=abc123 — return the page snapshot at that commit
    if (query.hash) {
      const snapshot = await store.getAtCommit<Page>(COLLECTION.PAGES, id, String(query.hash))
      if (!snapshot) throw createError({ statusCode: 404, statusMessage: 'Version not found' })
      return { data: snapshot }
    }

    // List commits for this page
    const maxCount = Number(query.limit) || 20
    const history = await store.history(COLLECTION.PAGES, id, maxCount)
    return { data: history }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
