<script setup lang="ts">
import type { Block } from '~/types'

defineProps<{
  blocksBySlot: Record<string, Block[]>
}>()
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8 flex gap-8">
    <main class="flex-1 min-w-0">
      <slot name="main" />
      <slot />
    </main>
    <aside class="w-72 shrink-0">
      <slot name="sidebar" />
    </aside>
  </div>
</template>
