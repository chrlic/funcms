<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Page, Block, BlockType, LayoutType } from '~/types'

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

const blockTypes: BlockType[] = [
  'hero', 'rich-text', 'grid', 'image', 'gallery',
  'video', 'cta', 'card-row', 'divider', 'raw-html',
]

const layoutOptions: { value: LayoutType; label: string }[] = [
  { value: 'full-width', label: 'Full Width' },
  { value: 'sidebar-left', label: 'Sidebar Left' },
  { value: 'sidebar-right', label: 'Sidebar Right' },
  { value: 'landing', label: 'Landing' },
  { value: 'blank', label: 'Blank' },
]

const showAddBlock = ref(false)
const addBlockSlot = ref('main')

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

const showHistory = ref(false)
const historyData = ref<{ data: unknown[] } | null>(null)

async function loadHistory() {
  showHistory.value = true
  historyData.value = await $fetch<{ data: unknown[] }>(`/api/pages/${id}/history`)
}
</script>

<template>
  <div v-if="page">
    <!-- Topbar -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/pages" class="text-gray-400 hover:text-gray-600">
          <Icon name="i-heroicons-arrow-left" class="w-5 h-5" />
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
          <Icon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4" />
          Preview
        </a>
        <button @click="loadHistory" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
          <Icon name="i-heroicons-clock" class="w-4 h-4" />
          History
        </button>
        <button
          @click="save"
          :disabled="saving"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <Icon v-if="saving" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else-if="saved" name="i-heroicons-check" class="w-4 h-4" />
          <Icon v-else name="i-heroicons-cloud-arrow-up" class="w-4 h-4" />
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
            <Icon name="i-heroicons-plus" class="w-4 h-4" />
            Add block
          </button>
        </div>

        <div v-if="sortedBlocks.length === 0" class="rounded-xl border-2 border-dashed dark:border-gray-600 p-12 text-center text-gray-400">
          <Icon name="i-heroicons-squares-plus" class="w-10 h-10 mx-auto mb-2 opacity-40" />
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
            v-for="type in blockTypes"
            :key="type"
            @click="addBlock(type)"
            class="flex items-center gap-2 px-3 py-2.5 border dark:border-gray-600 rounded-lg text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition"
          >
            <Icon name="i-heroicons-puzzle-piece" class="w-4 h-4 text-indigo-500 shrink-0" />
            <span class="capitalize">{{ type.replace('-', ' ') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- History drawer -->
    <div v-if="showHistory" class="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div class="bg-white dark:bg-gray-800 w-96 h-full overflow-y-auto p-6 shadow-xl">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-bold">Page History</h2>
          <button @click="showHistory = false" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div v-if="historyData?.data?.length" class="space-y-3">
          <div v-for="(commit, i) in historyData.data" :key="i" class="border dark:border-gray-600 rounded-lg p-3 text-sm">
            <p class="font-mono text-xs text-gray-400">{{ (commit as { hash: string }).hash?.slice(0, 7) }}</p>
            <p class="text-gray-700 dark:text-gray-300 mt-1">{{ (commit as { message: string }).message }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ (commit as { author: string }).author }} · {{ (commit as { date: string }).date }}</p>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">No history yet.</p>
      </div>
    </div>
  </div>

  <div v-else-if="loading" class="flex items-center justify-center h-64 text-gray-400">
    <Icon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mr-2" /> Loading…
  </div>

  <div v-else class="flex items-center justify-center h-64 text-gray-400">
    Page not found
  </div>
</template>
