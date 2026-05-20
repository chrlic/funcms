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
          <Icon v-if="uploading" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="i-heroicons-arrow-up-tray" class="w-4 h-4" />
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
      <Icon name="i-heroicons-photo" class="w-12 h-12 mx-auto mb-3 opacity-40" />
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
          <Icon name="i-heroicons-document" class="w-10 h-10" />
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
              <Icon name="i-heroicons-clipboard-document" class="w-4 h-4 text-white" />
            </button>
            <a
              :href="item.url"
              target="_blank"
              title="Open"
              class="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <Icon name="i-heroicons-arrow-top-right-on-square" class="w-4 h-4 text-white" />
            </a>
            <button
              @click="deleteItem(item)"
              title="Delete"
              class="p-1.5 bg-white/20 hover:bg-red-500/80 rounded-lg transition"
            >
              <Icon name="i-heroicons-trash" class="w-4 h-4 text-white" />
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
