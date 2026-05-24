<script setup lang="ts">
import type { GlobalComponent, Block, BlockType } from '~/types'
import { builtinBlockTypes, blockSchemas } from '~/components/blocks/index'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const headers = useRequestHeaders(['cookie'])

const { data, refresh } = await useFetch<{ data: GlobalComponent[] }>('/api/global-components', {
  headers,
  credentials: 'include',
})
const items = computed(() => data.value?.data ?? [])

const { metas: customBlockMetas } = useCustomBlocks()

const allBlockTypes = computed(() => [
  ...builtinBlockTypes.filter(bt => bt.type !== 'global'),
  ...customBlockMetas.value.map(m => ({ type: m.slug as BlockType, label: m.label })),
])

// ─── Create ───────────────────────────────────────────────────────────────────

const showCreate = ref(false)
const creating = ref(false)
const createName = ref('')
const createDescription = ref('')
const createBlockType = ref<BlockType>('rich-text')
const createError = ref('')

function openCreate() {
  createName.value = ''
  createDescription.value = ''
  createBlockType.value = 'rich-text'
  createError.value = ''
  showCreate.value = true
}

async function createItem() {
  creating.value = true
  createError.value = ''
  try {
    const block: Block = {
      id: crypto.randomUUID(),
      type: createBlockType.value,
      order: 0,
      slot: 'main',
      visible: true,
      props: {},
    }
    await $fetch('/api/global-components', {
      method: 'POST',
      body: { name: createName.value, description: createDescription.value, block },
    })
    showCreate.value = false
    await refresh()
  } catch (e: unknown) {
    createError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to create'
  } finally {
    creating.value = false
  }
}

// ─── Edit / inline block editor ───────────────────────────────────────────────

const editTarget = ref<GlobalComponent | null>(null)
const editName = ref('')
const editDescription = ref('')
const editBlock = ref<Block | null>(null)
const saving = ref(false)
const editError = ref('')

function openEdit(gc: GlobalComponent) {
  editTarget.value = gc
  editName.value = gc.name
  editDescription.value = gc.description ?? ''
  editBlock.value = { ...gc.block, props: { ...gc.block.props } }
  editError.value = ''
}

function closeEdit() {
  editTarget.value = null
  editBlock.value = null
}

function updateEditBlock(b: Block) {
  editBlock.value = b
}

async function saveEdit() {
  if (!editTarget.value || !editBlock.value) return
  saving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/global-components/${editTarget.value._id}`, {
      method: 'PATCH',
      body: { name: editName.value, description: editDescription.value, block: editBlock.value },
    })
    closeEdit()
    await refresh()
  } catch (e: unknown) {
    editError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to save'
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function deleteItem(gc: GlobalComponent) {
  if (!confirm(`Delete "${gc.name}"? Pages using this component will show an error.`)) return
  await $fetch(`/api/global-components/${gc._id}`, { method: 'DELETE' })
  await refresh()
}

function blockTypeLabel(type: string) {
  return allBlockTypes.value.find(b => b.type === type)?.label ?? type
}

function schemaFieldCount(type: string) {
  return Object.keys(blockSchemas[type] ?? {}).length
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">Global Components</h1>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
        New Global Component
      </button>
    </div>

    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Global components are shared blocks — edit once and the change propagates to every page that uses them. Add them to any page via the "Global Component" block type.
    </p>

    <!-- Empty state -->
    <div v-if="items.length === 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M12 4.467c0-.405.262-.75.559-1.027.504-.46.857-1.08.857-1.773a.75.75 0 0 0-.75-.75 3.504 3.504 0 0 0-3.5 3.5c0 .097.004.193.012.288A4.498 4.498 0 0 0 5.5 9.25H4.25a.75.75 0 0 0 0 1.5H5.5v.5H4.25a.75.75 0 0 0 0 1.5H5.5a4.5 4.5 0 0 0 4.5 4.5v1.25a.75.75 0 0 0 1.5 0V17.25a4.5 4.5 0 0 0 4.5-4.5h1.25a.75.75 0 0 0 0-1.5H16v-.5h1.25a.75.75 0 0 0 0-1.5H16a4.498 4.498 0 0 0-3.678-4.427c.008-.095.012-.19.012-.288A.75.75 0 0 0 12 4.467Z"/></svg>
      <p class="font-medium">No global components yet</p>
      <p class="text-sm mt-1">Create a shared block that can be placed on any page.</p>
    </div>

    <!-- List -->
    <div v-else class="space-y-3">
      <div
        v-for="gc in items"
        :key="gc._id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm px-5 py-4 flex items-center gap-4"
      >
        <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M12 4.467c0-.405.262-.75.559-1.027.504-.46.857-1.08.857-1.773a.75.75 0 0 0-.75-.75 3.504 3.504 0 0 0-3.5 3.5c0 .097.004.193.012.288A4.498 4.498 0 0 0 5.5 9.25H4.25a.75.75 0 0 0 0 1.5H5.5v.5H4.25a.75.75 0 0 0 0 1.5H5.5a4.5 4.5 0 0 0 4.5 4.5v1.25a.75.75 0 0 0 1.5 0V17.25a4.5 4.5 0 0 0 4.5-4.5h1.25a.75.75 0 0 0 0-1.5H16v-.5h1.25a.75.75 0 0 0 0-1.5H16a4.498 4.498 0 0 0-3.678-4.427c.008-.095.012-.19.012-.288A.75.75 0 0 0 12 4.467Z"/></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-gray-900 dark:text-white truncate">{{ gc.name }}</div>
          <div class="text-xs text-gray-400 mt-0.5">
            <span class="font-mono">{{ gc.block.type }}</span>
            <span class="mx-1">·</span>
            {{ blockTypeLabel(gc.block.type) }}
            <span v-if="gc.description" class="mx-1">·</span>
            <span v-if="gc.description">{{ gc.description }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <button @click="openEdit(gc)" class="text-xs text-indigo-600 hover:underline font-medium">Edit</button>
          <button @click="deleteItem(gc)" class="text-xs text-gray-400 hover:text-red-500 transition">Delete</button>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-4">New Global Component</h2>
        <form @submit.prevent="createItem" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              v-model="createName"
              required
              autofocus
              placeholder="e.g. CTA Banner, Cookie Notice"
              class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
            <input
              v-model="createDescription"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Block type</label>
            <select
              v-model="createBlockType"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option v-for="bt in allBlockTypes" :key="bt.type" :value="bt.type">{{ bt.label }}</option>
            </select>
          </div>
          <p class="text-xs text-gray-400">You'll configure the block content after creating it.</p>
          <p v-if="createError" class="text-red-500 text-sm">{{ createError }}</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showCreate = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" :disabled="creating" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {{ creating ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit drawer -->
    <div v-if="editTarget && editBlock" class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div class="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-bold">Edit: {{ editTarget.name }}</h2>
          <button @click="closeEdit" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
          </button>
        </div>
        <div class="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input v-model="editName" required class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <input v-model="editDescription" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Block content</label>
            <BlockEditor
              :block="editBlock"
              @update="updateEditBlock"
              @remove="closeEdit"
              @move-up="() => {}"
              @move-down="() => {}"
            />
          </div>
        </div>
        <div class="px-6 py-4 border-t dark:border-gray-700 shrink-0 flex items-center gap-3 justify-end">
          <p v-if="editError" class="text-red-500 text-sm flex-1">{{ editError }}</p>
          <button @click="closeEdit" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button @click="saveEdit" :disabled="saving" class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
