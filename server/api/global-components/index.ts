import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { GlobalComponent } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  if (event.method === 'GET') {
    const items = await store.find<GlobalComponent>(COLLECTION.GLOBAL_COMPONENTS, undefined, {
      sort: 'createdAt', order: 'desc',
    })
    return { data: items }
  }

  if (event.method === 'POST') {
    const user = requireRole(event, 'editor')
    const body = await readBody<Partial<GlobalComponent>>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    }
    if (!body.block) {
      throw createError({ statusCode: 400, statusMessage: 'Block is required' })
    }

    const item: Omit<GlobalComponent, '_id' | 'createdAt' | 'updatedAt'> = {
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      block: body.block,
      createdBy: user.email,
    }

    const saved = await store.create<typeof item>(
      COLLECTION.GLOBAL_COMPONENTS, item,
      `feat(global): create global component "${item.name}"`,
      userAuthor(user)
    )
    setResponseStatus(event, 201)
    return { data: saved }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
