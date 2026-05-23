import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, getSessionId, userAuthor } from '~/server/lib/auth'
import type { Page, LocaleVariant } from '~/types'

/**
 * POST /api/pages/:id/clone
 * Body: { targetLocale: string; copyContent?: boolean }
 * Adds a locale variant to an existing page record.
 *
 * DELETE /api/pages/:id/clone
 * Body: { targetLocale: string }
 * Removes a locale variant from the page record.
 */
export default defineEventHandler(async (event) => {
  if (event.method === 'DELETE') {
    const user = requireRole(event, 'editor')
    const store = useGitStore()
    const id = getRouterParam(event, 'id')!
    const { targetLocale } = await readBody(event) as { targetLocale: string }
    if (!targetLocale) throw createError({ statusCode: 400, statusMessage: 'targetLocale is required' })

    const source = await store.findById<Page>(COLLECTION.PAGES, id)
    if (!source) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    if (!source.locales?.[targetLocale]) throw createError({ statusCode: 404, statusMessage: 'Locale variant not found' })

    const updatedLocales = { ...(source.locales ?? {}) }
    delete updatedLocales[targetLocale]

    const sessionId = getSessionId(event)
    const page = sessionId
      ? await store.sessionUpdate(sessionId, COLLECTION.PAGES, id, { locales: updatedLocales },
          `feat(pages): remove ${targetLocale} variant from "${source.title}"`)
      : await store.update<Page>(COLLECTION.PAGES, id, { locales: updatedLocales },
          `feat(pages): remove ${targetLocale} variant from "${source.title}"`, userAuthor(user))

    if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    return { data: page }
  }

  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const user = requireRole(event, 'editor')
  const store = useGitStore()
  const id = getRouterParam(event, 'id')!
  const { targetLocale, copyContent = true } = await readBody(event) as {
    targetLocale: string
    copyContent?: boolean
  }

  if (!targetLocale) throw createError({ statusCode: 400, statusMessage: 'targetLocale is required' })

  const source = await store.findById<Page>(COLLECTION.PAGES, id)
  if (!source) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  if (source.locales?.[targetLocale]) {
    throw createError({ statusCode: 409, statusMessage: `Locale "${targetLocale}" already exists on this page` })
  }

  const variant: LocaleVariant = {
    title: source.title,
    meta: { ...source.meta },
    blocks: copyContent ? source.blocks.map(b => ({ ...b })) : [],
    status: 'draft',
  }

  const updatedLocales = { ...(source.locales ?? {}), [targetLocale]: variant }

  const sessionId = getSessionId(event)
  const page = sessionId
    ? await store.sessionUpdate(sessionId, COLLECTION.PAGES, id, { locales: updatedLocales },
        `feat(pages): add ${targetLocale} variant to "${source.title}"`)
    : await store.update<Page>(COLLECTION.PAGES, id, { locales: updatedLocales },
        `feat(pages): add ${targetLocale} variant to "${source.title}"`, userAuthor(user))

  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  return { data: page }
})
