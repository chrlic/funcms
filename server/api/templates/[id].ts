import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { PageTemplate } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const template = await store.findById<PageTemplate>(COLLECTION.TEMPLATES, id)
    if (!template) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return { data: template }
  }

  if (event.method === 'PATCH') {
    const user = requireRole(event, 'editor')
    const body = await readBody<Partial<PageTemplate>>(event)
    const template = await store.findById<PageTemplate>(COLLECTION.TEMPLATES, id)
    if (!template) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const patch: Partial<PageTemplate> = {}
    if (body.name !== undefined) patch.name = body.name.trim()
    if (body.description !== undefined) patch.description = body.description
    if (body.layout !== undefined) patch.layout = body.layout
    if (body.blocks !== undefined) patch.blocks = body.blocks

    const updated = await store.update<PageTemplate>(
      COLLECTION.TEMPLATES, id, patch,
      `feat(templates): update template "${patch.name ?? template.name}"`,
      userAuthor(user)
    )
    return { data: updated }
  }

  if (event.method === 'DELETE') {
    const user = requireRole(event, 'editor')
    const template = await store.findById<PageTemplate>(COLLECTION.TEMPLATES, id)
    if (!template) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    await store.delete(
      COLLECTION.TEMPLATES, id,
      `feat(templates): delete template "${template.name}"`,
      userAuthor(user)
    )
    return { message: 'Deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
