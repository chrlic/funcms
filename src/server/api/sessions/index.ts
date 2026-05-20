import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  // GET /api/sessions — list sessions (admin sees all, editor sees own)
  if (event.method === 'GET') {
    const user = requireRole(event, 'editor')
    const sessions = store.listSessions(user.role === 'admin' ? undefined : user.userId)
    return { data: sessions }
  }

  // POST /api/sessions — open a new editing session (creates draft branch)
  if (event.method === 'POST') {
    const user = requireRole(event, 'editor')

    const session = await store.createSession({
      userId: user.userId,
      email: user.email,
      name: user.name,
    })

    setResponseStatus(event, 201)
    return { data: session }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
