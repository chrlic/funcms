<script setup lang="ts">
const props = withDefaults(defineProps<{
  images?: string
  columns?: number
}>(), {
  images: '[]',
  columns: 3,
})

interface GalleryImage { src: string; alt?: string; caption?: string }

const parsedImages = computed<GalleryImage[]>(() => {
  try { return JSON.parse(props.images) as GalleryImage[] } catch { return [] }
})

// Map to full Tailwind class strings so Tailwind doesn't purge them
const mdColsClass: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
}
const mdCols = computed(() => mdColsClass[props.columns] ?? 'md:grid-cols-3')
</script>

<template>
  <div class="my-6">
    <!-- Mobile: 1 col. sm: 2 col. md+: editor-chosen column count -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" :class="mdCols">
      <figure v-for="(img, i) in parsedImages" :key="i" class="overflow-hidden rounded-lg">
        <img :src="img.src" :alt="img.alt ?? ''" class="w-full h-48 object-cover" />
        <figcaption v-if="img.caption" class="mt-1 text-xs text-gray-500 text-center">{{ img.caption }}</figcaption>
      </figure>
      <div v-if="parsedImages.length === 0" class="col-span-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-sm">
        No images
      </div>
    </div>
  </div>
</template>
