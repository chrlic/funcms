<script setup lang="ts">
import type { ConflictRecord, FieldResolution } from '~/types/session'

const props = defineProps<{
  conflicts: ConflictRecord[]
}>()

const emit = defineEmits<{
  resolved: [resolutions: FieldResolution[]]
  cancelled: []
}>()

// Track chosen value per conflict: "recordId:field" → 'ours' | 'theirs' | custom
type Choice = 'ours' | 'theirs'
const choices = ref<Record<string, Choice>>({})
const customValues = ref<Record<string, string>>({})

// Initialize all choices to 'ours' (draft branch = current editor's work)
watchEffect(() => {
  for (const conflict of props.conflicts) {
    for (const field of conflict.fields) {
      const key = `${conflict.recordId}:${field.field}`
      if (!choices.value[key]) {
        choices.value[key] = 'ours'
      }
    }
  }
})

function choiceKey(recordId: string, field: string) {
  return `${recordId}:${field}`
}

function setChoice(recordId: string, field: string, choice: Choice) {
  choices.value[choiceKey(recordId, field)] = choice
}

function getChosenValue(conflict: ConflictRecord, field: { field: string; ours: unknown; theirs: unknown }) {
  const key = choiceKey(conflict.recordId, field.field)
  return choices.value[key] === 'ours' ? field.ours : field.theirs
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(empty)'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function submit() {
  const resolutions: FieldResolution[] = props.conflicts.map((conflict) => {
    const resolved: Record<string, unknown> = { ...conflict.oursFull }

    for (const field of conflict.fields) {
      const key = choiceKey(conflict.recordId, field.field)
      resolved[field.field] = choices.value[key] === 'ours' ? field.ours : field.theirs
    }

    return {
      collection: conflict.collection,
      recordId: conflict.recordId,
      resolutions: resolved,
    }
  })

  emit('resolved', resolutions)
}

const totalFields = computed(() =>
  props.conflicts.reduce((acc, c) => acc + c.fields.length, 0)
)
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="text-red-500">⚠</span> Merge Conflicts
          </h2>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ conflicts.length }} record(s) have {{ totalFields }} conflicting field(s).
            Choose which version to keep for each.
          </p>
        </div>
        <button @click="emit('cancelled')" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
      </div>

      <!-- Conflict list -->
      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-8">
        <div v-for="conflict in conflicts" :key="conflict.recordId" class="space-y-4">

          <!-- Record header -->
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <span class="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
              {{ conflict.collection }}/{{ conflict.recordId.slice(0, 8) }}
            </span>
            <span>·</span>
            <span>{{ conflict.fields.length }} field(s) in conflict</span>
          </div>

          <!-- Field-level conflicts -->
          <div v-for="field in conflict.fields" :key="field.field"
            class="border dark:border-gray-600 rounded-xl overflow-hidden">

            <div class="bg-gray-50 dark:bg-gray-700 px-4 py-2 flex items-center justify-between">
              <span class="font-semibold text-sm text-gray-800 dark:text-gray-200">
                {{ field.field }}
              </span>
              <span class="text-xs text-gray-400">
                Base: {{ formatValue(field.base).slice(0, 60) }}
              </span>
            </div>

            <div class="grid grid-cols-2 divide-x dark:divide-gray-600">

              <!-- Ours (draft / this editor) -->
              <button
                class="text-left p-4 transition"
                :class="choices[choiceKey(conflict.recordId, field.field)] === 'ours'
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-inset ring-indigo-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'"
                @click="setChoice(conflict.recordId, field.field, 'ours')"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-2 h-2 rounded-full bg-indigo-500" />
                  <span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    Your version (draft)
                  </span>
                  <span v-if="choices[choiceKey(conflict.recordId, field.field)] === 'ours'"
                    class="ml-auto text-indigo-600 text-xs font-bold">✓ Selected</span>
                </div>
                <pre class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono bg-white dark:bg-gray-800 rounded p-2 text-xs">{{ formatValue(field.ours) }}</pre>
              </button>

              <!-- Theirs (already merged to main) -->
              <button
                class="text-left p-4 transition"
                :class="choices[choiceKey(conflict.recordId, field.field)] === 'theirs'
                  ? 'bg-amber-50 dark:bg-amber-900/30 ring-2 ring-inset ring-amber-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'"
                @click="setChoice(conflict.recordId, field.field, 'theirs')"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="w-2 h-2 rounded-full bg-amber-500" />
                  <span class="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    Published version (main)
                  </span>
                  <span v-if="choices[choiceKey(conflict.recordId, field.field)] === 'theirs'"
                    class="ml-auto text-amber-600 text-xs font-bold">✓ Selected</span>
                </div>
                <pre class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono bg-white dark:bg-gray-800 rounded p-2 text-xs">{{ formatValue(field.theirs) }}</pre>
              </button>

            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
        <button
          @click="emit('cancelled')"
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition"
        >
          Cancel — keep editing
        </button>
        <button
          @click="submit"
          class="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          Apply resolutions & publish
        </button>
      </div>

    </div>
  </div>
</template>
