<script setup lang="ts">
withDefaults(defineProps<{
  content: string
  maxWidth?: 'prose' | 'wide' | 'full'
}>(), {
  maxWidth: 'prose',
})

const maxWidthMap = {
  prose: 'max-w-prose',
  wide: 'max-w-4xl',
  full: 'max-w-none',
}
</script>

<template>
  <div class="px-6 py-8 mx-auto" :class="maxWidthMap[maxWidth]">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose prose-lg dark:prose-invert" v-html="content" />
  </div>
</template>
