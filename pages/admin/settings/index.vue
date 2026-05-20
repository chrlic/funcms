<script setup lang="ts">
import type { SiteSettings, NavItem } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const settings = ref<SiteSettings | null>(null)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const { pages, load: loadPages } = usePagePicker()

onMounted(async () => {
  const [sRes] = await Promise.all([
    $fetch<{ data: SiteSettings }>('/api/settings'),
    loadPages(),
  ])
  settings.value = sRes.data
  if (!settings.value.nav) settings.value.nav = []
})

async function save() {
  if (!settings.value) return
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const res = await $fetch<{ data: SiteSettings }>('/api/settings', {
      method: 'PUT',
      body: settings.value,
    })
    settings.value = res.data
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
  ;[nav[i], nav[j]] = [nav[j], nav[i]]
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
  ;[ch[ci], ch[j]] = [ch[j], ch[ci]]
}

type HrefMode = 'page' | 'url'

function hrefMode(item: NavItem): HrefMode {
  if (!item.href || item.href === 'https://') return 'page'
  if (item.href.startsWith('/') && !item.href.startsWith('//')) return 'page'
  return 'url'
}

function setHrefMode(item: NavItem, mode: HrefMode) {
  item.href = mode === 'page' ? '' : 'https://'
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
        <Icon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
        <Icon v-else-if="saved" name="i-heroicons-check" class="w-4 h-4" />
        <Icon v-else name="i-heroicons-cloud-arrow-up" class="w-4 h-4" />
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
              <Icon name="i-heroicons-plus" class="w-4 h-4" />
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
                <Icon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400 shrink-0" />
                <input v-model="item.label" placeholder="Label" class="w-32 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />

                <!-- href mode -->
                <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-xs">
                  <button :class="['px-2 py-1.5 font-medium transition', hrefMode(item) === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(item, 'page')">Page</button>
                  <button :class="['px-2 py-1.5 font-medium transition', hrefMode(item) === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(item, 'url')">URL</button>
                </div>

                <select v-if="hrefMode(item) === 'page'" v-model="item.href" class="flex-1 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
                  <option value="">— select a page —</option>
                  <option v-for="p in pages" :key="p._id" :value="p.slug">{{ p.title }} ({{ p.slug }})</option>
                </select>
                <input v-else v-model="item.href" type="url" placeholder="https://…" class="flex-1 border rounded-lg px-2.5 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />

                <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer">
                  <input type="checkbox" v-model="item.newTab" class="rounded" />
                  New tab
                </label>

                <button @click="moveNavItem(i, -1)" :disabled="i === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><Icon name="i-heroicons-chevron-up" class="w-4 h-4" /></button>
                <button @click="moveNavItem(i, 1)" :disabled="i === settings.nav.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><Icon name="i-heroicons-chevron-down" class="w-4 h-4" /></button>
                <button @click="removeNavItem(i)" class="p-1 text-gray-400 hover:text-red-500"><Icon name="i-heroicons-trash" class="w-4 h-4" /></button>
              </div>

              <!-- Children -->
              <div v-if="item.children && item.children.length > 0" class="divide-y dark:divide-gray-600 border-t dark:border-gray-600">
                <div v-for="(child, ci) in item.children" :key="ci" class="flex items-center gap-2 px-4 py-2.5 pl-10">
                  <Icon name="i-heroicons-arrow-turn-down-right" class="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input v-model="child.label" placeholder="Label" class="w-28 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />

                  <div class="flex rounded-lg border dark:border-gray-600 overflow-hidden text-xs">
                    <button :class="['px-2 py-1 font-medium transition', hrefMode(child) === 'page' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(child, 'page')">Page</button>
                    <button :class="['px-2 py-1 font-medium transition', hrefMode(child) === 'url' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600']" @click="setHrefMode(child, 'url')">URL</button>
                  </div>

                  <select v-if="hrefMode(child) === 'page'" v-model="child.href" class="flex-1 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">— select —</option>
                    <option v-for="p in pages" :key="p._id" :value="p.slug">{{ p.title }} ({{ p.slug }})</option>
                  </select>
                  <input v-else v-model="child.href" type="url" placeholder="https://…" class="flex-1 border rounded-lg px-2.5 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />

                  <label class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer">
                    <input type="checkbox" v-model="child.newTab" class="rounded" />
                    New tab
                  </label>

                  <button @click="moveChild(item, ci, -1)" :disabled="ci === 0" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><Icon name="i-heroicons-chevron-up" class="w-3 h-3" /></button>
                  <button @click="moveChild(item, ci, 1)" :disabled="ci === item.children!.length - 1" class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><Icon name="i-heroicons-chevron-down" class="w-3 h-3" /></button>
                  <button @click="removeChild(item, ci)" class="p-1 text-gray-400 hover:text-red-500"><Icon name="i-heroicons-trash" class="w-3 h-3" /></button>
                </div>
              </div>

              <!-- Add child -->
              <div class="px-4 py-2 border-t dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50">
                <button @click="addChild(item)" class="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition">
                  <Icon name="i-heroicons-plus" class="w-3.5 h-3.5" />
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
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-64 text-gray-400">
    <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mr-2" /> Loading…
  </div>
</template>
