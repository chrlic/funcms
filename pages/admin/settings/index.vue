<script setup lang="ts">
import type { SiteSettings, NavItem, TextStyle } from '~/types'
import { siteCssHints } from '~/composables/useCssHints'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const settings = ref<SiteSettings | null>(null)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

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
  if (!settings.value.typography) settings.value.typography = { ...defaultTypography }
  if (!settings.value.typography.styles) settings.value.typography.styles = []
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
</script>

<template>
  <div v-if="settings">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Site Settings</h1>
      <button
        @click="save"
        :disabled="saving"
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
      >
        <!-- spinner -->
        <svg v-if="saving" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <!-- check -->
        <svg v-else-if="saved" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/>
        </svg>
        <!-- cloud-arrow-up -->
        <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd"/>
        </svg>
        {{ saving ? 'Saving…' : saved ? 'Saved!' : 'Save' }}
      </button>
    </div>

    <p v-if="error" class="mb-4 text-red-500 text-sm">{{ error }}</p>

    <div class="grid grid-cols-3 gap-6">
      <!-- Navigation -->
      <div class="col-span-2 space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Navigation Menu</h2>
            <button @click="addNavItem" class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition">
              <!-- plus -->
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
              </svg>
              Add item
            </button>
          </div>

          <div v-if="settings.nav.length === 0" class="text-sm text-gray-400 italic text-center py-6">
            No nav items yet — click "Add item"
          </div>

          <div class="space-y-3">
            <div v-for="(item, i) in settings.nav" :key="i" class="border dark:border-gray-600 rounded-lg overflow-hidden">

              <!-- Top-level item -->
              <div class="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700">
                <!-- drag handle -->
                <svg class="w-4 h-4 text-gray-400 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
                </svg>
                <input v-model="item.label" placeholder="Label" class="w-32 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />

                <!-- href mode toggle -->
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

                <button @click="moveNavItem(i, -1)" :disabled="i === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd"/></svg>
                </button>
                <button @click="moveNavItem(i, 1)" :disabled="i === settings.nav.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
                </button>
                <button @click="removeNavItem(i)" class="p-1 text-gray-400 hover:text-red-500" title="Remove">
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
                </button>
              </div>

              <!-- Children -->
              <div v-if="item.children && item.children.length > 0" class="divide-y dark:divide-gray-600 border-t dark:border-gray-600">
                <div v-for="(child, ci) in item.children" :key="ci" class="flex items-center gap-2 px-4 py-2.5 pl-10">
                  <!-- sub-item arrow -->
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
                    <input type="checkbox" v-model="child.newTab" class="rounded" />
                    New tab
                  </label>

                  <button @click="moveChild(item, ci, -1)" :disabled="ci === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                    <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd"/></svg>
                  </button>
                  <button @click="moveChild(item, ci, 1)" :disabled="ci === item.children!.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                    <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
                  </button>
                  <button @click="removeChild(item, ci)" class="p-1 text-gray-400 hover:text-red-500" title="Remove">
                    <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
                  </button>
                </div>
              </div>

              <!-- Add child -->
              <div class="px-4 py-2 border-t dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50">
                <button @click="addChild(item)" class="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition">
                  <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
                  </svg>
                  Add sub-item
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- General settings -->
      <div class="space-y-5">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">General</h3>
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
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-2">Navigation Style</label>
            <div class="flex gap-2">
              <button
                v-for="opt in [{ value: 'topbar', label: 'Top bar' }, { value: 'sidebar-left', label: 'Left sidebar' }]"
                :key="opt.value"
                @click="settings.navStyle = opt.value as 'topbar' | 'sidebar-left'"
                :class="[
                  'flex-1 py-2 px-3 text-sm rounded-lg border transition font-medium',
                  settings.navStyle === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                ]"
              >{{ opt.label }}</button>
            </div>
          </div>
        </div>

        <!-- Typography -->
        <div v-if="settings.typography" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Typography</h3>

          <!-- Base fonts -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Body Font</label>
              <select
                class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                :value="commonFonts.find(f => f.value === settings.typography.bodyFont) ? settings.typography.bodyFont : ''"
                @change="(e) => { const v = (e.target as HTMLSelectElement).value; if (v) settings!.typography!.bodyFont = v }"
              >
                <option value="">Custom…</option>
                <option v-for="f in commonFonts" :key="f.label" :value="f.value">{{ f.label }}</option>
              </select>
              <input
                v-model="settings.typography.bodyFont"
                type="text"
                placeholder="system-ui, sans-serif"
                class="mt-1 w-full border rounded-lg px-3 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Heading Font</label>
              <select
                class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                :value="commonFonts.find(f => f.value === settings.typography.headingFont) ? settings.typography.headingFont : ''"
                @change="(e) => { const v = (e.target as HTMLSelectElement).value; if (v) settings!.typography!.headingFont = v }"
              >
                <option value="">Custom…</option>
                <option v-for="f in commonFonts" :key="f.label" :value="f.value">{{ f.label }}</option>
              </select>
              <input
                v-model="settings.typography.headingFont"
                type="text"
                placeholder="system-ui, sans-serif"
                class="mt-1 w-full border rounded-lg px-3 py-1.5 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Base Font Size</label>
            <input
              v-model="settings.typography.baseSize"
              type="text"
              placeholder="16px"
              class="w-32 border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <!-- Named text styles -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <p class="text-xs font-medium text-gray-500">Named Text Styles</p>
                <p class="text-xs text-gray-400 mt-0.5">Available as a dropdown in every rich-text editor</p>
              </div>
              <button
                @click="addTextStyle"
                class="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
              >
                <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
                Add style
              </button>
            </div>

            <p v-if="settings.typography.styles.length === 0" class="text-xs text-gray-400 italic py-2">No named styles yet.</p>

            <div class="space-y-3">
              <div
                v-for="(ts, i) in settings.typography.styles"
                :key="i"
                class="border dark:border-gray-600 rounded-lg p-3 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="ts.name"
                    type="text"
                    placeholder="Style name (e.g. Pull Quote)"
                    class="flex-1 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
                  />
                  <button @click="removeTextStyle(i)" class="text-gray-400 hover:text-red-500 p-1" title="Remove">
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
                  class="mt-1 px-3 py-2 rounded bg-gray-50 dark:bg-gray-700/50 text-sm border dark:border-gray-600"
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

        <!-- Site-wide custom CSS -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-3">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Custom CSS <span class="normal-case font-normal text-gray-400 text-xs">— applied site-wide</span></h3>
          <CssHintPanel :groups="siteCssHints" />
          <textarea
            v-model="settings.customCss"
            rows="10"
            placeholder="body { font-family: 'Inter', sans-serif; }&#10;header { background: #1e1b4b; }&#10;header a { color: white; }"
            class="w-full border rounded-lg px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
          />
        </div>

        <!-- Head scripts -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-3">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Head Scripts <span class="normal-case font-normal text-gray-400 text-xs">— injected into &lt;head&gt;</span></h3>
          <textarea
            v-model="settings.headScripts"
            rows="6"
            placeholder="&lt;script src=&quot;https://…&quot;&gt;&lt;/script&gt;&#10;&lt;link rel=&quot;stylesheet&quot; href=&quot;…&quot; /&gt;"
            class="w-full border rounded-lg px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
          />
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
