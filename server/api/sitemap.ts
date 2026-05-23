import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page, SiteSettings, NavItem } from '~/types'

export interface SiteMapNode {
  id: string
  label: string
  type: 'page' | 'nav-root' | 'nav-item' | 'external'
  slug?: string
  status?: string
  /** Locale codes for which a published variant exists */
  locales?: string[]
  /** Which nav section owns this nav-item node */
  navSection?: string
}

export interface SiteMapEdge {
  source: string
  target: string
  /** Human label shown on the edge (nav item name, locale code, etc.) */
  label?: string
  /** Locale this edge belongs to: '' = default, code = specific locale, 'footer' = footer */
  locale: string
  type: 'nav-tree' | 'nav-link' | 'link' | 'locale-link'
}

export interface SiteMapData {
  nodes: SiteMapNode[]
  edges: SiteMapEdge[]
  /** All locale codes configured in settings */
  localeCodes: string[]
  /** Default locale code */
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

  function addEdge(edge: SiteMapEdge) {
    const key = `${edge.source}→${edge.target}→${edge.type}→${edge.locale}→${edge.label ?? ''}`
    if (!edgeSet.has(key)) {
      edgeSet.add(key)
      edges.push(edge)
    }
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

  // ─── Nav tree nodes and edges ─────────────────────────────────────────────
  //
  // Each top-level nav section gets a nav-root node.
  // Each individual NavItem gets its own nav-item node so the tree is visible.
  // Edges:
  //   nav-root → nav-item (type: nav-tree, structural)
  //   parent nav-item → child nav-item (type: nav-tree, structural)
  //   nav-item → page|external (type: nav-link, the actual link)

  let navNodeSeq = 0

  function processNavItems(
    parentId: string,
    items: NavItem[],
    sectionLocale: string,
  ) {
    for (const item of items) {
      const navItemId = `nav-item:${navNodeSeq++}`
      nodes.push({
        id: navItemId,
        label: item.label || item.href,
        type: 'nav-item',
        navSection: sectionLocale,
      })

      // Structural edge: parent → this item
      addEdge({ source: parentId, target: navItemId, type: 'nav-tree', locale: sectionLocale })

      // Link edge: this item → its target (page or external)
      if (item.href) {
        if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
          const extId = `ext:${item.href}`
          if (!nodes.find(n => n.id === extId)) {
            nodes.push({ id: extId, label: item.href, type: 'external' })
          }
          addEdge({
            source: navItemId,
            target: extId,
            label: item.label,
            type: 'nav-link',
            locale: sectionLocale,
          })
        } else if (item.href.startsWith('/')) {
          const { bare, locale: linkLocale } = stripLocale(item.href, localeCodes)
          const pageId = slugToId.get(bare)
          if (pageId) {
            addEdge({
              source: navItemId,
              target: pageId,
              label: item.label,
              type: 'nav-link',
              locale: sectionLocale || linkLocale,
            })
          }
        }
      }

      // Recurse into children
      if (item.children?.length) {
        processNavItems(navItemId, item.children, sectionLocale)
      }
    }
  }

  // Main nav root
  const mainNavId = 'nav:main'
  nodes.push({ id: mainNavId, label: 'Nav', type: 'nav-root', navSection: '' })
  processNavItems(mainNavId, settings?.nav ?? [], '')

  // Footer nav root
  const footerNavId = 'nav:footer'
  nodes.push({ id: footerNavId, label: 'Footer', type: 'nav-root', navSection: 'footer' })
  processNavItems(footerNavId, settings?.footer ?? [], 'footer')

  // Locale-specific nav roots
  for (const [code, items] of Object.entries(settings?.navLocales ?? {})) {
    const localeNavId = `nav:${code}`
    nodes.push({ id: localeNavId, label: `Nav (${code})`, type: 'nav-root', navSection: code })
    processNavItems(localeNavId, items, code)
  }

  // ─── Internal link edges from page blocks ─────────────────────────────────

  for (const page of pages) {
    const pageRef = page._id

    function processBlocks(blocks: Page['blocks'], blockLocale: string) {
      for (const block of blocks ?? []) {
        for (const href of linksFromBlock(block.props ?? {})) {
          if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
          if (href.startsWith('http://') || href.startsWith('https://')) {
            const extId = `ext:${href}`
            if (!nodes.find(n => n.id === extId)) {
              nodes.push({ id: extId, label: href, type: 'external' })
            }
            addEdge({ source: pageRef, target: extId, locale: blockLocale, type: 'link' })
          } else if (href.startsWith('/')) {
            const { bare, locale: linkLocale } = stripLocale(href, localeCodes)
            const targetId = slugToId.get(bare)
            if (targetId) {
              const resolvedLocale = linkLocale || blockLocale
              addEdge({
                source: pageRef,
                target: targetId,
                label: resolvedLocale || undefined,
                locale: resolvedLocale,
                type: linkLocale ? 'locale-link' : 'link',
              })
            }
          }
        }
      }
    }

    processBlocks(page.blocks, '')
    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      processBlocks(variant.blocks, code)
    }
  }

  return { data: { nodes, edges, localeCodes, defaultLocale } satisfies SiteMapData }
})
