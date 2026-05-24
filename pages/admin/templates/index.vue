<script setup lang="ts">
import type { PageTemplate } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const headers = useRequestHeaders(['cookie'])

const { data, refresh } = await useFetch<{ data: PageTemplate[] }>('/api/templates', {
  headers,
  credentials: 'include',
})
const templates = computed(() => data.value?.data ?? [])

// ─── Create ───────────────────────────────────────────────────────────────────

const showCreate = ref(false)
const creating = ref(false)
const createName = ref('')
const createDescription = ref('')
const createError = ref('')

function openCreate() {
  createName.value = ''
  createDescription.value = ''
  createError.value = ''
  showCreate.value = true
}

async function createTemplate() {
  creating.value = true
  createError.value = ''
  try {
    await $fetch('/api/templates', {
      method: 'POST',
      body: { name: createName.value, description: createDescription.value },
    })
    showCreate.value = false
    await refresh()
  } catch (e: unknown) {
    createError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to create template'
  } finally {
    creating.value = false
  }
}

// ─── Edit ─────────────────────────────────────────────────────────────────────

const editTarget = ref<PageTemplate | null>(null)
const editName = ref('')
const editDescription = ref('')
const saving = ref(false)
const editError = ref('')

function openEdit(t: PageTemplate) {
  editTarget.value = t
  editName.value = t.name
  editDescription.value = t.description ?? ''
  editError.value = ''
}

function closeEdit() {
  editTarget.value = null
}

async function saveEdit() {
  if (!editTarget.value) return
  saving.value = true
  editError.value = ''
  try {
    await $fetch(`/api/templates/${editTarget.value._id}`, {
      method: 'PATCH',
      body: { name: editName.value, description: editDescription.value },
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

async function deleteTemplate(t: PageTemplate) {
  if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
  await $fetch(`/api/templates/${t._id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Page Templates</h1>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
        New Template
      </button>
    </div>

    <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
      Templates are pre-built page layouts. When creating a new page, editors can pick a template to start with a ready-made block structure. Templates are populated from the page editor via "Save as template."
    </p>

    <!-- Empty state -->
    <div v-if="templates.length === 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clip-rule="evenodd"/></svg>
      <p class="font-medium">No templates yet</p>
      <p class="text-sm mt-1">Create one above or save a page as a template from the page editor.</p>
    </div>

    <!-- Template grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="t in templates"
        :key="t._id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex flex-col gap-3"
      >
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clip-rule="evenodd"/></svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-gray-900 dark:text-white truncate">{{ t.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">{{ t.layout }} · {{ t.blocks.length }} block{{ t.blocks.length !== 1 ? 's' : '' }}</div>
          </div>
        </div>
        <p v-if="t.description" class="text-sm text-gray-500 dark:text-gray-400">{{ t.description }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="b in t.blocks.slice(0, 5)"
            :key="b.id"
            class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500 dark:text-gray-400 font-mono"
          >{{ b.type }}</span>
          <span v-if="t.blocks.length > 5" class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-400">+{{ t.blocks.length - 5 }} more</span>
        </div>
        <div class="flex items-center gap-3 pt-1 border-t dark:border-gray-700">
          <button
            @click="openEdit(t)"
            class="text-xs text-indigo-600 hover:underline font-medium"
          >Edit</button>
          <button
            @click="deleteTemplate(t)"
            class="text-xs text-gray-400 hover:text-red-500 transition"
          >Delete</button>
          <span class="ml-auto text-xs text-gray-400">
            {{ t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-4">New Template</h2>
        <form @submit.prevent="createTemplate" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              v-model="createName"
              required
              autofocus
              placeholder="e.g. Blog Post, Landing Page"
              class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              v-model="createDescription"
              rows="2"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>
          <p class="text-xs text-gray-400">The template starts empty. Open it from the page editor to add blocks.</p>
          <p v-if="createError" class="text-red-500 text-sm">{{ createError }}</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="showCreate = false" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              :disabled="creating"
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ creating ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="editTarget" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-4">Edit Template</h2>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              v-model="editName"
              required
              class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              v-model="editDescription"
              rows="2"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            />
          </div>
          <p v-if="editError" class="text-red-500 text-sm">{{ editError }}</p>
          <div class="flex gap-3 justify-end pt-2">
            <button type="button" @click="closeEdit" class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              type="submit"
              :disabled="saving"
              class="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
