<script setup lang="ts">
defineProps<{
  blocksBySlot: Record<string, unknown[]>
}>()
</script>

<template>
  <div class="layout-full-width">
    <slot name="main" />
  </div>
</template>
