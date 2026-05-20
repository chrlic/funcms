import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

/**
 * POST /api/sessions/:id/publish
 * Merges the session's draft branch into main.
 * Returns { status: 'ok' } or { status: 'conflict', conflicts: [...] }.
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

  const result = await store.publishSession(id)

  // 200 for clean merge, 409 for conflict
  if (result.status === 'conflict') {
    setResponseStatus(event, 409)
  }

  return { data: result }
})
