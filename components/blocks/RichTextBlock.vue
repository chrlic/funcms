<script setup lang="ts">
const props = withDefaults(defineProps<{
  content: string
  maxWidth?: 'prose' | 'wide' | 'full'
  fontFamily?: string
  fontSize?: string
}>(), {
  maxWidth: 'prose',
  fontFamily: '',
  fontSize: '',
})

const maxWidthMap = {
  prose: 'max-w-prose',
  wide: 'max-w-4xl',
  full: 'max-w-none',
}

const blockStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.fontFamily) s.fontFamily = props.fontFamily
  if (props.fontSize) s.fontSize = props.fontSize
  return s
})
</script>

<template>
  <div class="px-6 py-8 mx-auto" :class="maxWidthMap[maxWidth]" :style="blockStyle">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="prose prose-lg dark:prose-invert" v-html="content" />
  </div>
</template>
