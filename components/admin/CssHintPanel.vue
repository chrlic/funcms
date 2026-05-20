<script setup lang="ts">
import type { CssHintGroup } from '~/composables/useCssHints'

const props = defineProps<{
  groups: CssHintGroup[]
  scope?: string   // e.g. ".block-abc123" — prepended in the copy preview
}>()

const open = ref(false)
const copied = ref('')

function fullSelector(sel: string) {
  if (!props.scope) return sel
  if (sel === '&') return props.scope
  return sel.startsWith('&') ? props.scope + sel.slice(1) : `${props.scope} ${sel}`
}

function copySelector(sel: string) {
  const full = fullSelector(sel)
  navigator.clipboard.writeText(full)
  copied.value = sel
  setTimeout(() => { copied.value = '' }, 1500)
}
</script>

<template>
  <div class="mt-1">
    <button
      type="button"
      class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition"
      @click="open = !open"
    >
      <svg class="w-3.5 h-3.5 transition-transform" :class="{ '-rotate-90': !open }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
      CSS selector reference
    </button>

    <div v-if="open" class="mt-2 rounded-lg border dark:border-gray-600 overflow-hidden text-xs">
      <div v-for="group in groups" :key="group.label">
        <div class="bg-gray-50 dark:bg-gray-700 px-3 py-1.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-[10px]">
          {{ group.label }}
        </div>
        <table class="w-full">
          <tbody>
            <tr
              v-for="hint in group.hints"
              :key="hint.selector"
              class="border-t dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group/row cursor-pointer"
              @click="copySelector(hint.selector)"
              :title="`Click to copy: ${fullSelector(hint.selector)}`"
            >
              <td class="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap w-1/3">
                <span class="flex items-center gap-1.5">
                  {{ hint.selector === '&' ? (scope ?? '&') : hint.selector }}
                  <svg v-if="copied === hint.selector" class="w-3 h-3 text-green-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
                  <svg v-else class="w-3 h-3 opacity-0 group-hover/row:opacity-40 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"/><path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"/></svg>
                </span>
              </td>
              <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ hint.element }}</td>
              <td class="px-3 py-2 font-mono text-gray-400 dark:text-gray-500 hidden lg:table-cell">{{ hint.example }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
