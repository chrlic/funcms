import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { GlobalComponent } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  if (event.method === 'GET') {
    const item = await store.findById<GlobalComponent>(COLLECTION.GLOBAL_COMPONENTS, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return { data: item }
  }

  if (event.method === 'PATCH') {
    const user = requireRole(event, 'editor')
    const body = await readBody<Partial<GlobalComponent>>(event)
    const item = await store.findById<GlobalComponent>(COLLECTION.GLOBAL_COMPONENTS, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const patch: Partial<GlobalComponent> = {}
    if (body.name !== undefined) patch.name = body.name.trim()
    if (body.description !== undefined) patch.description = body.description
    if (body.block !== undefined) patch.block = body.block

    const updated = await store.update<GlobalComponent>(
      COLLECTION.GLOBAL_COMPONENTS, id, patch,
      `feat(global): update global component "${patch.name ?? item.name}"`,
      userAuthor(user)
    )
    return { data: updated }
  }

  if (event.method === 'DELETE') {
    const user = requireRole(event, 'editor')
    const item = await store.findById<GlobalComponent>(COLLECTION.GLOBAL_COMPONENTS, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    await store.delete(
      COLLECTION.GLOBAL_COMPONENTS, id,
      `feat(global): delete global component "${item.name}"`,
      userAuthor(user)
    )
    return { message: 'Deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
