<script setup lang="ts">
import draggable from 'vuedraggable'
import type { Page, Block, BlockType, LayoutType, SiteSettings, Locale, LocaleVariant } from '~/types'
import { pageCssHints } from '~/composables/useCssHints'
import staticBlockRegistry, { builtinBlockTypes } from '~/components/blocks/index'
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

// ─── Locale tabs ──────────────────────────────────────────────────────────────

const { data: settingsData } = await useFetch<{ data: SiteSettings }>('/api/settings')
const siteLocales = computed<Locale[]>(() => settingsData.value?.data?.locales ?? [])
const defaultLocale = computed(() => siteLocales.value.find(l => l.default) ?? siteLocales.value[0])

// '' = root/default variant; locale code = specific variant
// Initialise from ?locale= query param so links from the pages list open the right tab
const activeLocale = ref((route.query.locale as string) || '')

// Read-only computed view of the active locale's fields (or root fields when no locale is active).
const variant = computed<LocaleVariant>(() => {
  if (!page.value) return { title: '', meta: { title: '' }, blocks: [], status: 'draft' }
  if (activeLocale.value && page.value.locales?.[activeLocale.value]) {
    return page.value.locales[activeLocale.value]
  }
  return { title: page.value.title, meta: page.value.meta, blocks: page.value.blocks, status: page.value.status }
})

// Direct mutation — avoids writable computed setter which Vue batches unexpectedly.
function setVariantField<K extends keyof LocaleVariant>(key: K, value: LocaleVariant[K]) {
  if (!page.value) return
  isDirty.value = true
  if (activeLocale.value) {
    if (!page.value.locales) page.value.locales = {}
    page.value.locales[activeLocale.value] = {
      ...(page.value.locales[activeLocale.value] ?? { title: '', meta: { title: '' }, blocks: [], status: 'draft' }),
      [key]: value,
    } as LocaleVariant
  } else {
    (page.value as Record<string, unknown>)[key] = value
  }
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
    // Reload from the worktree to confirm the server persisted the changes
    await loadPage()
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


const showBlockTypePicker = ref(false)

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
  const existing = variant.value.blocks ?? []
  const maxOrder = existing.filter(b => b.slot === addBlockSlot.value).reduce((m, b) => Math.max(m, b.order), -1)
  const newBlock: Block = {
    id: crypto.randomUUID(),
    type,
    order: maxOrder + 1,
    slot: addBlockSlot.value,
    visible: true,
    props: {},
  }
  setVariantField('blocks', [...existing, newBlock])
  showAddBlock.value = false
}

function updateBlock(index: number, updated: Block) {
  if (!page.value) return
  const blocks = [...(variant.value.blocks ?? [])]
  blocks[index] = updated
  setVariantField('blocks', blocks)
}

function removeBlock(index: number) {
  if (!page.value) return
  if (!confirm('Remove this block?')) return
  const blocks = [...(variant.value.blocks ?? [])]
  blocks.splice(index, 1)
  setVariantField('blocks', blocks)
}

function moveBlock(index: number, direction: 'up' | 'down') {
  if (!page.value) return
  const blocks = [...(variant.value.blocks ?? [])]
  const block = blocks[index]
  const sameSlot = blocks.filter(b => b.slot === block.slot).sort((a, b) => a.order - b.order)
  const pos = sameSlot.indexOf(block)
  const targetPos = direction === 'up' ? pos - 1 : pos + 1
  if (targetPos < 0 || targetPos >= sameSlot.length) return
  const target = sameSlot[targetPos]
  const tempOrder = block.order
  block.order = target.order
  target.order = tempOrder
  setVariantField('blocks', [...blocks])
}

const sortedBlocks = computed(() => {
  return [...(variant.value.blocks ?? [])].sort((a, b) => {
    if (a.slot !== b.slot) return a.slot.localeCompare(b.slot)
    return a.order - b.order
  })
})

const draggableBlocks = computed({
  get: () => sortedBlocks.value,
  set: (reordered: Block[]) => {
    if (!page.value) return
    const updated = reordered.map((b, i) => ({ ...b, order: i }))
    const others = (variant.value.blocks ?? []).filter(b => !reordered.find(r => r.id === b.id))
    setVariantField('blocks', [...updated, ...others])
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

// ─── Clone to locale ──────────────────────────────────────────────────────────

const locales = siteLocales  // alias — siteLocales already fetched above

const showClone = ref(false)
const cloneLocale = ref('')
const cloneCopyContent = ref(true)
const cloning = ref(false)
const cloneError = ref('')

const availableCloneLocales = computed(() => {
  const existing = Object.keys(page.value?.locales ?? {})
  return locales.value.filter(l => !existing.includes(l.code))
})

function openClone() {
  showClone.value = true
  cloneError.value = ''
  cloneLocale.value = availableCloneLocales.value.find(l => !l.default)?.code ?? availableCloneLocales.value[0]?.code ?? ''
  cloneCopyContent.value = true
}

async function doClone() {
  if (!cloneLocale.value) return
  cloning.value = true
  cloneError.value = ''
  try {
    const result = await $fetch<{ data: Page }>(`/api/pages/${id}/clone`, {
      method: 'POST',
      body: { targetLocale: cloneLocale.value, copyContent: cloneCopyContent.value },
    })
    page.value = { ...result.data, blocks: result.data.blocks ?? [] }
    activeLocale.value = cloneLocale.value
    showClone.value = false
  } catch (e: unknown) {
    cloneError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Clone failed'
  } finally {
    cloning.value = false
  }
}

async function removeVariant(code: string) {
  if (!confirm(`Remove the "${siteLocales.value.find(l => l.code === code)?.label ?? code}" variant? This cannot be undone.`)) return
  try {
    const result = await sfetch<{ data: Page }>(`/api/pages/${id}/clone`, {
      method: 'DELETE',
      body: { targetLocale: code },
    })
    page.value = { ...result.data, blocks: result.data.blocks ?? [] }
    if (activeLocale.value === code) activeLocale.value = ''
  } catch (e: unknown) {
    cloneError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Remove failed'
  }
}

function clonePreviewSlug() {
  if (!page.value || !cloneLocale.value) return ''
  const stripped = page.value.slug.replace(/^\/[a-z]{2}(?:-[a-zA-Z]{2,4})?\//i, '/')
  return `/${cloneLocale.value}${stripped}`
}

// ─── Save as template ─────────────────────────────────────────────────────────

const showSaveTemplate = ref(false)
const templateName = ref('')
const templateDescription = ref('')
const savingTemplate = ref(false)
const saveTemplateError = ref('')
const saveTemplateSuccess = ref(false)

function openSaveTemplate() {
  templateName.value = page.value?.title ?? ''
  templateDescription.value = ''
  saveTemplateError.value = ''
  saveTemplateSuccess.value = false
  showSaveTemplate.value = true
}

// ─── Responsive preview ───────────────────────────────────────────────────────

const showPreview = ref(false)
type Viewport = 'mobile' | 'tablet' | 'desktop'
const previewViewport = ref<Viewport>('desktop')

const viewportWidths: Record<Viewport, string> = {
  mobile:  '390px',
  tablet:  '768px',
  desktop: '100%',
}

const previewUrl = computed(() => {
  if (!page.value) return ''
  const sid = session.sessionId ? `&sid=${session.sessionId}` : ''
  // For locale variants, prepend the locale code to the slug path
  const slug = activeLocale.value
    ? `/${activeLocale.value}${page.value.slug.replace(/^\/[a-z]{2}(?:-[a-zA-Z]{2,4})?\//i, '/')}`
    : page.value.slug
  return `${slug}?preview=1${sid}`
})

// ─── Save as template ─────────────────────────────────────────────────────────

async function saveAsTemplate() {
  if (!page.value) return
  savingTemplate.value = true
  saveTemplateError.value = ''
  try {
    await $fetch('/api/templates', {
      method: 'POST',
      body: {
        name: templateName.value,
        description: templateDescription.value,
        layout: page.value.layout,
        blocks: variant.value.blocks.map(b => ({ ...b, id: crypto.randomUUID() })),
      },
    })
    saveTemplateSuccess.value = true
    setTimeout(() => { showSaveTemplate.value = false; saveTemplateSuccess.value = false }, 1500)
  } catch (e: unknown) {
    saveTemplateError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to save template'
  } finally {
    savingTemplate.value = false
  }
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
        <!-- Preview toggle -->
        <button
          @click="showPreview = !showPreview"
          :class="['text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg border transition', showPreview ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:text-indigo-600 hover:border-indigo-300']"
        >
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/></svg>
          Preview
        </button>
        <button @click="loadHistory" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd"/></svg>
          History
        </button>
        <button v-if="locales.length > 0" @click="openClone" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1" title="Clone to locale">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>
          Clone to locale
        </button>
        <button @click="openSaveTemplate" class="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-1" title="Save as template">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clip-rule="evenodd"/></svg>
          Save as template
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

    <!-- Locale tabs -->
    <div v-if="siteLocales.length > 0" class="flex items-center gap-1 mb-5 border-b dark:border-gray-700">
      <!-- Default / root tab -->
      <button
        @click="activeLocale = ''"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition',
          activeLocale === ''
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
        ]"
      >
        {{ defaultLocale?.label ?? 'Default' }}
        <span :class="['ml-1.5 text-xs px-1.5 py-0.5 rounded-full', page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700']">
          {{ page.status }}
        </span>
      </button>
      <!-- Variant tabs -->
      <button
        v-for="(v, code) in (page.locales ?? {})"
        :key="code"
        @click="activeLocale = code"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition',
          activeLocale === code
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
        ]"
      >
        {{ siteLocales.find(l => l.code === code)?.label ?? code }}
        <span :class="['ml-1.5 text-xs px-1.5 py-0.5 rounded-full', v.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700']">
          {{ v.status }}
        </span>
      </button>
    </div>

    <!-- Responsive preview panel -->
    <div v-if="showPreview" class="mb-6">
      <!-- Viewport picker bar -->
      <div class="flex items-center gap-2 mb-3">
        <div class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          <button
            v-for="vp in (['mobile', 'tablet', 'desktop'] as Viewport[])"
            :key="vp"
            @click="previewViewport = vp"
            :class="['px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5', previewViewport === vp ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300']"
          >
            <!-- Mobile icon -->
            <svg v-if="vp === 'mobile'" class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/><path fill-rule="evenodd" d="M4 4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4Zm3-1.5h6A1.5 1.5 0 0 1 14.5 4v12A1.5 1.5 0 0 1 13 17.5H7A1.5 1.5 0 0 1 5.5 16V4A1.5 1.5 0 0 1 7 2.5Z" clip-rule="evenodd"/></svg>
            <!-- Tablet icon -->
            <svg v-else-if="vp === 'tablet'" class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.5 14.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/><path fill-rule="evenodd" d="M2 5.5A2.5 2.5 0 0 1 4.5 3h11A2.5 2.5 0 0 1 18 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 14.5v-9Zm2.5-1h11A1 1 0 0 1 16.5 5.5v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" clip-rule="evenodd"/></svg>
            <!-- Desktop icon -->
            <svg v-else class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.25A2.25 2.25 0 0 1 4.25 2h11.5A2.25 2.25 0 0 1 18 4.25v8.5A2.25 2.25 0 0 1 15.75 15h-3.105a3.501 3.501 0 0 0 1.1 1.677A.75.75 0 0 1 13.26 18H6.74a.75.75 0 0 1-.484-1.323A3.501 3.501 0 0 0 7.355 15H4.25A2.25 2.25 0 0 1 2 12.75v-8.5Zm1.5 0a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75v-7.5Z" clip-rule="evenodd"/></svg>
            <span class="capitalize">{{ vp }}</span>
            <span v-if="vp !== 'desktop'" class="text-gray-400 font-normal">{{ viewportWidths[vp] }}</span>
          </button>
        </div>
        <a
          :href="previewUrl"
          target="_blank"
          class="ml-auto text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
          Open in new tab
        </a>
      </div>
      <!-- Iframe container -->
      <div class="bg-gray-200 dark:bg-gray-900 rounded-xl overflow-hidden flex justify-center" style="min-height: 600px">
        <div
          class="bg-white transition-all duration-300 shadow-xl overflow-hidden w-full"
          :style="previewViewport !== 'desktop' ? `max-width: ${viewportWidths[previewViewport]}; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb` : ''"
        >
          <iframe
            :src="previewUrl"
            class="w-full"
            style="height: 80vh; border: none; display: block"
            :key="previewUrl"
          />
        </div>
      </div>
    </div>

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
              :locale="activeLocale || undefined"
              @update="(b) => updateBlock(variant.blocks.indexOf(block), b)"
              @remove="removeBlock(variant.blocks.indexOf(block))"
              @move-up="moveBlock(variant.blocks.indexOf(block), 'up')"
              @move-down="moveBlock(variant.blocks.indexOf(block), 'down')"
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
            <input
              :value="variant.title"
              @input="setVariantField('title', ($event.target as HTMLInputElement).value)"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Slug <span class="text-gray-400 font-normal">(shared)</span></label>
            <input v-model="page.slug" @input="isDirty = true" class="w-full border rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              :value="variant.status"
              @change="setVariantField('status', ($event.target as HTMLSelectElement).value as 'draft'|'published'|'archived')"
              :class="[
                'w-full border rounded-lg px-3 py-2 text-sm font-medium dark:border-gray-600',
                variant.status === 'published' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300' :
                variant.status === 'draft'     ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                                 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              ]"
            >
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
            <input
              :value="variant.meta.title"
              @input="setVariantField('meta', { ...variant.meta, title: ($event.target as HTMLInputElement).value })"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Meta Description</label>
            <textarea
              :value="variant.meta.description"
              @input="setVariantField('meta', { ...variant.meta, description: ($event.target as HTMLTextAreaElement).value })"
              rows="3"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="variant.meta.noIndex"
              @change="setVariantField('meta', { ...variant.meta, noIndex: ($event.target as HTMLInputElement).checked })"
              class="rounded"
            />
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
            <CssHintPanel :groups="pageCssHints" @insert="(s) => {
              const current = (page.style?.customCss ?? '').trimEnd()
              const next = current ? current + '\n\n' + s : s
              page.style = { ...page.style, customCss: next }
              isDirty.value = true
            }" />
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

    <!-- Add block: slot selector then type picker -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddBlock && !showBlockTypePicker" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="showAddBlock = false">
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-80 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-base font-bold text-gray-900 dark:text-white">Add Block</h2>
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
            <button @click="showBlockTypePicker = true" class="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              Choose block type →
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <BlockTypePicker
      :open="showAddBlock && showBlockTypePicker"
      @pick="addBlock($event); showAddBlock = false; showBlockTypePicker = false"
      @close="showBlockTypePicker = false"
    />

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

    <!-- Clone to locale modal -->
    <div v-if="showClone" class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-1">Clone to locale</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Creates a copy of this page as a draft with a locale-prefixed slug.
        </p>
        <div class="space-y-4">
          <!-- Existing locale variants -->
          <div v-if="page?.locales && Object.keys(page.locales).length > 0" class="flex flex-wrap gap-1.5 items-center">
            <span class="text-xs text-gray-500 dark:text-gray-400">Existing variants:</span>
            <span
              v-for="(_, code) in page.locales"
              :key="code"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            >
              {{ siteLocales.find(l => l.code === code)?.label ?? code }}
              <button @click="removeVariant(code)" class="ml-0.5 hover:text-red-500 transition" title="Remove this variant">×</button>
            </span>
          </div>

          <div v-if="availableCloneLocales.length === 0" class="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-3 text-center">
            This page has already been cloned to all configured locales.
          </div>
          <template v-else>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target locale</label>
              <select
                v-model="cloneLocale"
                class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option v-for="l in availableCloneLocales" :key="l.code" :value="l.code">{{ l.label }} ({{ l.code }})</option>
              </select>
            </div>
            <div v-if="cloneLocale" class="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
              {{ page?.slug }} → {{ clonePreviewSlug() }}
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="cloneCopyContent" class="rounded" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Copy blocks and content</span>
            </label>
          </template>
          <p v-if="cloneError" class="text-red-500 text-sm">{{ cloneError }}</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showClone = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Cancel</button>
            <button
              v-if="availableCloneLocales.length > 0"
              @click="doClone"
              :disabled="cloning || !cloneLocale"
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ cloning ? 'Cloning…' : 'Clone page' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save as template modal -->
    <div v-if="showSaveTemplate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-1">Save as template</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Saves the current layout ({{ page?.layout }}) and {{ variant.blocks.length }} block{{ variant.blocks.length !== 1 ? 's' : '' }} as a reusable template.
        </p>
        <form @submit.prevent="saveAsTemplate" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template name</label>
            <input
              v-model="templateName"
              required
              autofocus
              class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              v-model="templateDescription"
              rows="2"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>
          <p v-if="saveTemplateError" class="text-red-500 text-sm">{{ saveTemplateError }}</p>
          <p v-if="saveTemplateSuccess" class="text-green-600 text-sm font-medium">Template saved!</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showSaveTemplate = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              :disabled="savingTemplate || saveTemplateSuccess"
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ savingTemplate ? 'Saving…' : saveTemplateSuccess ? 'Saved!' : 'Save template' }}
            </button>
          </div>
        </form>
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
