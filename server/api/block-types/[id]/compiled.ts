import { useGitStore, COLLECTION } from '~/server/lib/store'
import type { CustomBlockType } from '~/types'

/** Returns just the compiled JS string for a given block type. Used by client registry. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const store = useGitStore()

  const record = await store.findById(COLLECTION.BLOCK_TYPES, id) as CustomBlockType | undefined
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Block type not found' })

  // Return as text/javascript so browser caches it properly
  setResponseHeader(event, 'Content-Type', 'application/javascript; charset=utf-8')
  return record.compiledJs
})
