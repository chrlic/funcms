<script setup lang="ts">
import type { FieldResolution } from '~/types/session'

const session = useSessionStore()
const router = useRouter()

const publishing = ref(false)
const showConflicts = ref(false)
const diffCount = ref(0)

// Poll diff count while session is active (client-only)
const { pause, resume } = useIntervalFn(async () => {
  if (!session.isActive) return
  try {
    const data = await $fetch<{ data: unknown[] }>(`/api/sessions/${session.sessionId}/diff`)
    diffCount.value = data.data.length
  } catch { /* session may have been abandoned */ }
}, 10_000, { immediate: false })

onMounted(() => {
  if (session.isActive) resume()
})

watch(() => session.isActive, (active) => {
  active ? resume() : pause()
})

async function startSession() {
  await session.openSession()
  diffCount.value = 0
}

async function publish() {
  if (diffCount.value === 0 && !session.isDirty && !session.hasConflicts) return
  publishing.value = true
  try {
    const result = await session.publish()
    if (result.status === 'conflict') {
      showConflicts.value = true
    } else {
      // Success — reload page to show merged content
      router.go(0)
    }
  } finally {
    publishing.value = false
  }
}

async function onResolved(resolutions: FieldResolution[]) {
  showConflicts.value = false
  publishing.value = true
  try {
    const result = await session.resolve(resolutions)
    if (result.status === 'conflict') {
      showConflicts.value = true
    } else {
      router.go(0)
    }
  } finally {
    publishing.value = false
  }
}

async function abandon() {
  if (!confirm('Discard all changes in this session?')) return
  await session.abandon()
  router.go(0)
}
</script>

<template>
  <div>
    <!-- No session — offer to start one -->
    <div v-if="!session.currentSession" class="flex items-center gap-2">
      <button
        @click="startSession"
        class="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        <Icon name="i-heroicons-pencil-square" class="w-4 h-4" />
        Start editing
      </button>
    </div>

    <!-- Active session toolbar -->
    <div v-else class="flex items-center gap-3">

      <!-- Branch indicator -->
      <div class="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
        <Icon name="i-heroicons-code-bracket" class="w-3.5 h-3.5 text-indigo-500" />
        <span class="text-xs font-mono text-indigo-700 dark:text-indigo-300">
          {{ session.branch?.split('/').slice(1).join('/') }}
        </span>
      </div>

      <!-- Diff count badge -->
      <span v-if="diffCount > 0"
        class="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
        {{ diffCount }} change{{ diffCount !== 1 ? 's' : '' }}
      </span>

      <!-- Conflict badge -->
      <span v-if="session.hasConflicts"
        class="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full cursor-pointer"
        @click="showConflicts = true"
      >
        ⚠ conflicts
      </span>

      <!-- Publish button -->
      <button
        @click="publish"
        :disabled="publishing || (diffCount === 0 && !session.isDirty && !session.hasConflicts)"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-40"
      >
        <Icon v-if="publishing" name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
        <Icon v-else name="i-heroicons-arrow-up-on-square" class="w-4 h-4" />
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>

      <!-- Abandon -->
      <button
        @click="abandon"
        class="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-400 hover:text-red-500 transition"
        title="Discard changes"
      >
        <Icon name="i-heroicons-trash" class="w-4 h-4" />
      </button>
    </div>

    <!-- Conflict resolver modal -->
    <ConflictResolver
      v-if="showConflicts && session.conflicts.length > 0"
      :conflicts="session.conflicts"
      @resolved="onResolved"
      @cancelled="showConflicts = false"
    />
  </div>
</template>
