<script setup lang="ts">
withDefaults(defineProps<{
  html?: string
  dangerouslyDisableSanitize?: boolean
}>(), {
  html: '',
  dangerouslyDisableSanitize: false,
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-if="html" v-html="html" class="my-4" />
</template>
