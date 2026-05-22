import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

/**
 * GET  /api/history          — list recent repo-wide commits
 * POST /api/history/revert   — revert entire repo to a commit (new commit on top)
 */
export default defineEventHandler(async (event) => {
  const store = useGitStore()

  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const query = getQuery(event)
    const maxCount = Number(query.limit) || 50
    const history = await store.repoHistory(maxCount)
    return { data: history }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
