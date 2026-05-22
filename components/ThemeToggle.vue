<script setup lang="ts">
const colorMode = useColorMode()

const modes = [
  { value: 'system', label: 'System', icon: 'M12 3v1m0 16v1m8.66-13-0.87.5M4.21 17.5l-.87.5M20.66 17.5l-.87-.5M4.21 6.5l-.87-.5M21 12h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
  { value: 'light', label: 'Light', icon: 'M12 3v1m0 16v1m8.66-13-.87.5M4.21 17.5l-.87.5M20.66 17.5l-.87-.5M4.21 6.5l-.87-.5M21 12h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
  { value: 'dark', label: 'Dark', icon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z' },
]

const current = computed(() => colorMode.preference)
function set(val: string) { colorMode.preference = val }
</script>

<template>
  <div class="flex items-center gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
    <button
      v-for="m in modes"
      :key="m.value"
      :title="m.label"
      type="button"
      class="w-7 h-7 flex items-center justify-center rounded transition"
      :class="current === m.value
        ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400'
        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
      @click="set(m.value)"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path v-if="m.value === 'dark'" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>
        <template v-else-if="m.value === 'system'">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </template>
        <template v-else>
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </template>
      </svg>
    </button>
  </div>
</template>
