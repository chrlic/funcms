<script setup lang="ts">
defineProps<{
  blocksBySlot: Record<string, unknown[]>
}>()
</script>

<template>
  <div class="layout-sidebar-right max-w-7xl mx-auto px-6 py-8 flex gap-8">
    <main class="flex-1 min-w-0">
      <slot name="main" />
    </main>
    <aside class="w-64 shrink-0">
      <slot name="sidebar" />
    </aside>
  </div>
</template>
