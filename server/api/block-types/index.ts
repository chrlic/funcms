import { useGitStore, COLLECTION } from '~/server/lib/store'
import { compileCustomBlock } from '~/server/lib/custom-block-compiler'
import { registerCustomBlock, listCustomBlockMeta } from '~/server/lib/custom-block-registry'
import { requireAuth, requireRole, userAuthor } from "~/server/lib/auth"
import type { CustomBlockType } from '~/types'

export default defineEventHandler(async (event) => {
  const method = event.method

  // ─── GET /api/block-types ──────────────────────────────────────────────────
  if (method === 'GET') {
    // Read from git store — authoritative, includes blocks created before this
    // server started (in-memory registry may lag if startup registration failed)
    const store = useGitStore()
    const records = await store.find(COLLECTION.BLOCK_TYPES) as CustomBlockType[]
    return { data: records }
  }

  // ─── POST /api/block-types ─────────────────────────────────────────────────
  if (method === 'POST') {
    const user = requireRole(event, 'admin')

    const body = await readBody<{
      slug: string
      label: string
      description?: string
      source: string
      fields: CustomBlockType['fields']
    }>(event)

    if (!body.slug?.trim()) throw createError({ statusCode: 400, statusMessage: 'slug is required' })
    if (!body.label?.trim()) throw createError({ statusCode: 400, statusMessage: 'label is required' })
    if (!body.source?.trim()) throw createError({ statusCode: 400, statusMessage: 'source is required' })

    // Validate slug format: lowercase, hyphens, no spaces
    if (!/^[a-z][a-z0-9-]*$/.test(body.slug)) {
      throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, numbers, and hyphens only' })
    }

    // Check uniqueness
    const store = useGitStore()
    const existing = await store.findOne(COLLECTION.BLOCK_TYPES, (r) => r.slug === body.slug)
    if (existing) throw createError({ statusCode: 409, statusMessage: `Block type "${body.slug}" already exists` })

    // Compile
    const { code, errors } = await compileCustomBlock(body.source)
    if (errors.length) {
      throw createError({ statusCode: 422, statusMessage: `Compile error: ${errors[0]}` })
    }

    const now = new Date().toISOString()
    const record: Omit<CustomBlockType, '_id'> = {
      slug: body.slug,
      label: body.label,
      description: body.description ?? '',
      source: body.source,
      compiledJs: code,
      fields: body.fields ?? [],
      createdAt: now,
      updatedAt: now,
      createdBy: user._id,
    }

    const created = await store.create(COLLECTION.BLOCK_TYPES, record, `feat: add custom block type "${body.slug}"`, userAuthor(user))

    // Register in server-side registry immediately (no restart needed)
    registerCustomBlock(created as CustomBlockType)

    return { data: created }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
