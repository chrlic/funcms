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

const gridClass = computed(() => ({
  'grid': true,
  'grid-cols-2': props.columns === '2',
  'grid-cols-3': props.columns === '3',
  'grid-cols-4': props.columns === '4',
  'gap-0': props.gap === 'none',
  'gap-4': props.gap === 'sm',
  'gap-6': props.gap === 'md',
  'gap-10': props.gap === 'lg',
}))
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
