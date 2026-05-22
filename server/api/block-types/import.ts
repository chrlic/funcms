import { useGitStore, COLLECTION } from '~/server/lib/store'
import { compileCustomBlock } from '~/server/lib/custom-block-compiler'
import { registerCustomBlock } from '~/server/lib/custom-block-registry'
import { requireAuth, requireRole } from '~/server/lib/auth'
import type { CustomBlockType } from '~/types'

/** POST /api/block-types/import — import a block type bundle exported via /export */
export default defineEventHandler(async (event) => {
  requireRole(event, 'admin')
  const user = requireAuth(event)

  const body = await readBody<{
    _funcmsVersion?: number
    slug: string
    label: string
    description?: string
    source: string
    fields: CustomBlockType['fields']
    overwrite?: boolean
  }>(event)

  if (!body.slug?.trim()) throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  if (!body.label?.trim()) throw createError({ statusCode: 400, statusMessage: 'label is required' })
  if (!body.source?.trim()) throw createError({ statusCode: 400, statusMessage: 'source is required' })

  if (!/^[a-z][a-z0-9-]*$/.test(body.slug)) {
    throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, numbers, and hyphens only' })
  }

  const store = useGitStore()
  const existing = await store.findOne(COLLECTION.BLOCK_TYPES, (r) => r.slug === body.slug) as CustomBlockType | undefined

  if (existing && !body.overwrite) {
    throw createError({ statusCode: 409, statusMessage: `Block type "${body.slug}" already exists. Send overwrite: true to replace it.` })
  }

  const { code, errors } = await compileCustomBlock(body.source)
  if (errors.length) {
    throw createError({ statusCode: 422, statusMessage: `Compile error: ${errors[0]}` })
  }

  const now = new Date().toISOString()

  if (existing && body.overwrite) {
    const patch: Partial<CustomBlockType> = {
      label: body.label,
      description: body.description ?? '',
      source: body.source,
      compiledJs: code,
      fields: body.fields ?? [],
      updatedAt: now,
    }
    const updated = await store.update(COLLECTION.BLOCK_TYPES, existing._id!, patch, `feat: import update custom block type "${body.slug}"`)
    registerCustomBlock(updated as CustomBlockType)
    return { data: updated, imported: true, overwritten: true }
  }

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

  const created = await store.create(COLLECTION.BLOCK_TYPES, record, `feat: import custom block type "${body.slug}"`)
  registerCustomBlock(created as CustomBlockType)

  return { data: created, imported: true, overwritten: false }
})
