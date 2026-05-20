<script setup lang="ts">
import type { Page } from '~/types'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const search = ref('')
const statusFilter = ref('all')
const page = ref(1)
const limit = 20

// Forward cookie on SSR so the server-side fetch is authenticated
const headers = useRequestHeaders(['cookie'])

const { data, refresh } = await useFetch<{
  data: Page[]
  total: number
  totalPages: number
}>('/api/pages', {
  headers,
  credentials: 'include',
  query: computed(() => ({
    status: statusFilter.value,
    search: search.value || undefined,
    page: page.value,
    limit,
  })),
  watch: [search, statusFilter, page],
})

const pages = computed(() => data.value?.data ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => data.value?.totalPages ?? 1)

const creating = ref(false)
const newTitle = ref('')
const newSlug = ref('')
const showCreate = ref(false)
const createError = ref('')

watch(newTitle, (v) => {
  if (!v) { newSlug.value = ''; return }
  newSlug.value = '/' + v.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
})

async function createPage() {
  creating.value = true
  createError.value = ''
  try {
    const result = await $fetch<{ data: Page }>('/api/pages', {
      method: 'POST',
      body: { title: newTitle.value, slug: newSlug.value, status: 'draft' },
    })
    showCreate.value = false
    newTitle.value = ''
    newSlug.value = ''
    await navigateTo(`/admin/pages/${result.data._id}`)
  } catch (e: unknown) {
    createError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Failed to create page'
  } finally {
    creating.value = false
  }
}

async function deletePage(id: string, title: string) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
  await $fetch(`/api/pages/${id}`, { method: 'DELETE' })
  await refresh()
}

const statusColors: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-500',
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Pages</h1>
      <button
        @click="showCreate = true"
        class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
        New Page
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-5">
      <input
        v-model="search"
        type="search"
        placeholder="Search pages…"
        class="border rounded-lg px-3 py-2 text-sm w-56 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        @input="page = 1"
      />
      <select
        v-model="statusFilter"
        class="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        @change="page = 1"
      >
        <option value="all">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
      <span class="text-sm text-gray-500 self-center">{{ total }} page{{ total !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-left">
          <tr>
            <th class="px-4 py-3">Title</th>
            <th class="px-4 py-3">Slug</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Updated</th>
            <th class="px-4 py-3 w-24">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pages" :key="p._id" class="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ p.title }}</td>
            <td class="px-4 py-3 text-gray-500 font-mono text-xs">{{ p.slug }}</td>
            <td class="px-4 py-3">
              <span :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusColors[p.status] ?? 'bg-gray-100 text-gray-500']">
                {{ p.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-400 text-xs">
              {{ p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—' }}
            </td>
            <td class="px-4 py-3 flex items-center gap-3">
              <NuxtLink :to="`/admin/pages/${p._id}`" class="text-indigo-600 hover:underline text-xs font-medium">Edit</NuxtLink>
              <a :href="p.slug" target="_blank" class="text-gray-400 hover:text-gray-600 text-xs">View</a>
              <button @click="deletePage(p._id!, p.title)" class="text-gray-300 hover:text-red-500 transition">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
              </button>
            </td>
          </tr>
          <tr v-if="pages.length === 0">
            <td colspan="5" class="px-4 py-12 text-center text-gray-400">No pages found</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 text-sm">
      <button :disabled="page <= 1" @click="page--" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">Previous</button>
      <span class="text-gray-500">Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">Next</button>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-bold mb-4">New Page</h2>
        <form @submit.prevent="createPage" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              v-model="newTitle"
              required
              autofocus
              class="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug</label>
            <input
              v-model="newSlug"
              required
              class="w-full border rounded-lg px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
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
  </div>
</template>
