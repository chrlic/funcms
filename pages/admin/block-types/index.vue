<script setup lang="ts">
import type { CustomBlockType, CustomBlockField } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

// ─── Load list ────────────────────────────────────────────────────────────────

const { data: listData, refresh } = await useFetch<{ data: CustomBlockType[] }>('/api/block-types', {
  key: 'custom-block-types-admin',
  default: () => ({ data: [] }),
})
const blockTypes = computed(() => listData.value?.data ?? [])

// Shared registry — so the page renderer picks up new blocks without full reload
const { invalidate: invalidateRegistry } = useCustomBlocks()

// ─── Editor state ─────────────────────────────────────────────────────────────

const editing = ref<CustomBlockType | null>(null)
const isNew = ref(false)
const saving = ref(false)
const saveError = ref('')
const deleteConfirm = ref<string | null>(null)

const defaultSource = `<template>
  <div class="px-6 py-8 mx-auto max-w-4xl">
    <h2 v-if="title" class="text-2xl font-bold mb-4">{{ title }}</h2>
    <div v-if="content" class="prose dark:prose-invert max-w-none" v-html="content" />
  </div>
</template>

<script>
const props = defineProps({
  title: { type: String, default: '' },
  content: { type: String, default: '' },
})
<\/script>`

const defaultFields: CustomBlockField[] = [
  { name: 'title', type: 'text', label: 'Title' },
  { name: 'content', type: 'richtext', label: 'Content' },
]

function openNew() {
  editing.value = {
    slug: '',
    label: '',
    description: '',
    source: defaultSource,
    compiledJs: '',
    fields: JSON.parse(JSON.stringify(defaultFields)),
  }
  isNew.value = true
  saveError.value = ''
}

function openEdit(bt: CustomBlockType) {
  editing.value = JSON.parse(JSON.stringify(bt))
  isNew.value = false
  saveError.value = ''
}

function closeEditor() {
  editing.value = null
  saveError.value = ''
}

// ─── Field schema editor ──────────────────────────────────────────────────────

function addField() {
  if (!editing.value) return
  editing.value.fields.push({ name: '', type: 'text', label: '' })
}

function removeField(i: number) {
  editing.value?.fields.splice(i, 1)
}

const fieldTypes: CustomBlockField['type'][] = [
  'text', 'textarea', 'richtext', 'number', 'boolean', 'select', 'image', 'color', 'url',
]

// ─── Save ─────────────────────────────────────────────────────────────────────

async function save() {
  if (!editing.value) return
  saving.value = true
  saveError.value = ''
  try {
    if (isNew.value) {
      await $fetch('/api/block-types', {
        method: 'POST',
        body: editing.value,
      })
    } else {
      await $fetch(`/api/block-types/${editing.value._id}`, {
        method: 'PUT',
        body: editing.value,
      })
    }
    await refresh()
    await invalidateRegistry(editing.value?.slug)
    closeEditor()
  } catch (e: unknown) {
    saveError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

async function deleteBlock(id: string) {
  try {
    const target = blockTypes.value.find(b => b._id === id)
    await $fetch(`/api/block-types/${id}`, { method: 'DELETE' })
    await refresh()
    await invalidateRegistry(target?.slug)
    deleteConfirm.value = null
  } catch (e: unknown) {
    alert((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Delete failed')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">Custom Block Types</h1>
        <p class="text-sm text-gray-500 mt-1">Write Vue SFC components and make them available as blocks in the page editor.</p>
      </div>
      <button
        @click="openNew"
        class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
        New Block Type
      </button>
    </div>

    <!-- Block type list -->
    <div v-if="blockTypes.length === 0" class="text-center py-16 text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"/></svg>
      <p class="font-medium">No custom block types yet</p>
      <p class="text-sm mt-1">Create one to extend the block picker with your own Vue components.</p>
    </div>

    <div class="space-y-3">
      <div
        v-for="bt in blockTypes"
        :key="bt._id"
        class="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4 flex items-center gap-4"
      >
        <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.25 3A2.25 2.25 0 0 0 1 5.25v9.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H3.25Zm.943 8.752a.75.75 0 0 1 .05-1.06L6.867 9l-2.624-1.692a.75.75 0 1 1 .814-1.26l3.38 2.184a.75.75 0 0 1 0 1.27l-3.38 2.184a.75.75 0 0 1-1.06-.05ZM9.25 12a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" clip-rule="evenodd" /></svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ bt.label }}</span>
            <code class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">{{ bt.slug }}</code>
          </div>
          <p v-if="bt.description" class="text-sm text-gray-500 mt-0.5 truncate">{{ bt.description }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ bt.fields.length }} field{{ bt.fields.length !== 1 ? 's' : '' }} · updated {{ bt.updatedAt ? new Date(bt.updatedAt).toLocaleDateString() : '—' }}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button @click="openEdit(bt)" class="px-3 py-1.5 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">Edit</button>
          <button
            @click="deleteConfirm = bt._id ?? null"
            class="px-3 py-1.5 text-sm border border-red-200 dark:border-red-800 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >Delete</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div v-if="deleteConfirm" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h3 class="font-bold text-lg mb-2">Delete block type?</h3>
        <p class="text-sm text-gray-500 mb-4">Any pages using this block type will show nothing in its place. This cannot be undone.</p>
        <div class="flex gap-3 justify-end">
          <button @click="deleteConfirm = null" class="px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button @click="deleteBlock(deleteConfirm)" class="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">Delete</button>
        </div>
      </div>
    </div>

    <!-- Editor modal -->
    <div v-if="editing" class="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        <!-- Modal header -->
        <div class="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 class="text-lg font-bold">{{ isNew ? 'New Block Type' : `Edit: ${editing.label}` }}</h2>
          <button @click="closeEditor" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div class="p-6 space-y-6">
          <!-- Identity -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Slug <span class="text-red-500">*</span></label>
              <input
                v-model="editing.slug"
                :disabled="!isNew"
                type="text"
                placeholder="my-block-type"
                class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p class="text-xs text-gray-400 mt-1">Lowercase, hyphens only. Cannot be changed after creation.</p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Label <span class="text-red-500">*</span></label>
              <input
                v-model="editing.label"
                type="text"
                placeholder="My Block Type"
                class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <input
              v-model="editing.description"
              type="text"
              placeholder="What this block is for…"
              class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800"
            />
          </div>

          <!-- SFC source editor -->
          <div>
            <label class="block text-sm font-medium mb-1">Vue SFC Source <span class="text-red-500">*</span></label>
            <div class="text-xs text-gray-400 mb-2 space-y-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border dark:border-gray-700">
              <p class="font-medium text-gray-500 dark:text-gray-300">Constraints:</p>
              <ul class="list-disc list-inside space-y-0.5">
                <li>Use Tailwind classes or inline styles — <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;style scoped&gt;</code> is not supported</li>
                <li>Plain JavaScript only in <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;script&gt;</code> — TypeScript is not compiled</li>
                <li>No <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">import</code> statements — Vue reactivity APIs are auto-injected (<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">ref</code>, <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">computed</code>, <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">watch</code>, etc.)</li>
                <li>Props defined with <code class="bg-gray-100 dark:bg-gray-700 px-1 rounded">defineProps()</code> are auto-linked to the field schema below</li>
              </ul>
            </div>
            <textarea
              v-model="editing.source"
              rows="20"
              spellcheck="false"
              class="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono dark:bg-gray-800 resize-y"
            />
          </div>

          <!-- Field schema -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">Admin Form Fields</label>
              <button
                @click="addField"
                class="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
                Add field
              </button>
            </div>
            <p class="text-xs text-gray-400 mb-3">Each field maps to a prop in your component. The name must match the prop name exactly.</p>

            <div class="space-y-2">
              <div
                v-for="(field, i) in editing.fields"
                :key="i"
                class="grid grid-cols-12 gap-2 items-center"
              >
                <input
                  v-model="field.name"
                  type="text"
                  placeholder="propName"
                  class="col-span-3 border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm font-mono dark:bg-gray-800"
                />
                <input
                  v-model="field.label"
                  type="text"
                  placeholder="Label"
                  class="col-span-4 border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800"
                />
                <select
                  v-model="field.type"
                  class="col-span-4 border dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm dark:bg-gray-800"
                >
                  <option v-for="ft in fieldTypes" :key="ft" :value="ft">{{ ft }}</option>
                </select>
                <button
                  @click="removeField(i)"
                  class="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" /></svg>
                </button>
              </div>
            </div>
            <p v-if="editing.fields.length === 0" class="text-sm text-gray-400 italic py-2">No fields — add at least one so editors can configure the block.</p>
          </div>

          <!-- Error -->
          <p v-if="saveError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{{ saveError }}</p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t dark:border-gray-700">
          <button @click="closeEditor" class="px-4 py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button
            @click="save"
            :disabled="saving"
            class="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {{ saving ? 'Compiling…' : isNew ? 'Create & Compile' : 'Save & Recompile' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
