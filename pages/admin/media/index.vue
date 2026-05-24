<script setup lang="ts">
import type { MediaItem, FocalPoint } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type MediaRecord = StoreRecord & MediaItem

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

// ── Upload ────────────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

// ── List ──────────────────────────────────────────────────────────────────────
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

// ── Detail panel ──────────────────────────────────────────────────────────────
const selected = ref<MediaRecord | null>(null)
const usedIn = ref<{ id: string; title: string; slug: string }[]>([])
const loadingUsage = ref(false)
const savingMeta = ref(false)
const editAlt = ref('')
const focalPoint = ref<FocalPoint>({ x: 0.5, y: 0.5 })
const focalImgEl = ref<HTMLImageElement | null>(null)
const copied = ref(false)

async function selectItem(item: MediaRecord) {
  selected.value = item
  editAlt.value = item.alt ?? ''
  focalPoint.value = item.focalPoint ?? { x: 0.5, y: 0.5 }
  usedIn.value = []
  loadingUsage.value = true
  try {
    const res = await $fetch<{ data: MediaRecord; usedIn: typeof usedIn.value }>(
      `/api/media/${item._id}?usage=1`
    )
    usedIn.value = res.usedIn
  } finally {
    loadingUsage.value = false
  }
}

function closPanel() { selected.value = null }

async function saveMeta() {
  if (!selected.value) return
  savingMeta.value = true
  try {
    await $fetch(`/api/media/${selected.value._id}`, {
      method: 'PATCH',
      body: { alt: editAlt.value, focalPoint: focalPoint.value },
    })
    selected.value.alt = editAlt.value
    selected.value.focalPoint = focalPoint.value
    await refresh()
  } finally {
    savingMeta.value = false
  }
}

function setFocalPoint(e: MouseEvent) {
  const img = focalImgEl.value
  if (!img) return
  const rect = img.getBoundingClientRect()
  focalPoint.value = {
    x: Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100,
    y: Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100,
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────
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
  if (selected.value?._id === item._id) selected.value = null
  await refresh()
}

async function copyUrl(url: string) {
  await navigator.clipboard?.writeText(url)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sizeLabel = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
const isImage = (mime: string) => mime.startsWith('image/')
</script>

<template>
  <div class="flex gap-6 h-[calc(100vh-130px)]">
    <!-- Left: grid -->
    <div class="flex-1 min-w-0 flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Media Library</h1>
        <div class="flex items-center gap-3">
          <input
            ref="fileInput" type="file" multiple
            accept="image/*,video/*,application/pdf"
            class="hidden"
            @change="upload(($event.target as HTMLInputElement).files)"
          />
          <button
            @click="fileInput?.click()" :disabled="uploading"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <svg v-if="uploading" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z"/><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"/></svg>
            {{ uploading ? 'Uploading…' : 'Upload' }}
          </button>
        </div>
      </div>

      <p v-if="uploadError" class="mb-3 text-red-500 text-sm">{{ uploadError }}</p>

      <!-- Empty drop zone -->
      <div
        v-if="items.length === 0"
        class="flex-1 border-2 border-dashed dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-indigo-400 transition"
        @click="fileInput?.click()"
        @dragover.prevent
        @drop.prevent="upload(($event as DragEvent).dataTransfer?.files ?? null)"
      >
        <svg class="w-12 h-12 mb-3 opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd"/></svg>
        <p class="text-lg font-medium mb-1">No media yet</p>
        <p class="text-sm">Click or drag files here to upload</p>
      </div>

      <!-- Grid -->
      <div
        v-else
        class="flex-1 overflow-y-auto"
        @dragover.prevent
        @drop.prevent="upload(($event as DragEvent).dataTransfer?.files ?? null)"
      >
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          <button
            v-for="item in items"
            :key="item._id"
            @click="selectItem(item)"
            class="group relative rounded-xl overflow-hidden border-2 bg-gray-50 dark:bg-gray-800 aspect-square flex items-center justify-center transition"
            :class="selected?._id === item._id
              ? 'border-indigo-500 ring-2 ring-indigo-300'
              : 'border-transparent dark:border-gray-700 hover:border-indigo-300'"
          >
            <img
              v-if="isImage(item.mimeType)"
              :src="item.url"
              :alt="item.alt ?? item.originalName"
              class="w-full h-full object-cover"
              :style="item.focalPoint ? `object-position: ${item.focalPoint.x * 100}% ${item.focalPoint.y * 100}%` : ''"
              loading="lazy"
            />
            <div v-else class="flex flex-col items-center gap-1 text-gray-400">
              <svg class="w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z"/></svg>
              <span class="text-xs">{{ item.mimeType.split('/')[1] }}</span>
            </div>
            <!-- Alt badge -->
            <span v-if="!item.alt && isImage(item.mimeType)"
              class="absolute top-1 right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1 rounded">
              alt
            </span>
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 mt-4 text-sm">
        <button :disabled="page <= 1" @click="page--" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Previous</button>
        <span class="text-gray-500">Page {{ page }} of {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="page++" class="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition">Next</button>
      </div>
    </div>

    <!-- Right: detail panel -->
    <Transition name="slide-right">
      <div v-if="selected"
        class="w-80 shrink-0 flex flex-col border dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ selected.originalName }}</p>
          <button @click="closPanel" class="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <!-- Focal point picker (images only) -->
          <div v-if="isImage(selected.mimeType)" class="p-4 border-b dark:border-gray-700">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Focal point <span class="text-gray-400">(click to set)</span></p>
            <div class="relative rounded-lg overflow-hidden cursor-crosshair" @click="setFocalPoint">
              <img
                ref="focalImgEl"
                :src="selected.url"
                :alt="selected.alt ?? selected.originalName"
                class="w-full object-cover max-h-44 select-none pointer-events-none"
              />
              <!-- Focal point crosshair -->
              <div
                class="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                :style="`left: ${focalPoint.x * 100}%; top: ${focalPoint.y * 100}%`"
              >
                <div class="w-full h-full rounded-full border-2 border-white ring-1 ring-black/30 bg-indigo-500/50"></div>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-1 text-center">
              {{ Math.round(focalPoint.x * 100) }}% × {{ Math.round(focalPoint.y * 100) }}%
            </p>
          </div>

          <!-- Meta fields -->
          <div class="p-4 space-y-4 border-b dark:border-gray-700">
            <!-- Alt text -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Alt text</label>
              <textarea
                v-model="editAlt"
                rows="2"
                placeholder="Describe this image…"
                class="w-full text-sm rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              @click="saveMeta" :disabled="savingMeta"
              class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {{ savingMeta ? 'Saving…' : 'Save changes' }}
            </button>
          </div>

          <!-- File info -->
          <div class="p-4 space-y-2 text-xs border-b dark:border-gray-700">
            <div class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Size</span><span class="text-gray-900 dark:text-white font-medium">{{ sizeLabel(selected.size) }}</span>
            </div>
            <div v-if="selected.width && selected.height" class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Dimensions</span><span class="text-gray-900 dark:text-white font-medium">{{ selected.width }} × {{ selected.height }}</span>
            </div>
            <div class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Type</span><span class="text-gray-900 dark:text-white font-medium">{{ selected.mimeType }}</span>
            </div>
            <div v-if="selected.createdAt" class="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Uploaded</span><span class="text-gray-900 dark:text-white font-medium">{{ new Date(selected.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>

          <!-- URL -->
          <div class="p-4 border-b dark:border-gray-700">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">URL</p>
            <div class="flex items-center gap-2">
              <code class="flex-1 text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1.5 truncate text-gray-700 dark:text-gray-300">{{ selected.url }}</code>
              <button @click="copyUrl(selected.url)" class="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" :title="copied ? 'Copied!' : 'Copy URL'">
                <svg v-if="!copied" class="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>
                <svg v-else class="w-4 h-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
              </button>
            </div>
          </div>

          <!-- Usage -->
          <div class="p-4">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Used in pages</p>
            <p v-if="loadingUsage" class="text-xs text-gray-400">Scanning…</p>
            <p v-else-if="usedIn.length === 0" class="text-xs text-gray-400 italic">Not used on any page</p>
            <ul v-else class="space-y-1">
              <li v-for="p in usedIn" :key="p.id">
                <NuxtLink :to="`/admin/pages/${p.id}`"
                  class="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  <span class="truncate">{{ p.title || p.slug }}</span>
                  <span class="text-gray-400 shrink-0">→</span>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="px-4 py-3 border-t dark:border-gray-700 flex gap-2">
          <a :href="selected.url" target="_blank"
            class="flex-1 text-center py-2 text-sm border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300">
            Open ↗
          </a>
          <button @click="deleteItem(selected)"
            class="flex-1 py-2 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition font-medium">
            Delete
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-right-enter-active, .slide-right-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-right-enter-from, .slide-right-leave-to { opacity: 0; transform: translateX(12px); }
</style>
