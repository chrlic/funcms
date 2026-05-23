<script setup lang="ts">
import { builtinBlockTypes } from '~/components/blocks/index'
import type { BlockType } from '~/types'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ pick: [type: BlockType]; close: [] }>()

const { metas: customBlockMetas } = useCustomBlocks()

const allTypes = computed(() => [
  ...builtinBlockTypes,
  ...customBlockMetas.value.map(m => ({ type: m.slug as BlockType, label: m.label, custom: true })),
])
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        @click.self="emit('close')"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Choose block type</h2>
            <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="bt in allTypes"
              :key="bt.type"
              @click="emit('pick', bt.type); emit('close')"
              class="flex items-center gap-2 px-3 py-2.5 border dark:border-gray-600 rounded-lg text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 transition"
              :class="(bt as { custom?: boolean }).custom ? 'border-purple-200 dark:border-purple-700' : ''"
            >
              <svg v-if="(bt as { custom?: boolean }).custom" class="w-4 h-4 text-purple-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3.25 3A2.25 2.25 0 0 0 1 5.25v9.5A2.25 2.25 0 0 0 3.25 17h13.5A2.25 2.25 0 0 0 19 14.75v-9.5A2.25 2.25 0 0 0 16.75 3H3.25Zm.943 8.752a.75.75 0 0 1 .05-1.06L6.867 9l-2.624-1.692a.75.75 0 1 1 .814-1.26l3.38 2.184a.75.75 0 0 1 0 1.27l-3.38 2.184a.75.75 0 0 1-1.06-.05ZM9.25 12a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5h-5.5Z" clip-rule="evenodd"/>
              </svg>
              <svg v-else class="w-4 h-4 text-indigo-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12 4.467c0-.405.262-.75.559-1.027.504-.46.857-1.08.857-1.773a.75.75 0 0 0-.75-.75 3.504 3.504 0 0 0-3.5 3.5c0 .097.004.193.012.288A4.498 4.498 0 0 0 5.5 9.25H4.25a.75.75 0 0 0 0 1.5H5.5v.5H4.25a.75.75 0 0 0 0 1.5H5.5a4.5 4.5 0 0 0 4.5 4.5v1.25a.75.75 0 0 0 1.5 0V17.25a4.5 4.5 0 0 0 4.5-4.5h1.25a.75.75 0 0 0 0-1.5H16v-.5h1.25a.75.75 0 0 0 0-1.5H16a4.498 4.498 0 0 0-3.678-4.427c.008-.095.012-.19.012-.288A.75.75 0 0 0 12 4.467Z"/>
              </svg>
              <div class="min-w-0">
                <div class="truncate font-medium text-gray-800 dark:text-gray-100">{{ bt.label }}</div>
                <div v-if="(bt as { custom?: boolean }).custom" class="text-xs text-purple-400">custom</div>
              </div>
            </button>
          </div>

          <div v-if="customBlockMetas.length" class="mt-3 pt-3 border-t dark:border-gray-700 flex items-center justify-between">
            <span class="text-xs text-gray-400">{{ customBlockMetas.length }} custom block type{{ customBlockMetas.length !== 1 ? 's' : '' }}</span>
            <NuxtLink to="/admin/block-types" @click="emit('close')" class="text-xs text-purple-500 hover:underline">Manage →</NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
