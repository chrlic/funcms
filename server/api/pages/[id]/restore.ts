import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { Page } from '~/types'

/**
 * POST /api/pages/:id/restore
 * Body: { hash: string }
 * Restores a page to the version at the given commit hash.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const user = requireRole(event, 'editor')
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!
  const { hash } = await readBody(event) as { hash: string }

  if (!hash) {
    throw createError({ statusCode: 400, statusMessage: 'hash is required' })
  }

  const historical = await store.getAtCommit<Page>(COLLECTION.PAGES, id, hash)
  if (!historical) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found' })
  }

  // Write the historical version as a new commit (non-destructive)
  const { _id, createdAt, ...data } = historical
  void _id; void createdAt // keep TS happy

  const restored = await store.update<Page>(
    COLLECTION.PAGES,
    id,
    data,
    `feat(pages): restore "${historical.title}" to ${hash.slice(0, 7)}`,
    userAuthor(user)
  )

  return { data: restored }
})
