import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { PageTemplate } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const templates = await store.find<PageTemplate>(COLLECTION.TEMPLATES, undefined, {
      sort: 'createdAt', order: 'desc',
    })
    return { data: templates }
  }

  if (event.method === 'POST') {
    const user = requireRole(event, 'editor')
    const body = await readBody<Partial<PageTemplate>>(event)

    if (!body.name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Template name is required' })
    }

    const template: Omit<PageTemplate, '_id' | 'createdAt'> = {
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      layout: body.layout ?? 'full-width',
      blocks: (body.blocks ?? []).map(b => ({ ...b })),
      createdBy: user.email,
    }

    const saved = await store.create<typeof template>(
      COLLECTION.TEMPLATES, template,
      `feat(templates): create template "${template.name}"`,
      userAuthor(user)
    )
    setResponseStatus(event, 201)
    return { data: saved }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
