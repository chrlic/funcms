<script setup lang="ts">
import type { MediaItem } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type MediaRecord = StoreRecord & MediaItem

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const page = ref(1)
const { data, refresh } = await useFetch<{
  data: MediaRecord[]
  total: number
  totalPages: number
}>('/api/media', {
  query: computed(() => ({ page: page.value, limit: 40 })),
})

const items = computed(() => data.value?.data ?? [])
const totalPages = computed(() => data.value?.totalPages ?? 1)

async function upload(files: FileList | null) {
  if (!files?.length) return
  uploading.value = true
  uploadError.value = ''
  try {
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      await $fetch('/api/media/upload', { method: 'POST', body: fd })
    }
    await refresh()
  } catch (e: unknown) {
    uploadError.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? 'Upload failed'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function deleteItem(item: MediaRecord) {
  if (!confirm(`Delete "${item.originalName}"?`)) return
  await $fetch(`/api/media/${item._id}`, { method: 'DELETE' })
  await refresh()
}

function copyUrl(url: string) {
  navigator.clipboard?.writeText(url)
}

const sizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const isImage = (mime: string) => mime.startsWith('image/')
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Media Library</h1>
      <div class="flex items-center gap-3">
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*,video/*,application/pdf"
          class="hidden"
          @change="upload(($event.target as HTMLInputElement).files)"
        />
        <button
          @click="fileInput?.click()"
          :disabled="uploading"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          <svg v-if="uploading" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z"/><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"/></svg>
          {{ uploading ? 'Uploading…' : 'Upload' }}
        </button>
      </div>
    </div>

    <p v-if="uploadError" class="mb-4 text-red-500 text-sm">{{ uploadError }}</p>

    <!-- Drop zone when empty -->
    <div
      v-if="items.length === 0"
      class="border-2 border-dashed dark:border-gray-600 rounded-2xl p-16 text-center text-gray-400 cursor-pointer hover:border-indigo-400 transition"
      @click="fileInput?.click()"
      @dragover.prevent
      @drop.prevent="upload(($event as DragEvent).dataTransfer?.files ?? null)"
    >
      <svg class="w-12 h-12 mx-auto mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd"/></svg>
      <p class="text-lg font-medium mb-1">No media yet</p>
      <p class="text-sm">Click or drag files here to upload</p>
    </div>

    <!-- Grid -->
    <div
      v-else
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      @dragover.prevent
      @drop.prevent="upload(($event as DragEvent).dataTransfer?.files ?? null)"
    >
      <div
        v-for="item in items"
        :key="item._id"
        class="group relative rounded-xl overflow-hidden border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 aspect-square flex items-center justify-center"
      >
        <img
          v-if="isImage(item.mimeType)"
          :src="item.url"
          :alt="item.alt ?? item.originalName"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div v-else class="flex flex-col items-center gap-1 text-gray-400">
          <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z"/></svg>
          <span class="text-xs">{{ item.mimeType.split('/')[1] }}</span>
        </div>

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2 p-2">
          <p class="text-white text-xs text-center font-medium truncate w-full px-2">{{ item.originalName }}</p>
          <p class="text-gray-300 text-xs">{{ sizeLabel(item.size) }}</p>
          <div class="flex gap-2 mt-1">
            <button
              @click="copyUrl(item.url)"
              title="Copy URL"
              class="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <svg class="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>
            </button>
            <a
              :href="item.url"
              target="_blank"
              title="Open"
              class="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <svg class="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clip-rule="evenodd"/></svg>
            </a>
            <button
              @click="deleteItem(item)"
              title="Delete"
              class="p-1.5 bg-white/20 hover:bg-red-500/80 rounded-lg transition"
            >
              <svg class="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 mt-6 text-sm">
      <button :disabled="page <= 1" @click="page--" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">Previous</button>
      <span class="text-gray-500">Page {{ page }} of {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">Next</button>
    </div>
  </div>
</template>
