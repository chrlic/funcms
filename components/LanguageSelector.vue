<script setup lang="ts">
import type { SiteSettings, Locale } from '~/types'

// Optional prop override; falls back to injected value from the page renderer.
const props = withDefaults(defineProps<{
  availableLocales?: string[]
}>(), {
  availableLocales: undefined,
})

// Injected by [...slug].vue — a computed ref of published locale codes for this page.
const injectedLocales = inject<Ref<string[]>>('pageAvailableLocales', ref([]))

const route = useRoute()

const { data } = await useFetch<{ data: SiteSettings }>('/api/settings', {
  key: 'site-settings',
  default: () => ({ data: { siteName: 'FunCMS', navStyle: 'topbar', nav: [], footerColumns: [], logo: '', tagline: '', favicon: '', socialLinks: {}, customCss: '', headScripts: '' } }),
})

const locales = computed<Locale[]>(() => data.value?.data?.locales ?? [])
const open = ref(false)

// Detect current locale from route path (e.g. /en/about → 'en')
const currentLocale = computed<string>(() => {
  const match = route.path.match(/^\/([a-z]{2}(?:-[a-zA-Z]{2,4})?)\//i)
    ?? route.path.match(/^\/([a-z]{2}(?:-[a-zA-Z]{2,4})?)$/i)
  return match ? match[1].toLowerCase() : ''
})

const currentLocaleLabel = computed<string>(() => {
  const found = locales.value.find(l => l.code.toLowerCase() === currentLocale.value)
  return found?.code.toUpperCase() ?? (locales.value.find(l => l.default)?.code.toUpperCase() ?? '')
})

onMounted(() => window.addEventListener('click', onWindowClick))
onUnmounted(() => window.removeEventListener('click', onWindowClick))

const selectorEl = ref<HTMLElement | null>(null)
function onWindowClick(e: MouseEvent) {
  if (selectorEl.value && !selectorEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

// Build the equivalent path for a different locale
function pathForLocale(locale: Locale): string {
  const path = route.path
  const withoutLocale = path.replace(/^\/[a-z]{2}(?:-[a-zA-Z]{2,4})?(?=\/|$)/i, '') || '/'
  if (locale.default) return withoutLocale
  return `/${locale.code}${withoutLocale === '/' ? '' : withoutLocale}`
}

function isAvailable(locale: Locale): boolean {
  const list = props.availableLocales ?? injectedLocales.value
  if (!list || list.length === 0) return true  // no filter — show all
  if (locale.default) return list.includes('__default__') || list.includes(locale.code)
  return list.includes(locale.code)
}

function close() { open.value = false }
</script>

<template>
  <div v-if="locales.length > 1" ref="selectorEl" class="relative">
    <button
      @click="open = !open"
      class="flex items-center gap-1 px-2 py-1 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      title="Change language"
    >
      <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M7.496 2.25a.75.75 0 0 1 .75.75v.75h5.254a.75.75 0 0 1 0 1.5H13.12l-.432 1.809a1.25 1.25 0 0 0 .456 1.293l1.768 1.327a.75.75 0 0 1-.9 1.2L12.24 9.602a2.75 2.75 0 0 1-1.003-2.843l.433-1.81H10v5.001l1.204.802a.75.75 0 0 1-.834 1.25L9.246 11.5l-1.124.75a.75.75 0 1 1-.834-1.25L8.5 10.25V6.95H7.246a.75.75 0 0 1 0-1.5H8.5V3a.75.75 0 0 1-.75-.75H7.496Zm-2.246 11a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm-.75 2.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H4.5Z" clip-rule="evenodd"/>
      </svg>
      <span class="text-xs font-medium">{{ currentLocaleLabel }}</span>
      <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': open }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-xl shadow-lg py-1 z-50"
    >
      <template v-for="locale in locales" :key="locale.code">
        <NuxtLink
          v-if="isAvailable(locale)"
          :to="pathForLocale(locale)"
          @click="close"
          class="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          :class="{ 'font-semibold text-indigo-600 dark:text-indigo-400': locale.code.toLowerCase() === currentLocale || (locale.default && !currentLocale) }"
        >
          <span>{{ locale.label }}</span>
          <span class="text-xs text-gray-400">{{ locale.code }}</span>
        </NuxtLink>
        <span
          v-else
          class="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed"
          :title="`No ${locale.label} version of this page`"
        >
          <span>{{ locale.label }}</span>
          <span class="text-xs">{{ locale.code }}</span>
        </span>
      </template>
    </div>
  </div>
</template>
