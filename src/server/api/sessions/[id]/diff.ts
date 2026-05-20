import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

/**
 * GET /api/sessions/:id/diff
 * Returns a list of files changed on this session's branch vs main.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
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

  const diff = await store.sessionDiff(id)
  return { data: diff }
})
