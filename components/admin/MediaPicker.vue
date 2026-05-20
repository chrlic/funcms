<script setup lang="ts">
import type { MediaItem } from '~/types'

const emit = defineEmits<{
  select: [url: string]
  close: []
}>()

const search = ref('')
const page = ref(1)
const limit = 40

const { data, refresh } = await useFetch<{ data: MediaItem[]; total: number; totalPages: number }>(
  '/api/media',
  {
    query: computed(() => ({ page: page.value, limit })),
    credentials: 'include',
  }
)

const items = computed(() => data.value?.data ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(i => i.originalName.toLowerCase().includes(q) || (i.alt ?? '').toLowerCase().includes(q))
})

function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

function pick(item: MediaItem) {
  emit('select', item.url)
}

// Close on Escape
onMounted(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }
  window.addEventListener('keydown', handler)
  onUnmounted(() => window.removeEventListener('keydown', handler))
})
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

      <!-- Modal -->
      <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 shrink-0">
          <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">Media Library</h2>
          <div class="flex items-center gap-3">
            <input
              v-model="search"
              type="search"
              placeholder="Search…"
              class="border rounded-lg px-3 py-1.5 text-sm w-48 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button @click="emit('close')" class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition">
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
            </button>
          </div>
        </div>

        <!-- Grid -->
        <div class="flex-1 overflow-y-auto p-5">
          <div v-if="filtered.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg class="w-12 h-12 mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd"/></svg>
            <p class="text-sm">No media found</p>
          </div>
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            <button
              v-for="item in filtered"
              :key="item._id"
              class="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 dark:border-gray-700 dark:hover:border-indigo-400 bg-gray-100 dark:bg-gray-800 transition focus:outline-none focus:border-indigo-500"
              :title="item.originalName"
              @click="pick(item)"
            >
              <img
                v-if="isImage(item.mimeType)"
                :src="item.url"
                :alt="item.alt ?? item.originalName"
                class="w-full h-full object-cover"
                loading="lazy"
              />
              <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                <svg class="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z"/></svg>
                <span class="text-xs">{{ item.mimeType.split('/')[1] }}</span>
              </div>
              <!-- Hover label -->
              <div class="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition">
                {{ item.originalName }}
              </div>
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-3 border-t dark:border-gray-700 shrink-0 text-sm">
          <button :disabled="page <= 1" @click="page--; refresh()" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Previous</button>
          <span class="text-gray-500">Page {{ page }} of {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="page++; refresh()" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Next</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
