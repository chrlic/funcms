<script setup lang="ts">
import type { Block } from '~/types'

defineProps<{
  blocksBySlot: Record<string, Block[]>
}>()
</script>

<template>
  <div>
    <slot name="main" />
    <slot />
  </div>
</template>
