import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { FieldResolution } from '~/types/session'

/**
 * POST /api/sessions/:id/resolve
 * Body: { resolutions: FieldResolution[] }
 *
 * Applies the admin's field-level conflict choices to the draft branch,
 * then retries the merge. Returns the same shape as /publish.
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

  const { resolutions } = await readBody(event) as { resolutions: FieldResolution[] }
  if (!Array.isArray(resolutions) || resolutions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'resolutions array is required' })
  }

  const result = await store.resolveConflicts(id, resolutions)

  if (result.status === 'conflict') {
    setResponseStatus(event, 409)
  }

  return { data: result }
})
