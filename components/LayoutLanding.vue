<script setup lang="ts">
defineProps<{
  blocksBySlot: Record<string, unknown[]>
}>()
</script>

<template>
  <div class="layout-landing">
    <slot name="hero" />
    <slot name="main" />
    <slot name="footer" />
  </div>
</template>
