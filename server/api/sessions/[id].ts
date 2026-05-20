import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  const user = requireRole(event, 'editor')

  const session = store.getSession(id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })

  // Editors can only access their own sessions; admins can access any
  if (user.role !== 'admin' && session.userId !== user.userId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // GET /api/sessions/:id — session info
  if (event.method === 'GET') {
    return { data: session }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
