<script setup lang="ts">
import type { SiteSettings, NavItem, TextStyle, ThemeTokens, Locale } from '~/types'
import { siteCssHints } from '~/composables/useCssHints'
import { defaultLight, defaultDark } from '~/composables/useTypography'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const settings = ref<SiteSettings | null>(null)
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const tab = ref<'general' | 'navigation' | 'typography' | 'css' | 'history'>('general')

const { sfetch } = useSessionFetch()
const session = useSessionStore()
const { pages, load: loadPages } = usePagePicker()

const defaultTypography = {
  bodyFont: 'system-ui, sans-serif',
  headingFont: 'system-ui, sans-serif',
  baseSize: '16px',
  styles: [] as TextStyle[],
}

onMounted(async () => {
  const [sRes] = await Promise.all([
    $fetch<{ data: SiteSettings }>('/api/settings'),
    loadPages(),
  ])
  settings.value = sRes.data
  if (!settings.value.nav) settings.value.nav = []
  if (!settings.value.navLocales) settings.value.navLocales = {}
  if (!settings.value.locales) settings.value.locales = []
  if (!settings.value.typography) settings.value.typography = { ...defaultTypography }
  if (!settings.value.typography.styles) settings.value.typography.styles = []
  if (!settings.value.typography.light) settings.value.typography.light = { ...defaultLight }
  if (!settings.value.typography.dark) settings.value.typography.dark = { ...defaultDark }
})

// ─── Typography helpers ───────────────────────────────────────────────────────

function addTextStyle() {
  settings.value!.typography!.styles.push({
    name: '',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.5',
    color: '',
  })
}

function removeTextStyle(i: number) {
  settings.value!.typography!.styles.splice(i, 1)
}

const commonFonts = [
  { label: 'System UI', value: 'system-ui, sans-serif' },
  { label: 'Inter', value: '"Inter", system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
]

async function save() {
  if (!settings.value) return
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const res = await sfetch<{ data: SiteSettings }>('/api/settings', {
      method: 'PUT',
      body: settings.value,
    })
    settings.value = res.data
    session.markDirty()
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

// ─── Nav helpers ─────────────────────────────────────────────────────────────

function addNavItem() {
  settings.value!.nav.push({ label: '', href: '', newTab: false, children: [] })
}

function removeNavItem(i: number) {
  settings.value!.nav.splice(i, 1)
}

function moveNavItem(i: number, dir: -1 | 1) {
  const nav = settings.value!.nav
  const j = i + dir
  if (j < 0 || j >= nav.length) return
  const tmp = nav[i]
  nav.splice(i, 1)
  nav.splice(j, 0, tmp)
}

function addChild(item: NavItem) {
  if (!item.children) item.children = []
  item.children.push({ label: '', href: '', newTab: false })
}

function removeChild(item: NavItem, ci: number) {
  item.children!.splice(ci, 1)
}

function moveChild(item: NavItem, ci: number, dir: -1 | 1) {
  const ch = item.children!
  const j = ci + dir
  if (j < 0 || j >= ch.length) return
  const tmp = ch[ci]
  ch.splice(ci, 1)
  ch.splice(j, 0, tmp)
}

type HrefMode = 'page' | 'url'

function hrefMode(item: NavItem): HrefMode {
  if (!item.href) return 'page'
  if (item.href.startsWith('http://') || item.href.startsWith('https://') || item.href.startsWith('//')) return 'url'
  return 'page'
}

function setHrefMode(item: NavItem, mode: HrefMode) {
  if (mode === 'url') {
    item.href = item.href.startsWith('/') ? '' : item.href
    if (!item.href) item.href = 'https://'
  } else {
    item.href = ''
  }
}

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'navigation', label: 'Navigation' },
  { key: 'typography', label: 'Typography & Styles' },
  { key: 'css', label: 'Custom CSS' },
  { key: 'history', label: 'Site History' },
] as const

// ─── Locale helpers ───────────────────────────────────────────────────────────

function addLocale() {
  if (!settings.value) return
  if (!settings.value.locales) settings.value.locales = []
  settings.value.locales.push({ code: '', label: '', default: settings.value.locales.length === 0 })
}

function removeLocale(i: number) {
  settings.value!.locales!.splice(i, 1)
  // Ensure at least one default remains
  if (settings.value!.locales!.length && !settings.value!.locales!.some(l => l.default)) {
    settings.value!.locales![0].default = true
  }
}

function setDefault(i: number) {
  settings.value!.locales!.forEach((l, idx) => { l.default = idx === i })
}

// ─── Per-locale nav ───────────────────────────────────────────────────────────

const navLocaleTab = ref<string>('__default__')

const activeNavItems = computed<NavItem[]>({
  get() {
    if (!settings.value) return []
    if (navLocaleTab.value === '__default__') return settings.value.nav
    return settings.value.navLocales?.[navLocaleTab.value] ?? []
  },
  set(val) {
    if (!settings.value) return
    if (navLocaleTab.value === '__default__') {
      settings.value.nav = val
    } else {
      if (!settings.value.navLocales) settings.value.navLocales = {}
      settings.value.navLocales[navLocaleTab.value] = val
    }
  },
})

function addActiveNavItem() {
  const items = [...activeNavItems.value, { label: '', href: '', newTab: false, children: [] }]
  activeNavItems.value = items
}

function removeActiveNavItem(i: number) {
  const items = [...activeNavItems.value]
  items.splice(i, 1)
  activeNavItems.value = items
}

function moveActiveNavItem(i: number, dir: -1 | 1) {
  const items = [...activeNavItems.value]
  const j = i + dir
  if (j < 0 || j >= items.length) return
  const tmp = items[i]; items[i] = items[j]; items[j] = tmp
  activeNavItems.value = items
}

// ─── Site history ─────────────────────────────────────────────────────────────

interface SiteCommit { hash: string; message: string; author: string; date: string; files: string[] }

const siteHistory = ref<SiteCommit[]>([])
const siteHistoryLoading = ref(false)
const siteHistoryLoaded = ref(false)
const reverting = ref<string | null>(null)
const revertError = ref('')
const revertDone = ref('')

async function loadSiteHistory() {
  if (siteHistoryLoaded.value) return
  siteHistoryLoading.value = true
  try {
    const res = await $fetch<{ data: SiteCommit[] }>('/api/history')
    siteHistory.value = res.data
    siteHistoryLoaded.value = true
  } finally {
    siteHistoryLoading.value = false
  }
}

watch(tab, (t) => { if (t === 'history') loadSiteHistory() })

async function revertSite(commit: SiteCommit) {
  if (!confirm(`Revert the entire site to the state at commit ${commit.hash.slice(0, 7)}?\n\n"${commit.message}"\n\nThis will create a new commit restoring all content to that point. Current state is NOT lost — it stays in history.`)) return
  reverting.value = commit.hash
  revertError.value = ''
  revertDone.value = ''
  try {
    await sfetch('/api/history/revert', { method: 'POST', body: { hash: commit.hash } })
    revertDone.value = commit.hash
    siteHistoryLoaded.value = false
    await loadSiteHistory()
  } catch (e: unknown) {
    revertError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Revert failed'
  } finally {
    reverting.value = null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div v-if="settings">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Site Settings</h1>
      <button
        @click="save"
        :disabled="saving"
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        <svg v-if="saving" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <svg v-else-if="saved" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/>
        </svg>
        <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd"/>
        </svg>
        {{ saving ? 'Saving…' : saved ? 'Saved!' : 'Save' }}
      </button>
    </div>

    <p v-if="error" class="mb-4 text-red-500 text-sm">{{ error }}</p>

    <!-- Tabs -->
    <div class="flex gap-0.5 border-b dark:border-gray-700 mb-6">
      <button
        v-for="t in tabs"
        :key="t.key"
        type="button"
        @click="tab = t.key"
        :class="[
          'px-4 py-2.5 text-sm font-medium rounded-t-lg transition -mb-px border-b-2',
          tab === t.key
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ]"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- ── GENERAL ─────────────────────────────────────────────────────────── -->
    <div v-if="tab === 'general'" class="max-w-xl space-y-5">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Identity</h2>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Site Name</label>
          <input v-model="settings.siteName" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Tagline</label>
          <input v-model="settings.tagline" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Logo URL</label>
          <input v-model="settings.logo" type="url" placeholder="https://… or /uploads/…" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-3">
        <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Navigation Style</h2>
        <div class="flex gap-3">
          <button
            v-for="opt in [{ value: 'topbar', label: 'Top bar' }, { value: 'sidebar-left', label: 'Left sidebar' }]"
            :key="opt.value"
            @click="settings.navStyle = opt.value as 'topbar' | 'sidebar-left'"
            :class="[
              'flex-1 py-2.5 px-4 text-sm rounded-lg border transition font-medium',
              settings.navStyle === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
            ]"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- Locales -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Languages</h2>
            <p class="text-xs text-gray-400 mt-1">Enables a language selector on the public site. Each locale prefixes page slugs (e.g. <code class="font-mono">/en/about</code>).</p>
          </div>
          <button @click="addLocale" class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
            Add language
          </button>
        </div>

        <p v-if="!settings.locales?.length" class="text-sm text-gray-400 italic py-2">No languages configured — site is single-language.</p>

        <div class="space-y-2">
          <div v-for="(locale, i) in settings.locales ?? []" :key="i" class="flex items-center gap-3 p-3 border dark:border-gray-600 rounded-lg">
            <div class="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Code</label>
                <input v-model="locale.code" type="text" placeholder="en" class="w-full border rounded-lg px-2.5 py-1.5 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Label</label>
                <input v-model="locale.label" type="text" placeholder="English" class="w-full border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
            <div class="flex flex-col items-center gap-1 shrink-0">
              <button
                @click="setDefault(i)"
                :class="['text-xs px-2 py-1 rounded-lg border transition', locale.default ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600']"
              >Default</button>
              <button @click="removeLocale(i)" class="text-gray-400 hover:text-red-500 transition p-1">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── NAVIGATION ─────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'navigation'" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">

        <!-- Locale switcher (only shown when locales are configured) -->
        <div v-if="settings.locales?.length" class="flex items-center gap-2 mb-5 pb-4 border-b dark:border-gray-700">
          <span class="text-xs text-gray-400 font-medium mr-1">Nav for:</span>
          <button
            @click="navLocaleTab = '__default__'"
            :class="['px-3 py-1 text-xs rounded-lg border transition font-medium', navLocaleTab === '__default__' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700']"
          >Default</button>
          <button
            v-for="locale in settings.locales"
            :key="locale.code"
            @click="navLocaleTab = locale.code"
            :class="['px-3 py-1 text-xs rounded-lg border transition font-medium', navLocaleTab === locale.code ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700']"
          >{{ locale.label || locale.code }}</button>
          <p v-if="navLocaleTab !== '__default__'" class="ml-2 text-xs text-gray-400 italic">Leave empty to fall back to Default nav</p>
        </div>

        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Navigation Menu</h2>
          <button @click="addActiveNavItem" class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
            </svg>
            Add item
          </button>
        </div>

        <div v-if="activeNavItems.length === 0" class="text-sm text-gray-400 italic text-center py-8">
          No nav items yet — click "Add item"
        </div>

        <div class="space-y-3">
          <div v-for="(item, i) in activeNavItems" :key="i" class="border dark:border-gray-600 rounded-lg overflow-hidden">
            <!-- Top-level item -->
            <div class="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700">
              <svg class="w-4 h-4 text-gray-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
              </svg>
              <input v-model="item.label" placeholder="Label" class="w-32 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />

              <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-xs">
                <button :class="['px-2 py-1.5 font-medium transition', hrefMode(item) === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(item, 'page')">Page</button>
                <button :class="['px-2 py-1.5 font-medium transition', hrefMode(item) === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(item, 'url')">URL</button>
              </div>

              <select v-if="hrefMode(item) === 'page'" v-model="item.href" class="flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                <option value="">— select a page —</option>
                <option v-for="p in pages" :key="p._id" :value="p.slug">{{ p.title }} ({{ p.slug }})</option>
              </select>
              <input v-else v-model="item.href" type="url" placeholder="https://…" class="flex-1 min-w-0 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />

              <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer">
                <input type="checkbox" v-model="item.newTab" class="rounded" />
                New tab
              </label>

              <button @click="moveActiveNavItem(i, -1)" :disabled="i === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd"/></svg>
              </button>
              <button @click="moveActiveNavItem(i, 1)" :disabled="i === activeNavItems.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
              </button>
              <button @click="removeActiveNavItem(i)" class="p-1 text-gray-400 hover:text-red-500" title="Remove">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
              </button>
            </div>

            <!-- Children -->
            <div v-if="item.children && item.children.length > 0" class="divide-y dark:divide-gray-600 border-t dark:border-gray-600">
              <div v-for="(child, ci) in item.children" :key="ci" class="flex items-center gap-2 px-4 py-2.5 pl-10">
                <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 10a.75.75 0 0 1 .75-.75h12.59l-2.1-1.95a.75.75 0 1 1 1.02-1.1l3.5 3.25a.75.75 0 0 1 0 1.1l-3.5 3.25a.75.75 0 1 1-1.02-1.1l2.1-1.95H2.75A.75.75 0 0 1 2 10Z" clip-rule="evenodd"/>
                </svg>
                <input v-model="child.label" placeholder="Label" class="w-28 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-xs">
                  <button :class="['px-2 py-1 font-medium transition', hrefMode(child) === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(child, 'page')">Page</button>
                  <button :class="['px-2 py-1 font-medium transition', hrefMode(child) === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(child, 'url')">URL</button>
                </div>
                <select v-if="hrefMode(child) === 'page'" v-model="child.href" class="flex-1 min-w-0 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">— select —</option>
                  <option v-for="p in pages" :key="p._id" :value="p.slug">{{ p.title }} ({{ p.slug }})</option>
                </select>
                <input v-else v-model="child.href" type="url" placeholder="https://…" class="flex-1 min-w-0 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer">
                  <input type="checkbox" v-model="child.newTab" class="rounded" /> New tab
                </label>
                <button @click="moveChild(item, ci, -1)" :disabled="ci === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd"/></svg></button>
                <button @click="moveChild(item, ci, 1)" :disabled="ci === item.children!.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg></button>
                <button @click="removeChild(item, ci)" class="p-1 text-gray-400 hover:text-red-500"><svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg></button>
              </div>
            </div>

            <!-- Add child -->
            <div class="px-4 py-2 border-t dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50">
              <button @click="addChild(item)" class="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition">
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
                Add sub-item
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TYPOGRAPHY & STYLES ─────────────────────────────────────────────── -->
    <div v-else-if="tab === 'typography'" class="space-y-6">

      <!-- Base fonts + size -->
      <div v-if="settings.typography" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-5">
        <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Base Fonts</h2>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Body Font</label>
            <select
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              :value="commonFonts.find(f => f.value === settings.typography!.bodyFont) ? settings.typography!.bodyFont : ''"
              @change="(e) => { const v = (e.target as HTMLSelectElement).value; if (v) settings!.typography!.bodyFont = v }"
            >
              <option value="">Custom…</option>
              <option v-for="f in commonFonts" :key="f.label" :value="f.value">{{ f.label }}</option>
            </select>
            <input v-model="settings.typography.bodyFont" type="text" placeholder="system-ui, sans-serif" class="mt-1.5 w-full border rounded-lg px-3 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Heading Font</label>
            <select
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              :value="commonFonts.find(f => f.value === settings.typography!.headingFont) ? settings.typography!.headingFont : ''"
              @change="(e) => { const v = (e.target as HTMLSelectElement).value; if (v) settings!.typography!.headingFont = v }"
            >
              <option value="">Custom…</option>
              <option v-for="f in commonFonts" :key="f.label" :value="f.value">{{ f.label }}</option>
            </select>
            <input v-model="settings.typography.headingFont" type="text" placeholder="system-ui, sans-serif" class="mt-1.5 w-full border rounded-lg px-3 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Base Font Size</label>
          <input v-model="settings.typography.baseSize" type="text" placeholder="16px" class="w-32 border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
        </div>
      </div>

      <!-- Theme Colors -->
      <div v-if="settings.typography" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Theme Colors</h2>
          <p class="text-xs text-gray-400 mt-1">These become CSS variables (<code class="font-mono">--color-bg</code>, <code class="font-mono">--color-accent</code>, etc.) available site-wide.</p>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div v-for="(scheme, key) in ({ light: settings.typography.light!, dark: settings.typography.dark! })" :key="key" class="space-y-3">
            <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide border-b dark:border-gray-700 pb-2">
              {{ key === 'light' ? '☀️  Light' : '🌙  Dark' }}
            </p>
            <div
              v-for="(label, field) in ({
                background: 'Background',
                surface: 'Surface (cards)',
                border: 'Border',
                textPrimary: 'Body text',
                textSecondary: 'Muted text',
                textHeading: 'Headings',
                accent: 'Accent',
                accentFg: 'Accent foreground',
              } as Record<keyof ThemeTokens, string>)"
              :key="field"
              class="flex items-center gap-3"
            >
              <input
                type="color"
                :value="scheme[field]"
                class="h-8 w-10 rounded border dark:border-gray-600 cursor-pointer bg-transparent shrink-0"
                @input="scheme[field] = ($event.target as HTMLInputElement).value"
              />
              <span class="text-sm text-gray-600 dark:text-gray-300 w-36 shrink-0">{{ label }}</span>
              <input
                type="text"
                :value="scheme[field]"
                class="flex-1 border rounded-lg px-2.5 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                @change="scheme[field] = ($event.target as HTMLInputElement).value"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Named text styles -->
      <div v-if="settings.typography" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Named Text Styles</h2>
            <p class="text-xs text-gray-400 mt-1">Available as a dropdown in every rich-text editor</p>
          </div>
          <button @click="addTextStyle" class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
            Add style
          </button>
        </div>

        <p v-if="settings.typography.styles.length === 0" class="text-sm text-gray-400 italic py-4 text-center">No named styles yet.</p>

        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="(ts, i) in settings.typography.styles"
            :key="i"
            class="border dark:border-gray-600 rounded-xl p-4 space-y-3"
          >
            <div class="flex items-center gap-2">
              <input
                v-model="ts.name"
                type="text"
                placeholder="Style name (e.g. Pull Quote)"
                class="flex-1 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
              />
              <button @click="removeTextStyle(i)" class="text-gray-400 hover:text-red-500 p-1 shrink-0" title="Remove">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
              </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Font Family</label>
                <input v-model="ts.fontFamily" type="text" placeholder="Georgia, serif" class="w-full border rounded-lg px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Font Size</label>
                <input v-model="ts.fontSize" type="text" placeholder="1.125rem" class="w-full border rounded-lg px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Weight</label>
                <input v-model="ts.fontWeight" type="text" placeholder="400" class="w-full border rounded-lg px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-0.5">Line Height</label>
                <input v-model="ts.lineHeight" type="text" placeholder="1.6" class="w-full border rounded-lg px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-gray-400 mb-0.5">Color <span class="text-gray-300">(optional)</span></label>
                <div class="flex gap-2 items-center">
                  <input v-model="ts.color" type="color" class="h-7 w-10 rounded border dark:border-gray-600 cursor-pointer bg-transparent" />
                  <input v-model="ts.color" type="text" placeholder="#1a1a1a or empty for inherit" class="flex-1 border rounded-lg px-2 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
              </div>
            </div>
            <!-- Preview -->
            <div
              v-if="ts.name"
              class="px-3 py-2 rounded bg-gray-50 dark:bg-gray-700/50 text-sm border dark:border-gray-600"
              :style="{
                fontFamily: ts.fontFamily,
                fontSize: ts.fontSize,
                fontWeight: ts.fontWeight || undefined,
                lineHeight: ts.lineHeight || undefined,
                color: ts.color || undefined,
              }"
            >
              {{ ts.name }} — The quick brown fox
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CUSTOM CSS ──────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'css'" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-3">
        <div>
          <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Custom CSS</h2>
          <p class="text-xs text-gray-400 mt-1">Injected into <code class="font-mono">&lt;head&gt;</code> on every public page. Use <code class="font-mono">.dark</code> selectors for dark-mode variants.</p>
        </div>
        <CssHintPanel :groups="siteCssHints" />
        <textarea
          v-model="settings.customCss"
          rows="18"
          placeholder="body { font-family: 'Inter', sans-serif; }&#10;&#10;.dark body {&#10;  background: #0f172a;&#10;  color: #f1f5f9;&#10;}"
          class="w-full border rounded-lg px-3 py-2.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
        />
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-3">
        <div>
          <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Head Scripts</h2>
          <p class="text-xs text-gray-400 mt-1">Injected into <code class="font-mono">&lt;head&gt;</code> on every public page.</p>
        </div>
        <textarea
          v-model="settings.headScripts"
          rows="8"
          placeholder="&lt;script src=&quot;https://…&quot;&gt;&lt;/script&gt;&#10;&lt;link rel=&quot;stylesheet&quot; href=&quot;…&quot; /&gt;"
          class="w-full border rounded-lg px-3 py-2.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
        />
      </div>
    </div>

    <!-- ── SITE HISTORY ───────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'history'" class="space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700">
          <div>
            <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Site History</h2>
            <p class="text-xs text-gray-400 mt-0.5">Every content commit across all pages and settings. Reverting creates a new commit — no history is lost.</p>
          </div>
          <button @click="siteHistoryLoaded = false; loadSiteHistory()" class="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd"/></svg>
            Refresh
          </button>
        </div>

        <div v-if="siteHistoryLoading" class="flex items-center justify-center py-16 text-gray-400">
          <svg class="w-5 h-5 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          Loading history…
        </div>

        <div v-else-if="siteHistory.length === 0" class="py-12 text-center text-gray-400 text-sm italic">
          No commits yet.
        </div>

        <div v-else>
          <p v-if="revertError" class="px-5 py-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700">{{ revertError }}</p>
          <p v-if="revertDone" class="px-5 py-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border-b dark:border-gray-700">
            Site reverted successfully. A new commit has been created restoring content to that point.
          </p>

          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-gray-400 bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                <th class="px-5 py-2.5 text-left font-medium w-16">Hash</th>
                <th class="px-5 py-2.5 text-left font-medium">Commit message</th>
                <th class="px-5 py-2.5 text-left font-medium hidden lg:table-cell">Author</th>
                <th class="px-5 py-2.5 text-left font-medium">Date</th>
                <th class="px-5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y dark:divide-gray-700">
              <tr
                v-for="(commit, i) in siteHistory"
                :key="commit.hash"
                :class="[
                  'group transition',
                  revertDone === commit.hash ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30',
                  i === 0 ? 'font-medium' : '',
                ]"
              >
                <td class="px-5 py-3 font-mono text-xs text-gray-400">{{ commit.hash.slice(0, 7) }}</td>
                <td class="px-5 py-3 text-gray-700 dark:text-gray-300 max-w-xs">
                  <span class="line-clamp-1">{{ commit.message }}</span>
                  <span v-if="i === 0" class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">current</span>
                </td>
                <td class="px-5 py-3 text-gray-500 dark:text-gray-400 hidden lg:table-cell text-xs">{{ commit.author }}</td>
                <td class="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{{ formatDate(commit.date) }}</td>
                <td class="px-5 py-3 text-right">
                  <button
                    v-if="i !== 0"
                    @click="revertSite(commit)"
                    :disabled="reverting !== null"
                    class="flex items-center gap-1.5 ml-auto px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition"
                  >
                    <svg v-if="reverting === commit.hash" class="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    <svg v-else class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd"/></svg>
                    {{ reverting === commit.hash ? 'Reverting…' : 'Revert to this' }}
                  </button>
                  <span v-else class="text-xs text-gray-300 dark:text-gray-600 italic">current</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>

  <div v-else class="flex items-center justify-center h-64 text-gray-400">
    <svg class="w-6 h-6 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
    </svg>
    Loading…
  </div>
</template>
