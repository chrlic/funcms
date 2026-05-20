<script setup lang="ts">
import type { FieldResolution } from '~/types/session'

const session = useSessionStore()
const router = useRouter()

const publishing = ref(false)
const showConflicts = ref(false)
const diffCount = ref(0)

// Poll diff count while session is active
const { pause, resume } = useIntervalFn(async () => {
  if (!session.isActive) return
  try {
    const data = await $fetch<{ data: unknown[] }>(`/api/sessions/${session.sessionId}/diff`)
    diffCount.value = data.data.length
  } catch {
    // Session may be gone — clear stale state
    session.clearSession()
  }
}, 10_000, { immediate: false })

onMounted(async () => {
  if (session.currentSession) {
    // Validate persisted session still exists on server
    try {
      await $fetch(`/api/sessions/${session.currentSession.id}`)
      if (session.isActive) resume()
    } catch {
      session.clearSession()
    }
  }
})

watch(() => session.isActive, (active) => {
  if (active) {
    resume()
    // Fetch diff immediately so Publish enables without waiting for first poll tick
    $fetch<{ data: unknown[] }>(`/api/sessions/${session.sessionId}/diff`)
      .then(d => { diffCount.value = d.data.length })
      .catch(() => {})
  } else {
    pause()
  }
})

watch(() => session.isDirty, async (dirty) => {
  if (dirty && session.sessionId) {
    try {
      const data = await $fetch<{ data: unknown[] }>(`/api/sessions/${session.sessionId}/diff`)
      diffCount.value = data.data.length
    } catch { /* ignore */ }
  }
})

async function publish() {
  publishing.value = true
  try {
    const result = await session.publish()
    if (result.status === 'conflict') {
      showConflicts.value = true
    } else {
      diffCount.value = 0
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
  if (!confirm('Discard all unpublished changes?')) return
  await session.abandon()
  diffCount.value = 0
  router.go(0)
}

const hasChanges = computed(() => diffCount.value > 0 || session.isDirty || session.hasConflicts)
</script>

<template>
  <div class="flex items-center gap-3">

    <template v-if="session.currentSession">
      <!-- Draft branch badge -->
      <div class="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
        <!-- code-bracket -->
        <svg class="w-3.5 h-3.5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd"/>
        </svg>
        <span class="text-xs font-mono text-indigo-700 dark:text-indigo-300">
          {{ session.branch?.split('/').slice(1).join('/') }}
        </span>
      </div>

      <!-- Change count -->
      <span v-if="diffCount > 0"
        class="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
        {{ diffCount }} change{{ diffCount !== 1 ? 's' : '' }}
      </span>

      <!-- Conflict badge -->
      <span v-if="session.hasConflicts"
        class="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full cursor-pointer"
        @click="showConflicts = true">
        ⚠ conflicts
      </span>

      <!-- Publish -->
      <button
        @click="publish"
        :disabled="publishing || !hasChanges"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-40"
      >
        <!-- spinner -->
        <svg v-if="publishing" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <!-- arrow-up-on-square -->
        <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.75 7h-3v5.296l1.943-2.048a.75.75 0 0 1 1.114 1.004l-3.25 3.5a.75.75 0 0 1-1.114 0l-3.25-3.5a.75.75 0 1 1 1.114-1.004l1.943 2.048V7h1.5V1.75a.75.75 0 0 0-1.5 0V7h-3A2.25 2.25 0 0 0 4 9.25v7.5A2.25 2.25 0 0 0 6.25 19h7.5A2.25 2.25 0 0 0 16 16.75v-7.5A2.25 2.25 0 0 0 13.75 7Z"/>
        </svg>
        {{ publishing ? 'Publishing…' : 'Publish' }}
      </button>

      <!-- Abandon -->
      <button
        @click="abandon"
        class="p-1.5 text-gray-400 hover:text-red-500 transition"
        title="Discard all changes"
      >
        <!-- trash -->
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd"/>
        </svg>
      </button>
    </template>

    <!-- No session — nothing to show, Save will auto-start one -->
    <span v-else class="text-xs text-gray-400">No draft</span>

  </div>

  <!-- Conflict resolver modal -->
  <ConflictResolver
    v-if="showConflicts && session.conflicts.length > 0"
    :conflicts="session.conflicts"
    @resolved="onResolved"
    @cancelled="showConflicts = false"
  />
</template>
