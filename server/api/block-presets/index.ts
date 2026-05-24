import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { BlockPreset } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const query = getQuery(event)
    const blockType = query.blockType as string | undefined
    const presets = await store.find<BlockPreset>(
      COLLECTION.BLOCK_PRESETS,
      blockType ? (p) => p.blockType === blockType : undefined,
      { sort: 'createdAt', order: 'asc' }
    )
    return { data: presets }
  }

  if (event.method === 'POST') {
    const user = requireRole(event, 'editor')
    const body = await readBody<Partial<BlockPreset>>(event)

    if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    if (!body.blockType) throw createError({ statusCode: 400, statusMessage: 'blockType is required' })
    if (!body.props) throw createError({ statusCode: 400, statusMessage: 'props is required' })

    const preset: Omit<BlockPreset, '_id' | 'createdAt'> = {
      name: body.name.trim(),
      blockType: body.blockType,
      props: body.props,
      customCss: body.customCss ?? '',
      createdBy: user.email,
    }

    const saved = await store.create<typeof preset>(
      COLLECTION.BLOCK_PRESETS, preset,
      `feat(presets): save preset "${preset.name}" for ${preset.blockType}`,
      userAuthor(user)
    )
    setResponseStatus(event, 201)
    return { data: saved }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
