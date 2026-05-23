<script setup lang="ts">
import type { AuditResult, AuditIssue, IssueSeverity } from '~/server/api/audit/index'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const result = ref<AuditResult | null>(null)
const running = ref(false)
const error = ref('')
const probeExternal = ref(false)

const filterSeverity = ref<IssueSeverity | 'all'>('all')
const filterCategory = ref('all')
const search = ref('')

async function runAudit() {
  running.value = true
  error.value = ''
  try {
    const query = probeExternal.value ? '?probeExternal=1' : ''
    const res = await $fetch<{ data: AuditResult }>(`/api/audit${query}`)
    result.value = res.data
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Audit failed'
  } finally {
    running.value = false
  }
}

const categories = computed(() => {
  if (!result.value) return []
  const cats = new Set(result.value.issues.map(i => i.category))
  return ['all', ...cats]
})

const filteredIssues = computed(() => {
  if (!result.value) return []
  return result.value.issues.filter(issue => {
    if (filterSeverity.value !== 'all' && issue.severity !== filterSeverity.value) return false
    if (filterCategory.value !== 'all' && issue.category !== filterCategory.value) return false
    if (search.value) {
      const q = search.value.toLowerCase()
      if (!issue.message.toLowerCase().includes(q) &&
          !(issue.pageTitle ?? '').toLowerCase().includes(q) &&
          !(issue.pageSlug ?? '').toLowerCase().includes(q)) return false
    }
    return true
  })
})

const counts = computed(() => {
  if (!result.value) return { error: 0, warning: 0, info: 0 }
  return result.value.issues.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] ?? 0) + 1
    return acc
  }, {} as Record<IssueSeverity, number>)
})

const severityConfig: Record<IssueSeverity, { dot: string; badge: string; label: string }> = {
  error:   { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-700 ring-red-200',       label: 'Error' },
  warning: { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200', label: 'Warning' },
  info:    { dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-blue-200',    label: 'Info' },
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Site Audit</h1>
        <p class="text-sm text-gray-500 mt-0.5">Check for broken links, orphaned pages, SEO issues, and more.</p>
      </div>
      <button
        @click="runAudit"
        :disabled="running"
        class="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        <svg v-if="running" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd"/>
        </svg>
        {{ running ? 'Running…' : 'Run Audit' }}
      </button>
    </div>

    <!-- Options -->
    <div class="mb-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="probeExternal" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        Probe external links (slower — sends HEAD requests to external URLs)
      </label>
    </div>

    <div v-if="error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Summary cards -->
    <div v-if="result" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 text-center">
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ result.pages }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Pages</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 text-center cursor-pointer"
           :class="filterSeverity === 'error' ? 'ring-2 ring-red-400' : ''"
           @click="filterSeverity = filterSeverity === 'error' ? 'all' : 'error'">
        <p class="text-2xl font-bold text-red-600">{{ counts.error ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Errors</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 text-center cursor-pointer"
           :class="filterSeverity === 'warning' ? 'ring-2 ring-yellow-400' : ''"
           @click="filterSeverity = filterSeverity === 'warning' ? 'all' : 'warning'">
        <p class="text-2xl font-bold text-yellow-600">{{ counts.warning ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Warnings</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 p-4 text-center cursor-pointer"
           :class="filterSeverity === 'info' ? 'ring-2 ring-blue-400' : ''"
           @click="filterSeverity = filterSeverity === 'info' ? 'all' : 'info'">
        <p class="text-2xl font-bold text-blue-600">{{ counts.info ?? 0 }}</p>
        <p class="text-xs text-gray-500 mt-0.5">Info</p>
      </div>
    </div>

    <!-- External links note -->
    <div v-if="result && !result.externalProbed && result.externalLinks > 0"
         class="mb-4 rounded-lg bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
      <svg class="w-4 h-4 shrink-0 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd"/>
      </svg>
      {{ result.externalLinks }} external link{{ result.externalLinks === 1 ? '' : 's' }} were not probed. Enable "Probe external links" and re-run to check them.
    </div>

    <!-- Filters -->
    <div v-if="result" class="flex flex-wrap gap-2 mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="Search issues…"
        class="flex-1 min-w-[160px] text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <select
        v-model="filterCategory"
        class="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat === 'all' ? 'All categories' : cat }}</option>
      </select>
    </div>

    <!-- Issue list -->
    <div v-if="result">
      <div v-if="filteredIssues.length === 0" class="text-center py-12 text-sm text-gray-400">
        <svg class="w-8 h-8 mx-auto mb-2 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/>
        </svg>
        No issues found{{ filterSeverity !== 'all' || filterCategory !== 'all' || search ? ' matching filters' : '' }}
      </div>

      <div v-else class="rounded-xl border dark:border-gray-700 overflow-hidden divide-y dark:divide-gray-700 bg-white dark:bg-gray-800">
        <div
          v-for="issue in filteredIssues"
          :key="issue.message + issue.pageId + issue.locale"
          class="px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-750"
        >
          <!-- Severity dot -->
          <div class="mt-1.5 shrink-0">
            <span class="inline-block w-2 h-2 rounded-full" :class="severityConfig[issue.severity].dot" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-0.5">
              <span class="text-xs font-medium px-1.5 py-0.5 rounded ring-1" :class="severityConfig[issue.severity].badge">
                {{ issue.category }}
              </span>
              <span v-if="issue.locale" class="text-xs bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 px-1.5 py-0.5 rounded">
                {{ issue.locale }}
              </span>
            </div>
            <p class="text-sm text-gray-800 dark:text-gray-200">{{ issue.message }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <NuxtLink
                v-if="issue.pageId"
                :to="`/admin/pages/${issue.pageId}${issue.locale ? `?locale=${issue.locale}` : ''}`"
                class="text-indigo-600 hover:underline"
              >
                Edit page →
              </NuxtLink>
              <a
                v-if="issue.url && (issue.url.startsWith('http://') || issue.url.startsWith('https://'))"
                :href="issue.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-indigo-600 hover:underline"
              >
                {{ issue.url }} ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      <p class="mt-3 text-xs text-gray-400 text-right">
        Ran {{ new Date(result.ranAt).toLocaleString() }} · {{ result.durationMs }}ms
        · showing {{ filteredIssues.length }} of {{ result.issues.length }} issues
      </p>
    </div>

    <!-- Empty state before first run -->
    <div v-if="!result && !running" class="text-center py-16 text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-3 text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd"/>
      </svg>
      <p class="text-sm">Click "Run Audit" to check your site for issues.</p>
    </div>
  </div>
</template>
