import { useGitStore, COLLECTION } from '~/server/lib/store'
import { compileCustomBlock } from '~/server/lib/custom-block-compiler'
import { registerCustomBlock, unregisterCustomBlock } from '~/server/lib/custom-block-registry'
import { requireRole } from '~/server/lib/auth'
import type { CustomBlockType } from '~/types'

export default defineEventHandler(async (event) => {
  const method = event.method
  const id = getRouterParam(event, 'id')!
  const store = useGitStore()

  const existing = await store.findById(COLLECTION.BLOCK_TYPES, id) as CustomBlockType | undefined
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Block type not found' })

  // ─── GET /api/block-types/:id ──────────────────────────────────────────────
  if (method === 'GET') {
    return { data: existing }
  }

  // ─── PUT /api/block-types/:id ──────────────────────────────────────────────
  if (method === 'PUT') {
    requireRole(event, 'admin')

    const body = await readBody<Partial<CustomBlockType>>(event)

    const patch: Partial<CustomBlockType> = {
      label: body.label ?? existing.label,
      description: body.description ?? existing.description,
      fields: body.fields ?? existing.fields,
      updatedAt: new Date().toISOString(),
    }

    // Re-compile only when source changed
    if (body.source && body.source !== existing.source) {
      const { code, errors } = await compileCustomBlock(body.source)
      if (errors.length) {
        throw createError({ statusCode: 422, statusMessage: `Compile error: ${errors[0]}` })
      }
      patch.source = body.source
      patch.compiledJs = code
    }

    const updated = await store.update(COLLECTION.BLOCK_TYPES, id, patch, `feat: update custom block type "${existing.slug}"`)

    // Refresh server registry
    registerCustomBlock(updated as CustomBlockType)

    return { data: updated }
  }

  // ─── DELETE /api/block-types/:id ───────────────────────────────────────────
  if (method === 'DELETE') {
    requireRole(event, 'admin')

    await store.delete(COLLECTION.BLOCK_TYPES, id, `chore: remove custom block type "${existing.slug}"`)
    unregisterCustomBlock(existing.slug)

    return { message: `Block type "${existing.slug}" deleted` }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
})
