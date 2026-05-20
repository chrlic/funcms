import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

/**
 * POST /api/sessions/:id/abandon
 * Discards all changes and deletes the draft branch.
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

  // Admins can abandon any session; editors only their own
  if (user.role !== 'admin' && session.userId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  await store.abandonSession(id)
  return { message: `Session ${id} abandoned` }
})
