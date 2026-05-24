import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MediaItem, FocalPoint, Page } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type MediaRecord = StoreRecord & MediaItem

export default defineEventHandler(async (event) => {
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!

  // GET /api/media/:id — includes usage (pages that reference this media URL)
  if (event.method === 'GET') {
    requireRole(event, 'editor')
    const item = await store.findById<MediaRecord>(COLLECTION.MEDIA, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const query = getQuery(event)
    if (query.usage === '1' || query.usage === 'true') {
      const pages = await store.find<Page>(COLLECTION.PAGES)
      const usedIn: { id: string; title: string; slug: string }[] = []
      for (const page of pages) {
        const json = JSON.stringify(page)
        if (json.includes(item.url) || json.includes(item.filename)) {
          usedIn.push({ id: page._id!, title: page.title, slug: page.slug })
        }
      }
      return { data: item, usedIn }
    }

    return { data: item }
  }

  // PATCH /api/media/:id — update alt text and/or focal point
  if (event.method === 'PATCH') {
    const user = requireRole(event, 'editor')
    const body = await readBody<{ alt?: string; focalPoint?: FocalPoint | null }>(event)

    const item = await store.findById<MediaRecord>(COLLECTION.MEDIA, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const patch: Partial<MediaItem> = {}
    if (body.alt !== undefined) patch.alt = body.alt
    if (body.focalPoint !== undefined) patch.focalPoint = body.focalPoint ?? undefined

    const updated = await store.update<MediaItem>(
      COLLECTION.MEDIA, id, patch,
      `feat(media): update metadata for ${item.filename}`,
      userAuthor(user)
    )
    return { data: updated }
  }

  // DELETE /api/media/:id
  if (event.method === 'DELETE') {
    const user = requireRole(event, 'editor')

    const item = await store.findById<MediaRecord>(COLLECTION.MEDIA, id)
    if (!item) throw createError({ statusCode: 404, statusMessage: 'Not found' })

    const config = useRuntimeConfig()
    const filePath = path.join(config.contentDir, 'uploads', item.filename)
    await fs.unlink(filePath).catch(() => {})

    await store.delete(COLLECTION.MEDIA, id, `feat(media): delete ${item.filename}`, userAuthor(user))

    return { message: 'Deleted' }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
