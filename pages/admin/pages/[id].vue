<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Page, Block, BlockType, LayoutType } from '~/types'
import { pageCssHints } from '~/composables/useCssHints'
import staticBlockRegistry from '~/components/blocks/index'
import type { Component } from 'vue'

const { metas: customBlockMetas } = useCustomBlocks()
const { registry: customRegistry } = useCustomBlocks()
const { cssVars } = useTypography()
useHead({ style: computed(() => cssVars.value ? [{ innerHTML: cssVars.value }] : []) })

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const route = useRoute()
const id = route.params.id as string
const session = useSessionStore()
const { sfetch } = useSessionFetch()

// ─── Load page ────────────────────────────────────────────────────────────────

const page = ref<Page | null>(null)
const loading = ref(true)

async function loadPage() {
  try {
    const headers: Record<string, string> = {}
    if (session.sessionId) headers['X-Session-Id'] = session.sessionId
    const result = await $fetch<{ data: Page }>(`/api/pages/${id}`, { headers })
    page.value = { ...result.data, blocks: result.data.blocks ?? [] }
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

async function refresh() {
  await loadPage()
}

// ─── Session guard ────────────────────────────────────────────────────────────

async function ensureSession() {
  if (!session.isActive) {
    await session.openSession()
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

const saving = ref(false)
const saveError = ref('')
const saved = ref(false)
const isDirty = ref(false)

async function save() {
  if (!page.value) return
  await ensureSession()
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await sfetch<{ data: Page }>(`/api/pages/${id}`, {
      method: 'PUT',
      body: page.value,
    })
    session.markDirty()
    isDirty.value = false
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (e: unknown) {
    saveError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

// ─── Block management ─────────────────────────────────────────────────────────

const builtinBlockTypes: { type: BlockType; label: string }[] = [
  { type: 'hero', label: 'Hero' },
  { type: 'rich-text', label: 'Rich Text' },
  { type: 'media-text', label: 'Media + Text' },
  { type: 'grid', label: 'Grid' },
  { type: 'image', label: 'Image' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'video', label: 'Video' },
  { type: 'cta', label: 'Call to Action' },
  { type: 'card-row', label: 'Card Row' },
  { type: 'divider', label: 'Divider' },
  { type: 'raw-html', label: 'Raw HTML' },
]

const allBlockTypes = computed(() => [
  ...builtinBlockTypes,
  ...customBlockMetas.value.map(m => ({ type: m.slug as BlockType, label: m.label, custom: true, description: m.description })),
])

const layoutOptions: { value: LayoutType; label: string }[] = [
  { value: 'full-width', label: 'Full Width' },
  { value: 'sidebar-left', label: 'Sidebar Left' },
  { value: 'sidebar-right', label: 'Sidebar Right' },
  { value: 'landing', label: 'Landing' },
  { value: 'blank', label: 'Blank' },
]

const showAddBlock = ref(false)
const addBlockSlot = ref('main')
const showBgPicker = ref(false)

function addBlock(type: BlockType) {
  if (!page.value) return
  const existing = page.value.blocks ?? []
  const maxOrder = existing.filter(b => b.slot === addBlockSlot.value).reduce((m, b) => Math.max(m, b.order), -1)
  const newBlock: Block = {
    id: crypto.randomUUID(),
    type,
    order: maxOrder + 1,
    slot: addBlockSlot.value,
    visible: true,
    props: {},
  }
  page.value = { ...page.value, blocks: [...existing, newBlock] }
  showAddBlock.value = false
  isDirty.value = true
}

function updateBlock(index: number, updated: Block) {
  if (!page.value) return
  const blocks = [...(page.value.blocks ?? [])]
  blocks[index] = updated
  page.value = { ...page.value, blocks }
  isDirty.value = true
}

function removeBlock(index: number) {
  if (!page.value) return
  if (!confirm('Remove this block?')) return
  const blocks = [...(page.value.blocks ?? [])]
  blocks.splice(index, 1)
  page.value = { ...page.value, blocks }
  isDirty.value = true
}

function moveBlock(index: number, direction: 'up' | 'down') {
  if (!page.value) return
  const blocks = [...(page.value.blocks ?? [])]
  const block = blocks[index]
  // Find adjacent block in same slot
  const sameSlot = blocks.filter(b => b.slot === block.slot).sort((a, b) => a.order - b.order)
  const pos = sameSlot.indexOf(block)
  const targetPos = direction === 'up' ? pos - 1 : pos + 1
  if (targetPos < 0 || targetPos >= sameSlot.length) return
  const target = sameSlot[targetPos]
  const tempOrder = block.order
  block.order = target.order
  target.order = tempOrder
  page.value.blocks = [...blocks]
}

const sortedBlocks = computed(() => {
  if (!page.value) return []
  return [...(page.value.blocks ?? [])].sort((a, b) => {
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot)
    return a.order - b.order
  })
})

// draggableBlocks is the writable array vuedraggable binds to.
// Reading returns sortedBlocks; writing after a drag reorders via order fields.
const draggableBlocks = computed({
  get: () => sortedBlocks.value,
  set: (reordered: Block[]) => {
    if (!page.value) return
    const updated = reordered.map((b, i) => ({ ...b, order: i }))
    // Merge back into page.value.blocks preserving any slot separation
    const others = (page.value.blocks ?? []).filter(
      b => !reordered.find(r => r.id === b.id)
    )
    page.value = { ...page.value, blocks: [...updated, ...others] }
    isDirty.value = true
  },
})

function onDragEnd() {
  isDirty.value = true
}

// ─── History ──────────────────────────────────────────────────────────────────

interface CommitEntry { hash: string; message: string; author: string; date: string }

const showHistory = ref(false)
const historyList = ref<CommitEntry[]>([])
const historyLoading = ref(false)

const previewCommit = ref<CommitEntry | null>(null)
const previewPage = ref<Page | null>(null)
const previewLoading = ref(false)

const restoring = ref(false)
const restoreError = ref('')

async function loadHistory() {
  showHistory.value = true
  historyLoading.value = true
  try {
    const res = await $fetch<{ data: CommitEntry[] }>(`/api/pages/${id}/history`)
    historyList.value = res.data
  } finally {
    historyLoading.value = false
  }
}

async function previewVersion(commit: CommitEntry) {
  previewCommit.value = commit
  previewPage.value = null
  previewLoading.value = true
  restoreError.value = ''
  try {
    const res = await $fetch<{ data: Page }>(`/api/pages/${id}/history`, { query: { hash: commit.hash } })
    previewPage.value = res.data
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  previewCommit.value = null
  previewPage.value = null
  restoreError.value = ''
}

async function restoreVersion() {
  if (!previewCommit.value) return
  if (!confirm(`Restore page to version from ${new Date(previewCommit.value.date).toLocaleString()}? Current state will remain in history.`)) return
  restoring.value = true
  restoreError.value = ''
  try {
    const res = await sfetch<{ data: Page }>(`/api/pages/${id}/restore`, {
      method: 'POST',
      body: { hash: previewCommit.value.hash },
    })
    page.value = { ...res.data, blocks: res.data.blocks ?? [] }
    session.markDirty()
    isDirty.value = false
    showHistory.value = false
    closePreview()
  } catch (e: unknown) {
    restoreError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Restore failed'
  } finally {
    restoring.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
</script>

<template>
  <div v-if="page">
    <!-- Topbar -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/pages" class="text-gray-400 hover:text-gray-600">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd"/></svg>
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ page.title }}</h1>
        <span :class="[
          'px-2 py-0.5 rounded-full text-xs font-medium',
          page.status === 'published' ? 'bg-green-100 text-green-700' :
          page.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
        ]">{{ page.status }}</span>
      </div>
      <div class="flex items-center gap-3">
        <a :href="`${page.slug}?preview=1${session.sessionId ? '&sid=' + session.sessionId : ''}`" target="_blank" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
          Preview
        </a>
        <button @click="loadHistory" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd"/></svg>
          History
        </button>
        <button
          @click="save"
          :disabled="saving"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <svg v-if="saving" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          <svg v-else-if="saved" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clip-rule="evenodd"/></svg>
          {{ saving ? 'Saving…' : saved ? 'Saved!' : isDirty ? 'Save*' : 'Save' }}
        </button>
      </div>
    </div>

    <p v-if="saveError" class="mb-4 text-red-500 text-sm">{{ saveError }}</p>

    <div class="grid grid-cols-3 gap-6">
      <!-- Left: blocks -->
      <div class="col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-700 dark:text-gray-300">Blocks</h2>
          <button
            @click="showAddBlock = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm rounded-lg hover:opacity-80 transition"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
            Add block
          </button>
        </div>

        <div v-if="sortedBlocks.length === 0" class="rounded-xl border-2 border-dashed dark:border-gray-600 p-12 text-center text-gray-400">
          <svg class="w-10 h-10 mx-auto mb-2 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2 4.25A2.25 2.25 0 0 1 4.25 2h6.5A2.25 2.25 0 0 1 13 4.25V5.5H9.25A3.75 3.75 0 0 0 5.5 9.25V13H4.25A2.25 2.25 0 0 1 2 10.75v-6.5Z"/><path d="M9.25 7A2.25 2.25 0 0 0 7 9.25v6.5A2.25 2.25 0 0 0 9.25 18h6.5A2.25 2.25 0 0 0 18 15.75v-6.5A2.25 2.25 0 0 0 15.75 7h-6.5Zm.75 5.5v-2h2v-2h1.5v2h2v1.5h-2v2h-1.5v-2h-2Z"/></svg>
          <p>No blocks yet — click "Add block" to start building</p>
        </div>

        <draggable
          v-model="draggableBlocks"
          item-key="id"
          handle=".drag-handle"
          ghost-class="opacity-40"
          @end="onDragEnd"
          class="space-y-4"
        >
          <template #item="{ element: block }">
            <BlockEditor
              :key="block.id"
              :block="block"
              @update="(b) => updateBlock(page!.blocks.indexOf(block), b)"
              @remove="removeBlock(page!.blocks.indexOf(block))"
              @move-up="moveBlock(page!.blocks.indexOf(block), 'up')"
              @move-down="moveBlock(page!.blocks.indexOf(block), 'down')"
            />
          </template>
        </draggable>
      </div>

      <!-- Right: page settings -->
      <div class="space-y-5">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Page Settings</h3>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input v-model="page.title" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Slug</label>
            <input v-model="page.slug" class="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select v-model="page.status" :class="[
              'w-full border rounded-lg px-3 py-2 text-sm font-medium dark:border-gray-600',
              page.status === 'published' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300' :
              page.status === 'draft'     ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                           'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            ]">
              <option value="draft">Draft — not visible on site</option>
              <option value="published">Published — live on site</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Layout</label>
            <select v-model="page.layout" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option v-for="opt in layoutOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>

          <div v-if="page.layout === 'sidebar-left' || page.layout === 'sidebar-right'">
            <label class="block text-xs font-medium text-gray-500 mb-1">
              Sidebar Width — {{ page.layoutOptions?.sidebarWidth ?? 25 }}%
            </label>
            <input
              type="range"
              min="10" max="50" step="5"
              :value="page.layoutOptions?.sidebarWidth ?? 25"
              @input="page.layoutOptions = { ...page.layoutOptions, sidebarWidth: Number(($event.target as HTMLInputElement).value) }; isDirty.value = true"
              class="w-full accent-indigo-600"
            />
            <div class="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>10%</span><span>50%</span>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">SEO / Meta</h3>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Meta Title</label>
            <input v-model="page.meta.title" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Meta Description</label>
            <textarea v-model="page.meta.description" rows="3" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="page.meta.noIndex" class="rounded" />
            <span class="text-sm text-gray-700 dark:text-gray-300">No-index (hide from search engines)</span>
          </label>
        </div>

        <!-- Appearance -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
          <h3 class="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Appearance</h3>

          <!-- Background image -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Background Image</label>
            <div class="flex gap-2">
              <input
                :value="page.style?.bgImage ?? ''"
                type="url"
                placeholder="https://… or /uploads/…"
                class="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                @input="page.style = { ...page.style, bgImage: ($event.target as HTMLInputElement).value }; isDirty.value = true"
              />
              <button
                type="button"
                class="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition"
                @click="showBgPicker = true"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd"/></svg>
                Library
              </button>
            </div>
            <img v-if="page.style?.bgImage" :src="page.style.bgImage" class="mt-2 h-20 w-full rounded-lg object-cover border dark:border-gray-600" />
            <MediaPicker v-if="showBgPicker" @select="page.style = { ...page.style, bgImage: $event }; isDirty.value = true; showBgPicker = false" @close="showBgPicker = false" />
          </div>

          <div v-if="page.style?.bgImage" class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Size</label>
              <select
                :value="page.style?.bgSize ?? 'cover'"
                class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                @change="page.style = { ...page.style, bgSize: ($event.target as HTMLSelectElement).value as 'cover'|'contain'|'auto' }; isDirty.value = true"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Natural size</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Position</label>
              <select
                :value="page.style?.bgPosition ?? 'center'"
                class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                @change="page.style = { ...page.style, bgPosition: ($event.target as HTMLSelectElement).value }; isDirty.value = true"
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div v-if="page.style?.bgImage" class="space-y-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" :checked="page.style?.bgFixed ?? false" class="rounded" @change="page.style = { ...page.style, bgFixed: ($event.target as HTMLInputElement).checked }; isDirty.value = true" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Parallax (fixed attachment)</span>
            </label>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Dark overlay — {{ page.style?.bgOverlay ?? 0 }}%</label>
              <input
                type="range" min="0" max="80" step="5"
                :value="page.style?.bgOverlay ?? 0"
                class="w-full accent-indigo-600"
                @input="page.style = { ...page.style, bgOverlay: Number(($event.target as HTMLInputElement).value) }; isDirty.value = true"
              />
            </div>
          </div>

          <!-- Background colour (standalone, no image needed) -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Background Colour</label>
            <div class="flex gap-2">
              <input type="color" :value="page.style?.bgColor ?? '#ffffff'" class="w-10 h-10 rounded border cursor-pointer" @input="page.style = { ...page.style, bgColor: ($event.target as HTMLInputElement).value }; isDirty.value = true" />
              <input :value="page.style?.bgColor ?? ''" type="text" placeholder="transparent" class="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono" @input="page.style = { ...page.style, bgColor: ($event.target as HTMLInputElement).value }; isDirty.value = true" />
              <button v-if="page.style?.bgColor" @click="page.style = { ...page.style, bgColor: undefined }; isDirty.value = true" class="px-2 text-gray-400 hover:text-red-500 transition text-xs">Clear</button>
            </div>
          </div>

          <!-- Page-level custom CSS -->
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Custom CSS <span class="normal-case font-normal text-gray-400">(scoped to this page)</span></label>
            <CssHintPanel :groups="pageCssHints" />
            <textarea
              :value="page.style?.customCss ?? ''"
              rows="6"
              placeholder=".my-class { color: red; }&#10;h1 { font-size: 3rem; }"
              class="mt-2 w-full border rounded-lg px-3 py-2 text-xs font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
              @input="page.style = { ...page.style, customCss: ($event.target as HTMLTextAreaElement).value }; isDirty.value = true"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Add block modal -->
    <div v-if="showAddBlock" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">Add Block</h2>
          <button @click="showAddBlock = false" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-500 mb-1">Slot</label>
          <select v-model="addBlockSlot" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="main">main</option>
            <option value="hero">hero</option>
            <option value="sidebar">sidebar</option>
            <option value="footer">footer</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="bt in allBlockTypes"
            :key="bt.type"
            @click="addBlock(bt.type)"
            class="flex items-center gap-2 px-3 py-2.5 border dark:border-gray-600 rounded-lg text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition"
            :class="(bt as { custom?: boolean }).custom ? 'border-purple-200 dark:border-purple-700' : ''"
          >
            <!-- Custom block icon -->
            <svg v-if="(bt as { custom?: boolean }).custom" class="w-4 h-4 text-purple-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.25 3A2.25 2.25 0 0 0 1 5.25v9.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H3.25Zm.943 8.752a.75.75 0 0 1 .05-1.06L6.867 9l-2.624-1.692a.75.75 0 1 1 .814-1.26l3.38 2.184a.75.75 0 0 1 0 1.27l-3.38 2.184a.75.75 0 0 1-1.06-.05ZM9.25 12a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" clip-rule="evenodd" /></svg>
            <!-- Built-in block icon -->
            <svg v-else class="w-4 h-4 text-indigo-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M12 4.467c0-.405.262-.75.559-1.027.504-.46.857-1.08.857-1.773a.75.75 0 0 0-.75-.75 3.504 3.504 0 0 0-3.5 3.5c0 .097.004.193.012.288A4.498 4.498 0 0 0 5.5 9.25H4.25a.75.75 0 0 0 0 1.5H5.5v.5H4.25a.75.75 0 0 0 0 1.5H5.5a4.5 4.5 0 0 0 4.5 4.5v1.25a.75.75 0 0 0 1.5 0V17.25a4.5 4.5 0 0 0 4.5-4.5h1.25a.75.75 0 0 0 0-1.5H16v-.5h1.25a.75.75 0 0 0 0-1.5H16a4.498 4.498 0 0 0-3.678-4.427c.008-.095.012-.19.012-.288A.75.75 0 0 0 12 4.467Z"/></svg>
            <div class="min-w-0">
              <div class="truncate">{{ bt.label }}</div>
              <div v-if="(bt as { custom?: boolean }).custom" class="text-xs text-purple-400">custom</div>
            </div>
          </button>
        </div>
        <div v-if="customBlockMetas.length" class="mt-3 pt-3 border-t dark:border-gray-700 flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ customBlockMetas.length }} custom block type{{ customBlockMetas.length !== 1 ? 's' : '' }} available</span>
          <NuxtLink to="/admin/block-types" @click="showAddBlock = false" class="text-xs text-purple-500 hover:underline">Manage →</NuxtLink>
        </div>
      </div>
    </div>

    <!-- History drawer -->
    <div v-if="showHistory" class="fixed inset-0 z-50 bg-black/50 flex justify-end" @click.self="showHistory = false">
      <div class="bg-white dark:bg-gray-800 w-96 h-full overflow-y-auto flex flex-col shadow-xl">
        <div class="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 shrink-0">
          <h2 class="text-base font-bold text-gray-900 dark:text-white">Page History</h2>
          <button @click="showHistory = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div v-if="historyLoading" class="flex items-center justify-center flex-1 text-gray-400">
          <svg class="w-5 h-5 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          Loading…
        </div>

        <div v-else-if="historyList.length === 0" class="flex items-center justify-center flex-1 text-gray-400 text-sm">
          No history yet.
        </div>

        <div v-else class="overflow-y-auto flex-1 divide-y dark:divide-gray-700">
          <button
            v-for="commit in historyList"
            :key="commit.hash"
            class="w-full text-left px-5 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition group"
            @click="previewVersion(commit)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm text-gray-800 dark:text-gray-200 leading-snug">{{ commit.message }}</p>
              <svg class="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0 mt-0.5 transition" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="font-mono text-xs text-gray-400">{{ commit.hash.slice(0, 7) }}</span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-500">{{ commit.author }}</span>
              <span class="text-xs text-gray-400">·</span>
              <span class="text-xs text-gray-400">{{ formatDate(commit.date) }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- History preview modal -->
    <div v-if="previewCommit" class="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center p-6 overflow-y-auto">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl my-auto">
        <!-- Modal header -->
        <div class="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <div>
            <p class="text-xs text-gray-400 font-mono">{{ previewCommit.hash.slice(0, 7) }}</p>
            <h2 class="text-base font-bold text-gray-900 dark:text-white mt-0.5">{{ previewCommit.message }}</h2>
            <p class="text-xs text-gray-500 mt-0.5">{{ previewCommit.author }} · {{ formatDate(previewCommit.date) }}</p>
          </div>
          <button @click="closePreview" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none ml-4">×</button>
        </div>

        <!-- Loading -->
        <div v-if="previewLoading" class="flex items-center justify-center py-20 text-gray-400">
          <svg class="w-5 h-5 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          Loading snapshot…
        </div>

        <!-- Snapshot content -->
        <div v-else-if="previewPage">
          <!-- Meta strip -->
          <div class="flex flex-wrap gap-2 px-6 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
            <span class="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-mono">{{ previewPage.slug }}</span>
            <span :class="[
              'px-2 py-0.5 rounded-full text-xs font-medium',
              previewPage.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
              previewPage.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' : 'bg-gray-200 text-gray-500'
            ]">{{ previewPage.status }}</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs">{{ previewPage.layout }}</span>
            <span class="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs">{{ previewPage.blocks?.length ?? 0 }} block{{ previewPage.blocks?.length !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Live block render — rendered at 1200px, scaled to ~720px wide -->
          <div class="bg-white dark:bg-gray-900 border-b dark:border-gray-700" style="height: 60vh; overflow: hidden; position: relative;">
            <div style="overflow-y: auto; height: calc(60vh / 0.6); transform: scale(0.6); transform-origin: top left; width: calc(100% / 0.6); pointer-events: none;">
              <div
                v-if="previewPage.blocks?.length"
              >
                <div
                  v-for="block in [...(previewPage.blocks ?? [])].filter(b => b.visible).sort((a,b) => a.order - b.order)"
                  :key="block.id"
                  :class="`block-${block.id}`"
                >
                  <component
                    :is="(staticBlockRegistry as Record<string, Component>)[block.type] ?? customRegistry[block.type]"
                    v-bind="block.props"
                  />
                </div>
              </div>
              <div v-else class="flex items-center justify-center py-32 text-gray-400 text-xl italic">No visible blocks in this version</div>
            </div>
          </div>

          <p v-if="restoreError" class="px-6 py-3 text-sm text-red-500 border-t dark:border-gray-700">{{ restoreError }}</p>
        </div>

        <!-- Modal footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t dark:border-gray-700">
          <button @click="closePreview" class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
            Cancel
          </button>
          <button
            @click="restoreVersion"
            :disabled="restoring || previewLoading || !previewPage"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <svg v-if="restoring" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clip-rule="evenodd"/></svg>
            {{ restoring ? 'Restoring…' : 'Restore this version' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="flex items-center justify-center h-64 text-gray-400">
    <svg class="w-6 h-6 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Loading…
  </div>

  <div v-else class="flex items-center justify-center h-64 text-gray-400">
    Page not found
  </div>
</template>
