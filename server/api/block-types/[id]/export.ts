import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireAuth } from '~/server/lib/auth'
import type { CustomBlockType } from '~/types'

/** GET /api/block-types/:id/export — download block type as a portable JSON bundle */
export default defineEventHandler(async (event) => {
  requireAuth(event)

  const id = getRouterParam(event, 'id')!
  const store = useGitStore()

  const record = await store.findById(COLLECTION.BLOCK_TYPES, id) as CustomBlockType | undefined
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Block type not found' })

  const bundle = {
    _funcmsVersion: 1,
    slug: record.slug,
    label: record.label,
    description: record.description ?? '',
    source: record.source,
    fields: record.fields,
    exportedAt: new Date().toISOString(),
  }

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${record.slug}.block.json"`)
  return bundle
})
