<script setup lang="ts">
withDefaults(defineProps<{
  src?: string
  alt?: string
  caption?: string
  width?: 'full' | 'wide' | 'medium'
}>(), {
  alt: '',
  width: 'full',
})

const widthClass: Record<string, string> = {
  full: 'w-full',
  wide: 'max-w-4xl mx-auto',
  medium: 'max-w-2xl mx-auto',
}
</script>

<template>
  <figure :class="['my-6', widthClass[width ?? 'full']]">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="w-full rounded-lg object-cover"
    />
    <div v-else class="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
      No image
    </div>
    <figcaption v-if="caption" class="mt-2 text-center text-sm text-gray-500">{{ caption }}</figcaption>
  </figure>
</template>
