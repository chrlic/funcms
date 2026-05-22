/**
 * Locale redirect middleware (global, client-only).
 *
 * When locales are configured and the user visits a path with no locale prefix,
 * redirect to the default locale's prefix — but ONLY when the default locale
 * is not set to "no prefix" mode (detected by: no locale has default=true, or
 * the admin explicitly set a non-empty prefix for the default locale).
 *
 * Skips: /admin/*, paths that already have a locale prefix, SSR (runs client-side only).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/admin')) return
  if (import.meta.server) return

  const { data } = await useFetch<{ data: { locales?: Array<{ code: string; default?: boolean }> } }>('/api/settings', {
    key: 'site-settings',
  })

  const locales = data.value?.data?.locales ?? []
  if (locales.length < 2) return

  // Check if current path already starts with a known locale prefix
  const hasPrefix = locales.some(l => {
    const code = l.code.toLowerCase()
    return to.path.toLowerCase() === `/${code}` || to.path.toLowerCase().startsWith(`/${code}/`)
  })
  if (hasPrefix) return

  // Only redirect when there's no locale marked as default (all locales are explicit prefixes)
  // OR when the default locale has a code that differs from an empty-prefix convention.
  // In practice: if every locale has a code and no locale is marked default, pick first.
  const defaultLocale = locales.find(l => l.default)

  // If there's a default locale, it "owns" the no-prefix paths — don't redirect.
  if (defaultLocale) return

  // No default locale: redirect to first locale
  const first = locales[0]
  const target = `/${first.code}${to.path === '/' ? '' : to.path}`
  if (target === to.path) return

  return navigateTo(target, { redirectCode: 302 })
})
