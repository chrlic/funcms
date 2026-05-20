<script setup lang="ts">
import type { Block } from '~/types'

defineProps<{
  blocksBySlot: Record<string, Block[]>
}>()
</script>

<template>
  <div class="min-h-screen">
    <slot name="hero" />
    <slot name="main" />
    <slot name="footer" />
    <slot />
  </div>
</template>
