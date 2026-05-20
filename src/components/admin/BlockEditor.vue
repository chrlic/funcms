<script setup lang="ts">
import { blockSchemas } from '~/components/blocks/index'
import type { Block } from '~/types'
import type { PropSchema } from '~/components/blocks/index'

const props = defineProps<{
  block: Block
}>()

const emit = defineEmits<{
  update: [block: Block]
  remove: []
  moveUp: []
  moveDown: []
}>()

const collapsed = ref(false)
const localProps = ref<Record<string, unknown>>({ ...props.block.props })
const schema = computed(() => blockSchemas[props.block.type] ?? {})

function onField(key: string, value: unknown) {
  localProps.value = { ...localProps.value, [key]: value }
  emit('update', { ...props.block, props: { ...localProps.value } })
}

watch(() => props.block.id, () => {
  localProps.value = { ...props.block.props }
})

function getSelectOptions(schema: PropSchema) {
  return schema.options ?? []
}

// Summary of first filled prop value for collapsed label
const summary = computed(() => {
  const entries = Object.entries(localProps.value)
  for (const [, v] of entries) {
    if (typeof v === 'string' && v.trim()) {
      const plain = v.replace(/<[^>]+>/g, '').trim()
      if (plain) return plain.slice(0, 60) + (plain.length > 60 ? '…' : '')
    }
  }
  return null
})
</script>

<template>
  <div class="border dark:border-gray-600 rounded-xl overflow-hidden">
    <!-- Block header -->
    <div
      class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-2.5 select-none"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0">
          <Icon name="i-heroicons-bars-3" class="w-4 h-4" />
        </span>

        <!-- clicking the title area toggles collapse -->
        <button
          class="flex items-center gap-2 flex-1 min-w-0 text-left"
          @click="collapsed = !collapsed"
        >
          <Icon
            :name="collapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-down'"
            class="w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform"
          />
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize shrink-0">
            {{ block.type.replace('-', ' ') }}
          </span>
          <span class="text-xs text-gray-400 font-mono shrink-0">{{ block.slot }}</span>
          <span v-if="collapsed && summary" class="text-xs text-gray-400 truncate ml-1">
            — {{ summary }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          @click.stop="emit('update', { ...block, visible: !block.visible })"
          :title="block.visible ? 'Hide block' : 'Show block'"
          class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-700 transition"
        >
          <Icon :name="block.visible ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" class="w-4 h-4" />
        </button>
        <button @click.stop="emit('moveUp')" title="Move up" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition">
          <Icon name="i-heroicons-chevron-up" class="w-4 h-4" />
        </button>
        <button @click.stop="emit('moveDown')" title="Move down" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition">
          <Icon name="i-heroicons-chevron-down" class="w-4 h-4" />
        </button>
        <button @click.stop="emit('remove')" title="Remove block" class="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition">
          <Icon name="i-heroicons-trash" class="w-4 h-4" />
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

          <!-- text -->
          <input
            v-if="fieldSchema.type === 'text' || fieldSchema.type === 'url'"
            :value="localProps[key] as string ?? fieldSchema.default as string ?? ''"
            :type="fieldSchema.type === 'url' ? 'url' : 'text'"
            class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            @input="onField(key, ($event.target as HTMLInputElement).value)"
          />

          <!-- richtext — WYSIWYG -->
          <RichTextEditor
            v-else-if="fieldSchema.type === 'richtext'"
            :model-value="localProps[key] as string ?? fieldSchema.default as string ?? ''"
            @update:model-value="onField(key, $event)"
          />

          <!-- textarea — plain -->
          <textarea
            v-else-if="fieldSchema.type === 'textarea'"
            :value="localProps[key] as string ?? fieldSchema.default as string ?? ''"
            rows="4"
            class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono resize-y"
            @input="onField(key, ($event.target as HTMLTextAreaElement).value)"
          />

          <!-- number -->
          <input
            v-else-if="fieldSchema.type === 'number'"
            :value="localProps[key] as number ?? fieldSchema.default as number ?? 0"
            type="number"
            class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            @input="onField(key, Number(($event.target as HTMLInputElement).value))"
          />

          <!-- boolean -->
          <label v-else-if="fieldSchema.type === 'boolean'" class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="localProps[key] as boolean ?? fieldSchema.default as boolean ?? false"
              class="w-4 h-4 rounded text-indigo-600"
              @change="onField(key, ($event.target as HTMLInputElement).checked)"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Enabled</span>
          </label>

          <!-- select -->
          <select
            v-else-if="fieldSchema.type === 'select'"
            :value="localProps[key] as string ?? fieldSchema.default as string ?? ''"
            class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            @change="onField(key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in getSelectOptions(fieldSchema)" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- color -->
          <div v-else-if="fieldSchema.type === 'color'" class="flex items-center gap-2">
            <input
              type="color"
              :value="localProps[key] as string ?? fieldSchema.default as string ?? '#6366f1'"
              class="w-10 h-10 rounded border cursor-pointer"
              @input="onField(key, ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="localProps[key] as string ?? fieldSchema.default as string ?? ''"
              type="text"
              class="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono"
              @input="onField(key, ($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- image — URL input with preview -->
          <div v-else-if="fieldSchema.type === 'image'" class="space-y-2">
            <input
              :value="localProps[key] as string ?? ''"
              type="url"
              placeholder="https://… or /uploads/…"
              class="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              @input="onField(key, ($event.target as HTMLInputElement).value)"
            />
            <img
              v-if="localProps[key]"
              :src="localProps[key] as string"
              class="h-24 rounded-lg object-cover border dark:border-gray-600"
            />
          </div>
        </div>

        <div v-if="Object.keys(schema).length === 0" class="text-sm text-gray-400 italic">
          No editable settings for this block type.
        </div>
      </div>
      <div v-else class="px-4 py-2 text-xs text-gray-400 italic">Block hidden — click eye icon to show</div>
    </div>
  </div>
</template>
