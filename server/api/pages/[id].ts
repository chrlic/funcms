import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, getSessionId } from '~/server/lib/auth'
import type { Page } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  // GET /api/pages/:id — reads from session worktree if X-Session-Id present, else main
  if (event.method === 'GET') {
    const sessionId = getSessionId(event)
    const page = sessionId
      ? (await store.sessionRead<Page>(sessionId, COLLECTION.PAGES, id)) ?? await store.findById<Page>(COLLECTION.PAGES, id)
      : await store.findById<Page>(COLLECTION.PAGES, id)
    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    return { data: page }
  }

  // PUT /api/pages/:id — full update, session-aware
  if (event.method === 'PUT') {
    requireRole(event, 'editor')
    const body = await readBody(event) as Partial<Page>
    const sessionId = getSessionId(event)

    const page = sessionId
      ? await store.sessionUpdate(sessionId, COLLECTION.PAGES, id, body,
          `feat(pages): update "${body.title ?? id}"`)
      : await store.update<Page>(COLLECTION.PAGES, id, body,
          `feat(pages): update "${body.title ?? id}"`)

    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    return { data: page }
  }

  // PATCH /api/pages/:id — partial update, session-aware
  if (event.method === 'PATCH') {
    requireRole(event, 'editor')
    const body = await readBody(event) as Partial<Page>
    const sessionId = getSessionId(event)

    const page = sessionId
      ? await store.sessionUpdate(sessionId, COLLECTION.PAGES, id, body,
          `feat(pages): patch ${id}`)
      : await store.update<Page>(COLLECTION.PAGES, id, body,
          `feat(pages): patch ${id}`)

    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    return { data: page }
  }

  // DELETE /api/pages/:id — session-aware
  if (event.method === 'DELETE') {
    requireRole(event, 'admin')
    const sessionId = getSessionId(event)

    const deleted = sessionId
      ? await store.sessionDelete(sessionId, COLLECTION.PAGES, id,
          `feat(pages): delete ${id}`)
      : await store.delete(COLLECTION.PAGES, id, `feat(pages): delete ${id}`)

    if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    return { message: 'Page deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
