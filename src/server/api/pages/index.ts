import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole, getSessionId } from '~/server/lib/auth'
import type { Page } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type PageRecord = StoreRecord & Page

export default defineEventHandler(async (event) => {
  const store = useGitStore()

  // GET /api/pages — always reads from main index
  if (event.method === 'GET') {
    const query = getQuery(event)
    const pageNum = Number(query.page) || 1
    const limit = Math.min(Number(query.limit) || 20, 100)
    const skip = (pageNum - 1) * limit

    let statusFilter = 'published'
    try {
      const user = requireRole(event, 'editor')
      if (user && query.status) statusFilter = query.status as string
    } catch { /* public — published only */ }

    const predicate = (r: StoreRecord) => {
      const rec = r as PageRecord
      const statusMatch = statusFilter === 'all' ? true : rec.status === statusFilter
      const searchMatch = query.search
        ? rec.title?.toString().toLowerCase().includes((query.search as string).toLowerCase())
        : true
      return statusMatch && searchMatch
    }

    const total = await store.count(COLLECTION.PAGES, predicate)
    const data = await store.find<Page>(COLLECTION.PAGES, predicate, {
      sort: 'updatedAt',
      order: 'desc',
      skip,
      limit,
    })

    const slim = data.map(({ blocks: _b, ...rest }) => rest)
    return { data: slim, total, page: pageNum, limit, totalPages: Math.ceil(total / limit) }
  }

  // POST /api/pages — create; uses session branch if X-Session-Id is present
  if (event.method === 'POST') {
    const user = requireRole(event, 'editor')
    const body = await readBody(event) as Partial<Page>

    if (!body.slug || !body.title) {
      throw createError({ statusCode: 400, statusMessage: 'slug and title are required' })
    }

    const existing = await store.findOne(COLLECTION.PAGES, (r) => r.slug === body.slug)
    if (existing) {
      throw createError({ statusCode: 409, statusMessage: `Slug "${body.slug}" already exists` })
    }

    const slug = body.slug.startsWith('/') ? body.slug : `/${body.slug}`
    const pageData: Partial<Page> = {
      ...body,
      slug,
      status: body.status ?? 'draft',
      layout: body.layout ?? 'full-width',
      blocks: body.blocks ?? [],
      meta: body.meta ?? { title: body.title },
      createdBy: user.userId,
    }

    const sessionId = getSessionId(event)

    const page = sessionId
      ? await store.sessionCreate(sessionId, COLLECTION.PAGES, pageData, `feat(pages): create "${body.title}"`)
      : await store.create(COLLECTION.PAGES, pageData, `feat(pages): create "${body.title}"`)

    setResponseStatus(event, 201)
    return { data: page }
  }

  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})
