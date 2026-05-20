import { promises as fs } from 'node:fs'
import path from 'node:path'
import { lookup as mimeType } from 'mime-types'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')!

  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  const config = useRuntimeConfig()
  const filePath = path.join(config.contentDir, 'uploads', filename)

  try {
    const buffer = await fs.readFile(filePath)
    const mime = mimeType(filename) || 'application/octet-stream'
    setHeader(event, 'Content-Type', mime)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return buffer
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
})
