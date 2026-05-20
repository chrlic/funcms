import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { MediaItem } from '~/types'

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  // GET /api/media — list media
  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const query = getQuery(event)
    const pageNum = Number(query.page) || 1
    const limit = Math.min(Number(query.limit) || 40, 100)
    const skip = (pageNum - 1) * limit

    const total = await store.count(COLLECTION.MEDIA)
    const data = await store.find<MediaItem>(COLLECTION.MEDIA, undefined, {
      sort: 'createdAt',
      order: 'desc',
      skip,
      limit,
    })

    return { data, total, page: pageNum, limit, totalPages: Math.ceil(total / limit) }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
