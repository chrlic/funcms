<script setup lang="ts">
const props = withDefaults(defineProps<{
  blocksBySlot: Record<string, unknown[]>
  sidebarWidth?: number
}>(), {
  sidebarWidth: 25,
})

const sidebarStyle = computed(() => ({ width: `${props.sidebarWidth}%` }))
const mainStyle = computed(() => ({ width: `${100 - props.sidebarWidth}%` }))
</script>

<template>
  <div class="layout-sidebar-right max-w-7xl mx-auto px-6 py-8 flex gap-8">
    <main :style="mainStyle" class="min-w-0">
      <slot name="main" />
    </main>
    <aside :style="sidebarStyle" class="shrink-0 min-w-0">
      <slot name="sidebar" />
    </aside>
  </div>
</template>
