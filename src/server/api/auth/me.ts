import { requireAuth } from '~/server/lib/auth'
import { useGitStore, COLLECTION } from '~/server/lib/store'
import type { User } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type UserRecord = StoreRecord & User & { password: string }

export default defineEventHandler(async (event) => {
  // GET /api/auth/me
  if (event.method === 'GET') {
    const payload = requireAuth(event)
    const store = useGitStore()
    const user = await store.findById<UserRecord>(COLLECTION.USERS, payload.userId)
    if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    const { password: _pw, ...safeUser } = user
    return { data: safeUser }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
