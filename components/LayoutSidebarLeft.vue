<script setup lang="ts">
const props = withDefaults(defineProps<{
  blocksBySlot: Record<string, unknown[]>
  sidebarWidth?: number
}>(), {
  sidebarWidth: 25,
})

// Inline width only applies at md+ — below that the flex-col kicks in and width is irrelevant
const sidebarStyle = computed(() => ({ '--sidebar-w': `${props.sidebarWidth}%` }))
</script>

<template>
  <div class="layout-sidebar-left max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8" :style="sidebarStyle">
    <aside class="w-full md:w-[var(--sidebar-w)] shrink-0 min-w-0">
      <slot name="sidebar" />
    </aside>
    <main class="w-full md:flex-1 min-w-0">
      <slot name="main" />
    </main>
  </div>
</template>
