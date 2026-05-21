<script setup lang="ts">
const props = withDefaults(defineProps<{
  columns?: '2' | '3' | '4'
  gap?: 'none' | 'sm' | 'md' | 'lg'
  items?: string
}>(), {
  columns: '3',
  gap: 'md',
  items: '[]',
})

const parsedItems = computed(() => {
  try { return JSON.parse(props.items) as unknown[] } catch { return [] }
})

// Mobile: 1 col always. sm: 2 col. md+: editor-chosen value.
const gridClass = computed(() => [
  'grid',
  'grid-cols-1',
  'sm:grid-cols-2',
  props.columns === '2' ? 'md:grid-cols-2' : props.columns === '4' ? 'md:grid-cols-4' : 'md:grid-cols-3',
  props.gap === 'none' ? 'gap-0' : props.gap === 'sm' ? 'gap-4' : props.gap === 'lg' ? 'gap-10' : 'gap-6',
])
</script>

<template>
  <div :class="gridClass">
    <div v-for="(item, i) in parsedItems" :key="i" class="rounded-lg overflow-hidden">
      <slot :item="item" :index="i">
        <div class="bg-gray-100 dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-400">
          {{ item }}
        </div>
      </slot>
    </div>
  </div>
</template>
