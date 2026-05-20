import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MediaItem } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type MediaRecord = StoreRecord & MediaItem

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  // GET /api/media/:id
  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const item = await store.findById<MediaItem>(COLLECTION.MEDIA, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return { data: item }
  }

  // DELETE /api/media/:id
  if (event.method === 'DELETE') {
    requireRole(event, 'editor')

    const item = await store.findById<MediaRecord>(COLLECTION.MEDIA, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    // Remove physical file
    const config = useRuntimeConfig()
    const filePath = path.join(config.contentDir, 'uploads', item.filename)
    await fs.unlink(filePath).catch(() => {})

    await store.delete(COLLECTION.MEDIA, id, `feat(media): delete ${item.filename}`)

    return { message: 'Deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
