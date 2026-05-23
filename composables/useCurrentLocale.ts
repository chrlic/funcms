import type { SiteSettings } from '~/types'

/**
 * Detects the active locale code from the current route path by matching
 * against configured locales (e.g. /en/about → 'en').
 * Returns '' when on the default locale (no prefix).
 */
export function useCurrentLocale(settings: Ref<SiteSettings | null | undefined>) {
  const route = useRoute()

  const currentLocale = computed<string>(() => {
    const locales = settings.value?.locales ?? []
    const path = route.path
    for (const l of locales) {
      const code = l.code.toLowerCase()
      if (path.toLowerCase() === `/${code}` || path.toLowerCase().startsWith(`/${code}/`)) {
        return l.code
      }
    }
    return ''
  })

  return { currentLocale }
}
