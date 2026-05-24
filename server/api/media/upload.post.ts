import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, userAuthor } from '~/server/lib/auth'
import type { MediaItem } from '~/types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { imageMeta } from 'image-meta'

export default defineEventHandler(async (event) => {
  const user = requireRole(event, 'editor')
  const store = useGitStore()

  const formData = await readFormData(event)
  const file = formData.get('file') as File | null

  if (!file || !(file instanceof File)) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  // Validate size (10 MB limit)
  if (file.size > 10 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'File too large (max 10 MB)' })
  }

  const config = useRuntimeConfig()
  const uploadsDir = path.join(config.contentDir, 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  const ext = path.extname(file.name) || ''
  const filename = `${uuidv4()}${ext}`
  const dest = path.join(uploadsDir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(dest, buffer)

  // Extract image dimensions for image files
  let width: number | undefined
  let height: number | undefined
  if (file.type.startsWith('image/')) {
    try {
      const meta = imageMeta(new Uint8Array(buffer))
      width = meta.width
      height = meta.height
    } catch {}
  }

  const mediaItem: Omit<MediaItem, '_id' | 'createdAt'> = {
    filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
    width,
    height,
    url: `/api/media/files/${filename}`,
    alt: formData.get('alt') as string || '',
  }

  const saved = await store.create<Omit<MediaItem, '_id' | 'createdAt'>>(
    COLLECTION.MEDIA,
    mediaItem,
    `feat(media): upload ${file.name}`,
    userAuthor(user)
  )

  setResponseStatus(event, 201)
  return { data: saved }
})
