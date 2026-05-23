import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page, SiteSettings, NavItem } from '~/types'

export interface SiteMapNode {
  id: string
  label: string
  type: 'page' | 'nav-root' | 'nav-item' | 'external' | 'block' | 'footer-root'
  slug?: string
  status?: string
  /** Locale codes for which a published variant exists */
  locales?: string[]
  /** Which nav section owns this nav-item node */
  navSection?: string
  /** Block type (block nodes only) */
  blockType?: string
  /** Compound parent id — set on block nodes so Cytoscape nests them inside their parent */
  parent?: string
}

export interface SiteMapEdge {
  source: string
  target: string
  /** Human label shown on the edge */
  label?: string
  /** Locale this edge belongs to */
  locale: string
  type: 'nav-tree' | 'nav-link' | 'link' | 'locale-link' | 'page-link' | 'page-locale-link'
}

export interface SiteMapData {
  nodes: SiteMapNode[]
  edges: SiteMapEdge[]
  localeCodes: string[]
  defaultLocale: string
}

function extractLinks(html: string): string[] {
  const hrefs: string[] = []
  const re = /href="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) hrefs.push(m[1])
  return hrefs
}

function linksFromBlock(props: Record<string, unknown>): string[] {
  const links: string[] = []
  for (const val of Object.values(props)) {
    if (typeof val === 'string') {
      if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
        links.push(val)
      } else if (val.includes('href=')) {
        links.push(...extractLinks(val))
      }
    }
  }
  return links
}

function stripLocale(href: string, localeCodes: string[]): { locale: string; bare: string } {
  for (const code of localeCodes) {
    const prefix = `/${code.toLowerCase()}`
    const lower = href.toLowerCase()
    if (lower === prefix || lower.startsWith(prefix + '/')) {
      return { locale: code, bare: href.slice(prefix.length) || '/' }
    }
  }
  return { locale: '', bare: href }
}

const blockTypeLabel: Record<string, string> = {
  'hero': 'Hero',
  'rich-text': 'Rich Text',
  'media-text': 'Media + Text',
  'grid': 'Grid',
  'image': 'Image',
  'gallery': 'Gallery',
  'video': 'Video',
  'cta': 'Call to Action',
  'card-row': 'Card Row',
  'divider': 'Divider',
  'raw-html': 'Raw HTML',
}

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')

  const store = useGitStore()
  const [pages, settingsRecord] = await Promise.all([
    store.find<Page>(COLLECTION.PAGES),
    store.findOne<SiteSettings>(COLLECTION.SETTINGS, () => true),
  ])
  const settings = settingsRecord as SiteSettings | null
  const localeCodes = (settings?.locales ?? []).map(l => l.code)
  const defaultLocale = settings?.locales?.find(l => l.default)?.code ?? ''

  const nodes: SiteMapNode[] = []
  const edges: SiteMapEdge[] = []
  const edgeSet = new Set<string>()
  const externalNodeSet = new Set<string>()

  function addEdge(edge: SiteMapEdge) {
    const key = `${edge.source}→${edge.target}→${edge.type}→${edge.locale}→${edge.label ?? ''}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push(edge)
    }
  }

  function ensureExternal(href: string) {
    const extId = `ext:${href}`
    if (!externalNodeSet.has(extId)) {
      externalNodeSet.add(extId)
      nodes.push({ id: extId, label: href, type: 'external' })
    }
    return extId
  }

  // ─── Page nodes ───────────────────────────────────────────────────────────

  const slugToId = new Map<string, string>()

  for (const page of pages) {
    slugToId.set(page.slug, page._id)
    const publishedLocales = Object.entries(page.locales ?? {})
      .filter(([, v]) => v.status === 'published')
      .map(([code]) => code)
    nodes.push({
      id: page._id,
      label: page.title || page.slug,
      type: 'page',
      slug: page.slug,
      status: page.status,
      locales: publishedLocales,
    })
  }

  // ─── Block nodes for pages (default locale only to avoid duplication) ─────
  //
  // Block nodes carry `parent` = page id so Cytoscape can render them as
  // compound (embedded) children. Only default-locale blocks are emitted;
  // locale variants are skipped — they'd just duplicate the same block types.
  // Link edges come from block → target so they appear on the block, not the page.

  for (const page of pages) {
    const blocks = (page.blocks ?? []).filter(b => b.visible)
    for (const block of blocks) {
      const blockNodeId = `block:${block.id}`
      const label = blockTypeLabel[block.type] ?? block.type
      nodes.push({
        id: blockNodeId,
        label,
        type: 'block',
        blockType: block.type,
        parent: page._id,    // compound parent — Cytoscape nests this inside the page node
      })

      // Link edges: from block (shown when expanded) + from page (shown when collapsed)
      for (const href of linksFromBlock(block.props ?? {})) {
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
        if (href.startsWith('http://') || href.startsWith('https://')) {
          addEdge({ source: blockNodeId, target: ensureExternal(href), locale: '', type: 'link' })
          addEdge({ source: page._id, target: ensureExternal(href), locale: '', type: 'page-link' })
        } else if (href.startsWith('/')) {
          const { bare, locale: linkLocale } = stripLocale(href, localeCodes)
          const targetId = slugToId.get(bare)
          if (targetId) {
            addEdge({
              source: blockNodeId,
              target: targetId,
              label: linkLocale || undefined,
              locale: linkLocale,
              type: linkLocale ? 'locale-link' : 'link',
            })
            addEdge({
              source: page._id,
              target: targetId,
              label: linkLocale || undefined,
              locale: linkLocale,
              type: linkLocale ? 'page-locale-link' : 'page-link',
            })
          }
        }
      }
    }
  }

  // ─── Nav tree nodes and edges ─────────────────────────────────────────────

  let navNodeSeq = 0

  function processNavItems(parentId: string, items: NavItem[], sectionLocale: string) {
    for (const item of items) {
      const navItemId = `nav-item:${navNodeSeq++}`
      nodes.push({ id: navItemId, label: item.label || item.href, type: 'nav-item', navSection: sectionLocale })
      addEdge({ source: parentId, target: navItemId, type: 'nav-tree', locale: sectionLocale })

      if (item.href) {
        if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
          addEdge({ source: navItemId, target: ensureExternal(item.href), label: item.label, type: 'nav-link', locale: sectionLocale })
        } else if (item.href.startsWith('/')) {
          const { bare, locale: linkLocale } = stripLocale(item.href, localeCodes)
          const pageId = slugToId.get(bare)
          if (pageId) {
            addEdge({ source: navItemId, target: pageId, label: item.label, type: 'nav-link', locale: sectionLocale || linkLocale })
          }
        }
      }

      if (item.children?.length) processNavItems(navItemId, item.children, sectionLocale)
    }
  }

  const mainNavId = 'nav:main'
  nodes.push({ id: mainNavId, label: 'Nav', type: 'nav-root', navSection: '' })
  processNavItems(mainNavId, settings?.nav ?? [], '')

  for (const [code, items] of Object.entries(settings?.navLocales ?? {})) {
    const localeNavId = `nav:${code}`
    nodes.push({ id: localeNavId, label: `Nav (${code})`, type: 'nav-root', navSection: code })
    processNavItems(localeNavId, items, code)
  }

  // ─── Footer root node + block nodes ──────────────────────────────────────
  //
  // Footer blocks use `parent = footerRootId` so they embed inside the Footer node.
  // Per-locale overrides are deduplicated: each unique column id is only emitted once.

  const footerRootId = 'nav:footer'
  nodes.push({ id: footerRootId, label: 'Footer', type: 'footer-root', navSection: 'footer' })

  function emitFooterBlockNodes(columns: SiteSettings['footerColumns'], locale: string) {
    for (const col of columns ?? []) {
      const blockNodeId = `block:footer:${col.id}:${locale}`
      const label = blockTypeLabel[col.block.type] ?? col.block.type
      nodes.push({
        id: blockNodeId,
        label,
        type: 'block',
        blockType: col.block.type,
        parent: footerRootId,
      })

      for (const href of linksFromBlock(col.block.props ?? {})) {
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
        if (href.startsWith('http://') || href.startsWith('https://')) {
          addEdge({ source: blockNodeId, target: ensureExternal(href), label: 'footer', type: 'nav-link', locale: locale || 'footer' })
        } else if (href.startsWith('/')) {
          const { bare, locale: linkLocale } = stripLocale(href, localeCodes)
          const pageId = slugToId.get(bare)
          if (pageId) addEdge({ source: blockNodeId, target: pageId, label: 'footer', type: 'nav-link', locale: linkLocale || locale || 'footer' })
        }
      }
    }
  }

  emitFooterBlockNodes(settings?.footerColumns, '')
  for (const [code, columns] of Object.entries(settings?.footerLocales ?? {})) {
    emitFooterBlockNodes(columns, code)
  }

  return { data: { nodes, edges, localeCodes, defaultLocale } satisfies SiteMapData }
})
