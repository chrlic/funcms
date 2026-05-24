<script setup lang="ts">
import type { CssHintGroup } from '~/composables/useCssHints'

const props = defineProps<{
  groups: CssHintGroup[]
  scope?: string   // e.g. ".block-abc123" — prepended in the copy preview
}>()

const emit = defineEmits<{ insert: [snippet: string] }>()

const open = ref(false)
const inserted = ref('')

function fullSelector(sel: string) {
  if (!props.scope) return sel
  if (sel === '&') return props.scope
  if (sel.startsWith('@media')) {
    // e.g. "@media (max-width: 768px) { & .foo" → "@media (...) { .block-id .foo"
    return sel.replace(/&\s?/g, (props.scope + ' ')).trimEnd()
  }
  return sel.startsWith('&') ? props.scope + sel.slice(1) : `${props.scope} ${sel}`
}

function buildSnippet(hint: CssHintGroup['hints'][number]) {
  const sel = hint.selector
  const example = hint.example

  // Media query hints already contain the closing brace in example
  if (sel.startsWith('@media')) {
    const media = sel.substring(0, sel.lastIndexOf('{') + 1).trim()
    const innerSel = sel.substring(sel.lastIndexOf('{') + 1).trim()
    const fullInner = innerSel === '&' ? (props.scope ?? '&') :
      innerSel.startsWith('&') ? (props.scope ?? '') + innerSel.slice(1) :
      innerSel.startsWith(props.scope ?? '__') ? innerSel : `${props.scope ?? ''} ${innerSel}`
    // example for media hints ends with "}" already
    const prop = example.endsWith('}') ? example.slice(0, -1).trim() : example
    return `${media}\n  ${fullInner} {\n    ${prop}\n  }\n}`
  }

  const full = fullSelector(sel)
  return `${full} {\n  ${example}\n}`
}

function insertHint(hint: CssHintGroup['hints'][number]) {
  const snippet = buildSnippet(hint)
  emit('insert', snippet)
  inserted.value = hint.selector
  setTimeout(() => { inserted.value = '' }, 1500)
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
      CSS hints
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
              @click="insertHint(hint)"
              :title="`Click to insert example`"
            >
              <td class="px-3 py-2 text-gray-600 dark:text-gray-300 w-1/4">{{ hint.element }}</td>
              <td class="px-3 py-2 font-mono text-gray-400 dark:text-gray-500">{{ hint.example }}</td>
              <td class="px-3 py-2 text-right w-8">
                <svg v-if="inserted === hint.selector" class="w-3 h-3 text-green-500 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd"/></svg>
                <svg v-else class="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover/row:opacity-100 inline transition" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/></svg>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="px-3 py-2 text-gray-400 border-t dark:border-gray-700">Click a row to insert the example snippet into the CSS editor.</p>
    </div>
  </div>
</template>
