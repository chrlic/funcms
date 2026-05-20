<script setup lang="ts">
withDefaults(defineProps<{
  url?: string
  title?: string
  aspectRatio?: '16/9' | '4/3' | '1/1'
}>(), {
  aspectRatio: '16/9',
})

const paddingMap: Record<string, string> = {
  '16/9': '56.25%',
  '4/3': '75%',
  '1/1': '100%',
}
</script>

<template>
  <div class="my-6 w-full">
    <p v-if="title" class="mb-2 font-medium text-gray-700 dark:text-gray-300">{{ title }}</p>
    <div v-if="url" class="relative w-full overflow-hidden rounded-lg bg-black" :style="{ paddingTop: paddingMap[aspectRatio ?? '16/9'] }">
      <iframe
        :src="url"
        class="absolute inset-0 w-full h-full"
        frameborder="0"
        allowfullscreen
        loading="lazy"
      />
    </div>
    <div v-else class="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
      No video URL
    </div>
  </div>
</template>
