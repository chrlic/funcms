import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { BlockPreset } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  if (event.method === 'DELETE') {
    const user = requireRole(event, 'editor')
    const preset = await store.findById<BlockPreset>(COLLECTION.BLOCK_PRESETS, id)
    if (!preset) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    await store.delete(
      COLLECTION.BLOCK_PRESETS, id,
      `feat(presets): delete preset "${preset.name}"`,
      userAuthor(user)
    )
    return { message: 'Deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
