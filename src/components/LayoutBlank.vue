<script setup lang="ts">
defineProps<{
  blocksBySlot: Record<string, unknown[]>
}>()
</script>

<template>
  <div class="layout-blank">
    <slot name="main" />
  </div>
</template>
