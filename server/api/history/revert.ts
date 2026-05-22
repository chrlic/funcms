import { useGitStore } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'

/**
 * POST /api/history/revert
 * Body: { hash: string }
 * Reverts the entire content repo to the state at the given commit.
 * A new commit is created on top — no history is lost.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const user = requireRole(event, 'admin')
  const store = useGitStore()
  const { hash } = await readBody(event) as { hash: string }

  if (!hash) throw createError({ statusCode: 400, statusMessage: 'hash is required' })

  await store.revertToCommit(
    hash,
    `feat(site): revert entire site to ${hash.slice(0, 7)} (by ${user.email})`
  )

  return { ok: true }
})
