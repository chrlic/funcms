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
</script>

<template>
  <div
    class="grid gap-4 my-6"
    :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
  >
    <figure v-for="(img, i) in parsedImages" :key="i" class="overflow-hidden rounded-lg">
      <img :src="img.src" :alt="img.alt ?? ''" class="w-full h-48 object-cover" />
      <figcaption v-if="img.caption" class="mt-1 text-xs text-gray-500 text-center">{{ img.caption }}</figcaption>
    </figure>
    <div v-if="parsedImages.length === 0" class="col-span-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-sm">
      No images
    </div>
  </div>
</template>
