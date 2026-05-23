import { useGitStore, COLLECTION } from '~/server/lib/store'
import { requireRole } from '~/server/lib/auth'
import type { Page, SiteSettings, NavItem, FooterColumn } from '~/types'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface AuditIssue {
  severity: IssueSeverity
  category: string
  message: string
  pageId?: string
  pageSlug?: string
  pageTitle?: string
  locale?: string
  url?: string
}

export interface AuditResult {
  ranAt: string
  durationMs: number
  pages: number
  externalLinks: number
  externalProbed: boolean
  issues: AuditIssue[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract all href values from an HTML string. */
function extractLinks(html: string): string[] {
  const hrefs: string[] = []
  const re = /href="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    hrefs.push(m[1])
  }
  return hrefs
}

/** Pull all links out of a block's props (any richtext or url-ish value). */
function linksFromBlock(props: Record<string, unknown>): string[] {
  const links: string[] = []
  for (const val of Object.values(props)) {
    if (typeof val === 'string') {
      if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/')) {
        // bare URL prop (e.g. ctaHref, url, link)
        links.push(val)
      } else if (val.includes('href=')) {
        // rich-text HTML
        links.push(...extractLinks(val))
      }
    }
  }
  return links
}

/** Collect all hrefs from a nav tree. */
function linksFromNav(items: NavItem[]): string[] {
  const links: string[] = []
  for (const item of items) {
    links.push(item.href)
    if (item.children?.length) links.push(...linksFromNav(item.children))
  }
  return links
}

/** Strip locale prefix from a path, returning { locale, bare }. */
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

/** Probe an external URL. Returns the HTTP status or an error string. */
async function probeUrl(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number | string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'FunCMS-Audit/1.0' },
      redirect: 'follow',
    })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort')) return { ok: false, status: 'timeout' }
    return { ok: false, status: msg }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  requireRole(event, 'editor')

  const query = getQuery(event)
  const probeExternal = query.probeExternal === '1' || query.probeExternal === 'true'

  const start = Date.now()
  const issues: AuditIssue[] = []
  const store = useGitStore()

  const [pages, settingsRecord] = await Promise.all([
    store.find<Page>(COLLECTION.PAGES),
    store.findOne<SiteSettings>(COLLECTION.SETTINGS, () => true),
  ])

  const settings = settingsRecord as SiteSettings | null
  const localeCodes = (settings?.locales ?? []).map(l => l.code)
  const defaultLocale = settings?.locales?.find(l => l.default)?.code ?? ''

  // ─── Build slug → page map (published pages only, all locales) ─────────────

  // Map: bare slug → Set of available locale codes ('' = root/default published)
  const publishedSlugs = new Map<string, Set<string>>()

  for (const page of pages) {
    if (page.status === 'published') {
      if (!publishedSlugs.has(page.slug)) publishedSlugs.set(page.slug, new Set())
      publishedSlugs.get(page.slug)!.add('')
    }
    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      if (variant.status === 'published') {
        if (!publishedSlugs.has(page.slug)) publishedSlugs.set(page.slug, new Set())
        publishedSlugs.get(page.slug)!.add(code)
      }
    }
  }

  // ─── 1. Duplicate slugs ────────────────────────────────────────────────────

  const slugCount = new Map<string, number>()
  for (const page of pages) {
    slugCount.set(page.slug, (slugCount.get(page.slug) ?? 0) + 1)
  }
  for (const [slug, count] of slugCount) {
    if (count > 1) {
      issues.push({ severity: 'error', category: 'Duplicate slug', message: `Slug "${slug}" is used by ${count} pages`, pageSlug: slug })
    }
  }

  // ─── 2. Missing slug (empty or malformed) ──────────────────────────────────

  for (const page of pages) {
    if (!page.slug || !page.slug.startsWith('/')) {
      issues.push({ severity: 'error', category: 'Invalid slug', message: `Page "${page.title}" has an invalid slug: "${page.slug}"`, pageId: page._id, pageTitle: page.title })
    }
  }

  // ─── 3. Draft pages that have no published variant at all ─────────────────

  for (const page of pages) {
    const hasAnyPublished = page.status === 'published' ||
      Object.values(page.locales ?? {}).some(v => v.status === 'published')
    if (!hasAnyPublished) {
      issues.push({ severity: 'info', category: 'Never published', message: `Page "${page.title}" (${page.slug}) has no published version in any locale`, pageId: page._id, pageSlug: page.slug, pageTitle: page.title })
    }
  }

  // ─── 4. Locale variant exists but root page is not published ───────────────

  for (const page of pages) {
    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      if (variant.status === 'published' && page.status !== 'published') {
        issues.push({
          severity: 'warning', category: 'Root unpublished',
          message: `"${page.title}" has a published "${code}" variant but the default locale is not published — fallback content unavailable`,
          pageId: page._id, pageSlug: page.slug, pageTitle: page.title, locale: code,
        })
      }
    }
  }

  // ─── 5. Missing locale variants (pages with no translation in a configured locale) ─

  if (localeCodes.length > 0) {
    for (const page of pages) {
      if (page.status !== 'published') continue
      for (const code of localeCodes) {
        if (code === defaultLocale) continue // root covers default locale
        if (!page.locales?.[code]) {
          issues.push({
            severity: 'info', category: 'Missing locale',
            message: `"${page.title}" has no "${code}" variant`,
            pageId: page._id, pageSlug: page.slug, pageTitle: page.title, locale: code,
          })
        }
      }
    }
  }

  // ─── 6. Collect all internal links from blocks + nav ──────────────────────

  // { href, sourcePageId, sourcePageTitle, sourceLocale }
  type LinkRef = { href: string; pageId?: string; pageTitle?: string; pageSlug?: string; locale?: string; source: string }
  const internalLinks: LinkRef[] = []
  const externalLinks: LinkRef[] = []

  function classifyLinks(links: string[], ref: Omit<LinkRef, 'href' | 'source'>, source: string) {
    for (const href of links) {
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue
      if (href.startsWith('http://') || href.startsWith('https://')) {
        externalLinks.push({ href, source, ...ref })
      } else if (href.startsWith('/')) {
        internalLinks.push({ href, source, ...ref })
      }
    }
  }

  // Blocks in each page and locale variant
  for (const page of pages) {
    const pageRef = { pageId: page._id, pageTitle: page.title, pageSlug: page.slug }

    for (const block of page.blocks ?? []) {
      classifyLinks(linksFromBlock(block.props), { ...pageRef, locale: '' }, 'block')
    }

    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      for (const block of variant.blocks ?? []) {
        classifyLinks(linksFromBlock(block.props), { ...pageRef, locale: code }, 'block')
      }
    }
  }

  // Nav links (main nav + locale navs)
  const navLinks = [
    ...linksFromNav(settings?.nav ?? []),
    ...Object.values(settings?.navLocales ?? {}).flatMap(items => linksFromNav(items)),
  ]
  for (const href of navLinks) {
    classifyLinks([href], { source: 'nav' }, 'nav')
  }

  // Footer block links (default + all locale overrides)
  const allFooterColumns = [
    ...(settings?.footerColumns ?? []),
    ...Object.values(settings?.footerLocales ?? {}).flat(),
  ]
  for (const col of allFooterColumns) {
    classifyLinks(linksFromBlock(col.block.props ?? {}), {}, 'footer')
  }

  // ─── 7. Internal link validity ────────────────────────────────────────────

  for (const link of internalLinks) {
    // Skip anchor-only
    const [path] = link.href.split('?')
    if (!path) continue

    const { locale: linkLocale, bare } = stripLocale(path, localeCodes)
    const available = publishedSlugs.get(bare)

    if (!available) {
      issues.push({
        severity: 'error', category: 'Broken internal link',
        message: `Link to "${link.href}" found in ${link.source === 'nav' || link.source === 'footer' ? 'nav/footer' : `"${link.pageTitle}"`}${link.locale ? ` (${link.locale})` : ''} — no page with slug "${bare}"`,
        pageId: link.pageId, pageSlug: link.pageSlug, pageTitle: link.pageTitle, locale: link.locale, url: link.href,
      })
      continue
    }

    // Link has a locale prefix — check that variant is published
    if (linkLocale && !available.has(linkLocale)) {
      issues.push({
        severity: 'error', category: 'Broken locale link',
        message: `Link to "${link.href}" in ${link.source === 'nav' || link.source === 'footer' ? 'nav/footer' : `"${link.pageTitle}"`}${link.locale ? ` (${link.locale})` : ''} — page "${bare}" has no published "${linkLocale}" variant`,
        pageId: link.pageId, pageSlug: link.pageSlug, pageTitle: link.pageTitle, locale: link.locale, url: link.href,
      })
    }
  }

  // ─── 8. Nav reachability — every published page linked from nav or another page ──

  // Build set of all slugs reachable via internal links + nav
  const reachable = new Set<string>()
  reachable.add('/') // root is always reachable

  for (const link of internalLinks) {
    const { bare } = stripLocale(link.href.split('?')[0], localeCodes)
    reachable.add(bare)
  }

  for (const page of pages) {
    if (page.status !== 'published') continue
    if (!reachable.has(page.slug)) {
      issues.push({
        severity: 'warning', category: 'Orphaned page',
        message: `"${page.title}" (${page.slug}) is published but not linked from any nav item or page content`,
        pageId: page._id, pageSlug: page.slug, pageTitle: page.title,
      })
    }
  }

  // ─── 9. Nav items pointing to unpublished / non-existent pages ────────────

  const allFooterBlockLinks = [
    ...(settings?.footerColumns ?? []),
    ...Object.values(settings?.footerLocales ?? {}).flat(),
  ].flatMap(col => linksFromBlock(col.block.props ?? {}))
  const allNavLinks = [
    ...linksFromNav(settings?.nav ?? []),
    ...Object.values(settings?.navLocales ?? {}).flatMap(items => linksFromNav(items)),
    ...allFooterBlockLinks,
  ]
  for (const href of allNavLinks) {
    if (!href.startsWith('/')) continue
    const { bare, locale: linkLocale } = stripLocale(href, localeCodes)
    const available = publishedSlugs.get(bare)
    if (!available) {
      issues.push({ severity: 'error', category: 'Broken nav link', message: `Nav/footer links to "${href}" which has no matching published page`, url: href })
    } else if (linkLocale && !available.has(linkLocale)) {
      issues.push({ severity: 'warning', category: 'Broken nav locale link', message: `Nav/footer links to "${href}" but page "${bare}" has no published "${linkLocale}" variant`, url: href })
    }
  }

  // ─── 10. Pages with no blocks in some locale ───────────────────────────────

  for (const page of pages) {
    if (page.status !== 'published') continue
    if ((page.blocks ?? []).length === 0) {
      issues.push({ severity: 'warning', category: 'Empty page', message: `"${page.title}" (${page.slug}) is published but has no blocks in the default locale`, pageId: page._id, pageSlug: page.slug, pageTitle: page.title })
    }
    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      if (variant.status === 'published' && (variant.blocks ?? []).length === 0) {
        issues.push({ severity: 'warning', category: 'Empty page', message: `"${page.title}" (${page.slug}) "${code}" variant is published but has no blocks`, pageId: page._id, pageSlug: page.slug, pageTitle: page.title, locale: code })
      }
    }
  }

  // ─── 11. Missing meta title ────────────────────────────────────────────────

  for (const page of pages) {
    if (page.status !== 'published') continue
    if (!page.meta?.title?.trim()) {
      issues.push({ severity: 'warning', category: 'SEO', message: `"${page.title}" (${page.slug}) has no meta title`, pageId: page._id, pageSlug: page.slug, pageTitle: page.title })
    }
    for (const [code, variant] of Object.entries(page.locales ?? {})) {
      if (variant.status === 'published' && !variant.meta?.title?.trim()) {
        issues.push({ severity: 'warning', category: 'SEO', message: `"${page.title}" (${page.slug}) "${code}" variant has no meta title`, pageId: page._id, pageSlug: page.slug, pageTitle: page.title, locale: code })
      }
    }
  }

  // ─── 12. External link probing (optional, parallel, capped) ──────────────

  const externalLinkCount = new Set(externalLinks.map(l => l.href)).size

  if (probeExternal) {
    const uniqueExternal = new Map<string, LinkRef>()
    for (const link of externalLinks) {
      if (!uniqueExternal.has(link.href)) uniqueExternal.set(link.href, link)
    }

    // Cap at 30 external probes to keep response time reasonable
    const toProbe = [...uniqueExternal.entries()].slice(0, 30)
    const probeResults = await Promise.all(
      toProbe.map(async ([url, ref]) => ({ url, ref, result: await probeUrl(url) }))
    )

    for (const { url, ref, result } of probeResults) {
      if (!result.ok) {
        const statusStr = typeof result.status === 'number' ? `HTTP ${result.status}` : result.status
        issues.push({
          severity: result.status === 'timeout' ? 'warning' : 'error',
          category: 'Broken external link',
          message: `External link "${url}" returned ${statusStr}${ref.pageTitle ? ` — found in "${ref.pageTitle}"` : ' — found in nav/footer'}`,
          pageId: ref.pageId, pageSlug: ref.pageSlug, pageTitle: ref.pageTitle, locale: ref.locale, url,
        })
      }
    }
  }

  return {
    data: {
      ranAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      pages: pages.length,
      externalLinks: externalLinkCount,
      externalProbed: probeExternal,
      issues,
    } satisfies AuditResult,
  }
})
