<script setup lang="ts">
import { blockSchemas } from '~/components/blocks/index'
import type { Block, CustomBlockField } from '~/types'
import type { PropSchema } from '~/components/blocks/index'
import { getBlockHints } from '~/composables/useCssHints'

const props = defineProps<{ block: Block; locale?: string }>()
const emit = defineEmits<{
  update: [block: Block]
  remove: []
  moveUp: []
  moveDown: []
}>()

const { metas: customBlockMetas } = useCustomBlocks()

const collapsed = ref(false)
const localProps = ref<Record<string, unknown>>({ ...props.block.props })

// Convert a CustomBlockField to PropSchema so the same form renderer works for both
function customFieldToSchema(field: CustomBlockField): PropSchema {
  return { type: field.type, label: field.label, default: field.default, options: field.options, required: field.required }
}

const schema = computed<Record<string, PropSchema>>(() => {
  // Built-in block
  if (blockSchemas[props.block.type]) return blockSchemas[props.block.type]
  // Custom block — find its field definitions
  const meta = customBlockMetas.value.find(m => m.slug === props.block.type)
  if (meta?.fields?.length) {
    return Object.fromEntries(meta.fields.map(f => [f.name, customFieldToSchema(f)]))
  }
  return {}
})

function onField(key: string, value: unknown) {
  localProps.value = { ...localProps.value, [key]: value }
  emit('update', { ...props.block, props: { ...localProps.value } })
}

watch(() => props.block.id, () => { localProps.value = { ...props.block.props } })

function getSelectOptions(schema: PropSchema) { return schema.options ?? [] }

const summary = computed(() => {
  for (const [, v] of Object.entries(localProps.value)) {
    if (typeof v === 'string' && v.trim()) {
      const plain = v.replace(/<[^>]+>/g, '').trim()
      if (plain) return plain.slice(0, 60) + (plain.length > 60 ? '…' : '')
    }
  }
  return null
})

// Media picker state — one picker open at a time, keyed by field name
const pickerField = ref<string | null>(null)

// Global components list — only needed when block type is 'global'
const isGlobalBlock = computed(() => props.block.type === 'global')
const globalComponents = ref<{ _id: string; name: string }[]>([])

watch(isGlobalBlock, async (v) => {
  if (!v) return
  try {
    const res = await $fetch<{ data: { _id: string; name: string }[] }>('/api/global-components')
    globalComponents.value = res.data ?? []
  } catch {}
}, { immediate: true })

// Per-block CSS editor toggle
const cssOpen = ref(false)
const blockScope = computed(() => `.block-${props.block.id}`)
const hints = computed(() => getBlockHints(props.block.type))
const cssTextarea = ref<HTMLTextAreaElement | null>(null)

function insertCssSnippet(snippet: string) {
  cssOpen.value = true
  const current = (block.customCss ?? '').trimEnd()
  const next = current ? current + '\n\n' + snippet : snippet
  emit('update', { ...props.block, customCss: next })
  nextTick(() => {
    if (cssTextarea.value) {
      cssTextarea.value.value = next
      cssTextarea.value.scrollTop = cssTextarea.value.scrollHeight
    }
  })
}
</script>

<template>
  <div class="border dark:border-gray-600 rounded-xl overflow-hidden">
    <!-- Block header -->
    <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2.5 select-none">
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0">
          <!-- bars-3 -->
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>
        </span>
        <button class="flex items-center gap-2 flex-1 min-w-0 text-left" @click="collapsed = !collapsed">
          <!-- chevron -->
          <svg class="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform" :class="{ '-rotate-90': collapsed }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize shrink-0">{{ block.type.replace('-', ' ') }}</span>
          <span class="text-xs text-gray-400 font-mono shrink-0">{{ block.slot }}</span>
          <span v-if="collapsed && summary" class="text-xs text-gray-400 truncate ml-1">— {{ summary }}</span>
        </button>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button @click.stop="emit('update', { ...block, visible: !block.visible })" :title="block.visible ? 'Hide block' : 'Show block'" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 transition">
          <!-- eye / eye-slash -->
          <svg v-if="block.visible" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd"/></svg>
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clip-rule="evenodd"/><path d="M10.748 13.93l2.523 2.523a10.047 10.047 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z"/></svg>
        </button>
        <button @click.stop="emit('moveUp')" title="Move up" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clip-rule="evenodd"/></svg>
        </button>
        <button @click.stop="emit('moveDown')" title="Move down" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
        </button>
        <button @click.stop="emit('remove')" title="Remove block" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/></svg>
        </button>
      </div>
    </div>

    <!-- Fields -->
    <div v-if="!collapsed">
      <div v-if="block.visible !== false" class="p-4 space-y-4">
        <div v-for="(fieldSchema, key) in schema" :key="key">
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {{ fieldSchema.label }}
            <span v-if="fieldSchema.required" class="text-red-400 ml-0.5">*</span>
          </label>
          <input v-if="fieldSchema.type === 'text' || fieldSchema.type === 'url'" :value="localProps[key] as string ?? fieldSchema.default as string ?? ''" :type="fieldSchema.type === 'url' ? 'url' : 'text'" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" @input="onField(key, ($event.target as HTMLInputElement).value)" />
          <RichTextEditor v-else-if="fieldSchema.type === 'richtext'" :model-value="localProps[key] as string ?? fieldSchema.default as string ?? ''" :locale="locale" @update:model-value="onField(key, $event)" />
          <textarea v-else-if="fieldSchema.type === 'textarea'" :value="localProps[key] as string ?? fieldSchema.default as string ?? ''" rows="4" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono resize-y" @input="onField(key, ($event.target as HTMLTextAreaElement).value)" />
          <input v-else-if="fieldSchema.type === 'number'" :value="localProps[key] as number ?? fieldSchema.default as number ?? 0" type="number" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" @input="onField(key, Number(($event.target as HTMLInputElement).value))" />
          <label v-else-if="fieldSchema.type === 'boolean'" class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="localProps[key] as boolean ?? fieldSchema.default as boolean ?? false" class="w-4 h-4 rounded text-indigo-600" @change="onField(key, ($event.target as HTMLInputElement).checked)" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
          </label>
          <select v-else-if="fieldSchema.type === 'select'" :value="localProps[key] as string ?? fieldSchema.default as string ?? ''" class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" @change="onField(key, ($event.target as HTMLSelectElement).value)">
            <option v-for="opt in getSelectOptions(fieldSchema)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <div v-else-if="fieldSchema.type === 'color'" class="flex items-center gap-2">
            <input type="color" :value="localProps[key] as string ?? fieldSchema.default as string ?? '#6366f1'" class="w-10 h-10 rounded border cursor-pointer" @input="onField(key, ($event.target as HTMLInputElement).value)" />
            <input :value="localProps[key] as string ?? fieldSchema.default as string ?? ''" type="text" class="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono" @input="onField(key, ($event.target as HTMLInputElement).value)" />
          </div>
          <div v-else-if="fieldSchema.type === 'global-component'">
            <select
              :value="localProps[key] as string ?? ''"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              @change="onField(key, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">— Select a global component —</option>
              <option v-for="gc in globalComponents" :key="gc._id" :value="gc._id">{{ gc.name }}</option>
            </select>
            <p v-if="globalComponents.length === 0" class="mt-1 text-xs text-gray-400">
              No global components yet.
              <NuxtLink to="/admin/global-components" class="text-indigo-500 hover:underline">Create one →</NuxtLink>
            </p>
            <p v-else-if="!localProps[key]" class="mt-1 text-xs text-gray-400">Pick a global component above.</p>
            <NuxtLink v-else :to="`/admin/global-components`" class="mt-1 block text-xs text-indigo-500 hover:underline">Edit global components →</NuxtLink>
          </div>
          <div v-else-if="fieldSchema.type === 'image'" class="space-y-2">
            <div class="flex gap-2">
              <input :value="localProps[key] as string ?? ''" type="url" placeholder="https://… or /uploads/…" class="flex-1 min-w-0 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" @input="onField(key, ($event.target as HTMLInputElement).value)" />
              <button
                type="button"
                title="Pick from media library"
                class="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 text-gray-600 dark:text-gray-300 transition"
                @click="pickerField = key"
              >
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clip-rule="evenodd"/></svg>
                Library
              </button>
            </div>
            <img v-if="localProps[key]" :src="localProps[key] as string" class="h-24 rounded-lg object-cover border dark:border-gray-600" />
            <MediaPicker
              v-if="pickerField === key"
              @select="onField(key, $event); pickerField = null"
              @close="pickerField = null"
            />
          </div>
        </div>
        <div v-if="Object.keys(schema).length === 0" class="text-sm text-gray-400 italic">No editable settings for this block type.</div>

        <!-- Per-block CSS -->
        <div class="border-t dark:border-gray-600 pt-3 mt-1">
          <button
            type="button"
            class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
            @click="cssOpen = !cssOpen"
          >
            <svg class="w-3.5 h-3.5 transition-transform" :class="{ '-rotate-90': !cssOpen }" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/></svg>
            Custom CSS
            <span v-if="block.customCss?.trim()" class="ml-1 px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs">active</span>
          </button>
          <div v-if="cssOpen" class="mt-2 space-y-2">
            <p class="text-xs text-gray-400">Scoped to <code class="font-mono">.block-{{ block.id }}</code></p>
            <CssHintPanel v-if="hints.length" :groups="hints" :scope="blockScope" @insert="insertCssSnippet" />
            <textarea
              ref="cssTextarea"
              :value="block.customCss ?? ''"
              rows="5"
              placeholder="color: red;&#10;padding: 2rem;&#10;/* or full rules: */&#10;.block-{{ block.id }} h2 { font-size: 2rem; }"
              class="w-full border rounded-lg px-3 py-2 text-xs font-mono dark:bg-gray-800 dark:border-gray-600 dark:text-white resize-y"
              @input="emit('update', { ...block, customCss: ($event.target as HTMLTextAreaElement).value })"
            />
          </div>
        </div>
      </div>
      <div v-else class="px-4 py-2 text-xs text-gray-400 italic">Block hidden — click eye icon to show</div>
    </div>
  </div>
</template>
