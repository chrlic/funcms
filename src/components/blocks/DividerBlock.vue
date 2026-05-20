<script setup lang="ts">
withDefaults(defineProps<{
  style?: 'line' | 'space' | 'dots'
  spacing?: 'sm' | 'md' | 'lg'
}>(), {
  style: 'line',
  spacing: 'md',
})

const spacingClass: Record<string, string> = {
  sm: 'my-4',
  md: 'my-8',
  lg: 'my-16',
}
</script>

<template>
  <div :class="spacingClass[spacing ?? 'md']">
    <hr v-if="style === 'line'" class="border-gray-200 dark:border-gray-700" />
    <div v-else-if="style === 'dots'" class="flex items-center justify-center gap-2">
      <span v-for="n in 3" :key="n" class="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
    </div>
    <!-- space: just the margin from spacingClass -->
  </div>
</template>
