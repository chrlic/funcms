<script setup lang="ts">
import type { SiteMapData, SiteMapNode } from '~/server/api/sitemap'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', ssr: false })

const container = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref('')
const data = ref<SiteMapData | null>(null)

const showExternal = ref(false)
const filterLocale = ref('')

let cy: import('cytoscape').Core | null = null
let dagreRegistered = false

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ data: SiteMapData }>('/api/sitemap')
    data.value = res.data
    await nextTick()
    renderGraph()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load site map'
  } finally {
    loading.value = false
  }
}

async function renderGraph() {
  if (!container.value || !data.value) return

  const cytoscape = (await import('cytoscape')).default
  if (!dagreRegistered) {
    // @ts-expect-error no bundled types
    const dagre = (await import('cytoscape-dagre')).default
    cytoscape.use(dagre)
    dagreRegistered = true
  }

  const locale = filterLocale.value
  const defaultLocale = data.value.defaultLocale

  function pagePassesLocale(n: SiteMapNode): boolean {
    if (locale === '') return true
    if (locale === '__default__') return n.status === 'published'
    return !!(n.locales ?? []).includes(locale)
  }

  // ── Filter nodes (no blocks) ──────────────────────────────────────────────
  const filteredNodes = data.value.nodes.filter(n => {
    if (n.type === 'block') return false
    if (!showExternal.value && n.type === 'external') return false
    if (locale === '') return true
    if (n.type === 'nav-root' || n.type === 'footer-root') {
      if (locale === '__default__') return n.navSection === '' || n.navSection === 'footer'
      return n.navSection === locale || n.navSection === '' || n.navSection === 'footer'
    }
    if (n.type === 'nav-item') {
      if (locale === '__default__') return n.navSection === '' || n.navSection === 'footer'
      return n.navSection === locale || n.navSection === '' || n.navSection === 'footer'
    }
    if (n.type === 'page') return pagePassesLocale(n)
    return true
  })

  const nodeIds = new Set(filteredNodes.map(n => n.id))

  // ── Filter edges ──────────────────────────────────────────────────────────
  const filteredEdges = data.value.edges.filter(e => {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) return false
    // block-sourced edges — drop entirely (no blocks rendered)
    if (e.type === 'link' || e.type === 'locale-link') return false
    if (locale === '') return true
    if (e.type === 'nav-tree') return true
    if (e.type === 'nav-link') {
      if (locale === '__default__') return e.locale === '' || e.locale === 'footer'
      return e.locale === locale || e.locale === '' || e.locale === 'footer'
    }
    if (locale === '__default__') return e.locale === '' || e.locale === defaultLocale
    return e.locale === '' || e.locale === locale
  })

  // ── Layout via dagre ──────────────────────────────────────────────────────
  if (cy) { cy.destroy(); cy = null }

  cy = cytoscape({
    container: container.value,
    elements: [
      ...filteredNodes.map(n => ({
        data: {
          id: n.id,
          label: n.label,
          nodeType: n.type,
          status: n.status ?? '',
          localeCount: (n.locales ?? []).length,
          navSection: n.navSection ?? '',
          url: n.type === 'external' ? n.id.replace(/^ext:/, '') : '',
          slug: n.slug ?? '',
        },
      })),
      ...filteredEdges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          edgeType: e.type,
          label: e.type === 'nav-link' ? (e.label ?? '') : (e.type === 'page-locale-link' ? (e.locale ?? '') : ''),
        },
      })),
    ],
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '11px',
          'text-wrap': 'wrap',
          'text-max-width': '130px',
          'padding': '10px',
          'border-width': 2,
          'background-color': '#e0e7ff',
          'border-color': '#6366f1',
          'color': '#1e1b4b',
          'shape': 'round-rectangle',
          'min-width': 80,
          'min-height': 32,
        },
      },
      {
        selector: 'node[nodeType = "nav-root"]',
        style: {
          'background-color': '#1e1b4b',
          'border-color': '#312e81',
          'color': '#fff',
          'font-weight': 'bold',
          'font-size': '12px',
        },
      },
      {
        selector: 'node[nodeType = "footer-root"]',
        style: {
          'background-color': '#4a1d96',
          'border-color': '#6d28d9',
          'color': '#fff',
          'font-weight': 'bold',
          'font-size': '12px',
        },
      },
      {
        selector: 'node[nodeType = "nav-item"]',
        style: {
          'background-color': '#4338ca',
          'border-color': '#3730a3',
          'color': '#fff',
          'font-size': '10px',
        },
      },
      {
        selector: 'node[nodeType = "external"]',
        style: {
          'background-color': '#fef9c3',
          'border-color': '#ca8a04',
          'color': '#713f12',
          'shape': 'diamond',
          'font-size': '9px',
          'text-max-width': '100px',
        },
      },
      {
        selector: 'node[status = "published"]',
        style: {
          'background-color': '#dcfce7',
          'border-color': '#16a34a',
          'color': '#14532d',
        },
      },
      {
        selector: 'node[status = "draft"]',
        style: {
          'background-color': '#fef3c7',
          'border-color': '#d97706',
          'color': '#78350f',
        },
      },
      {
        selector: ':selected',
        style: { 'border-color': '#ef4444', 'border-width': 3 },
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': '#94a3b8',
          'target-arrow-color': '#94a3b8',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'font-size': '9px',
          'label': 'data(label)',
          'text-background-color': '#fff',
          'text-background-opacity': 0.85,
          'text-background-padding': '2px',
          'color': '#64748b',
          'edge-text-rotation': 'autorotate',
          'arrow-scale': 0.8,
        },
      },
      {
        selector: 'edge[edgeType = "nav-tree"]',
        style: {
          'line-color': '#a5b4fc',
          'target-arrow-color': '#a5b4fc',
          'width': 1,
          'line-style': 'dotted',
          'target-arrow-shape': 'none',
        },
      },
      {
        selector: 'edge[edgeType = "nav-link"]',
        style: {
          'line-color': '#6366f1',
          'target-arrow-color': '#6366f1',
          'width': 2.5,
        },
      },
      {
        selector: 'edge[edgeType = "page-link"]',
        style: {
          'line-color': '#94a3b8',
          'target-arrow-color': '#94a3b8',
        },
      },
      {
        selector: 'edge[edgeType = "page-locale-link"]',
        style: {
          'line-color': '#14b8a6',
          'target-arrow-color': '#14b8a6',
          'line-style': 'dashed',
        },
      },
    ],
    layout: {
      name: 'dagre',
      rankDir: 'LR',
      nodeSep: 60,
      rankSep: 180,
      padding: 60,
    } as object,
    wheelSensitivity: 0.3,
  })

  cy.fit(undefined, 40)

  cy.on('tap', 'node', (e) => {
    const d = e.target.data() as {
      id: string; label: string; nodeType: string; status: string
      localeCount: number; url: string; slug: string; navSection: string
    }
    selectedNode.value = d
  })
  cy.on('tap', (e) => { if (e.target === cy) selectedNode.value = null })
}

const selectedNode = ref<{
  id: string; label: string; nodeType: string; status: string
  localeCount: number; url: string; slug: string; navSection: string
} | null>(null)

const localeOptions = computed(() => {
  if (!data.value) return []
  const out: Array<{ value: string; label: string }> = [
    { value: '', label: 'All' },
    { value: '__default__', label: data.value.defaultLocale ? `Default (${data.value.defaultLocale})` : 'Default' },
  ]
  for (const code of data.value.localeCodes) {
    out.push({ value: code, label: code.toUpperCase() })
  }
  return out
})

watch([showExternal, filterLocale], () => { if (data.value) renderGraph() })

onMounted(() => loadData())
onUnmounted(() => { if (cy) cy.destroy() })
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-130px)]">
    <div class="flex flex-wrap items-center gap-3 mb-3">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white mr-auto">Site Map</h1>

      <div class="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5">
        <button
          v-for="opt in localeOptions"
          :key="opt.value"
          @click="filterLocale = opt.value"
          class="px-2.5 py-1 rounded-md text-xs font-medium transition"
          :class="filterLocale === opt.value
            ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'"
        >{{ opt.label }}</button>
      </div>

      <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <input type="checkbox" v-model="showExternal" class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
        External
      </label>

      <button @click="loadData" :disabled="loading"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">
        <svg v-if="loading" class="w-3.5 h-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div class="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#dcfce7] border border-[#16a34a] inline-block"></span> Published page</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#fef3c7] border border-[#d97706] inline-block"></span> Draft page</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#1e1b4b] inline-block"></span> Nav root</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#4a1d96] inline-block"></span> Footer root</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#4338ca] inline-block"></span> Nav item</span>
      <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#fef9c3] border border-[#ca8a04] inline-block"></span> External</span>
      <span class="flex items-center gap-3 ml-2">
        <span class="flex items-center gap-1.5"><span class="w-4 h-0.5 bg-indigo-500 inline-block"></span> Nav link</span>
        <span class="flex items-center gap-1.5"><span class="w-4 h-0.5 bg-[#94a3b8] inline-block"></span> Page link</span>
        <span class="flex items-center gap-1.5"><span class="w-4 h-0 border-t-2 border-dashed border-teal-500 inline-block" style="width:16px"></span> Locale link</span>
        <span class="flex items-center gap-1.5"><span class="w-4 h-0 border-t border-dotted border-indigo-300 inline-block" style="width:16px"></span> Nav tree</span>
      </span>
    </div>

    <div v-if="error" class="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error }}</div>

    <div class="relative flex-1 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div ref="container" class="w-full h-full" />

      <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-800/70">
        <svg class="w-8 h-8 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>

      <Transition name="slide-up">
        <div v-if="selectedNode"
          class="absolute bottom-4 left-4 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[220px] max-w-xs">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="font-semibold text-gray-900 dark:text-white text-sm truncate">{{ selectedNode.label }}</p>
              <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
                <span v-if="selectedNode.nodeType === 'page'"
                  :class="selectedNode.status === 'published' ? 'text-green-700 bg-green-50' : 'text-yellow-700 bg-yellow-50'"
                  class="px-1.5 py-0.5 rounded font-medium">{{ selectedNode.status }}</span>
                <span v-if="selectedNode.localeCount > 0" class="text-gray-400">
                  {{ selectedNode.localeCount }} locale{{ selectedNode.localeCount === 1 ? '' : 's' }}
                </span>
                <span v-if="selectedNode.slug" class="text-gray-400 font-mono">{{ selectedNode.slug }}</span>
                <span v-if="selectedNode.nodeType === 'external'" class="text-yellow-700">External URL</span>
                <span v-if="selectedNode.nodeType === 'nav-item' && selectedNode.navSection"
                  class="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{{ selectedNode.navSection }} nav</span>
              </div>
            </div>
            <button @click="selectedNode = null" class="text-gray-400 hover:text-gray-600 shrink-0">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
              </svg>
            </button>
          </div>
          <NuxtLink v-if="selectedNode.nodeType === 'page'" :to="`/admin/pages/${selectedNode.id}`"
            class="mt-2 block text-xs text-indigo-600 hover:underline">Edit page →</NuxtLink>
          <NuxtLink v-if="selectedNode.nodeType === 'footer-root'" to="/admin/settings"
            class="mt-2 block text-xs text-indigo-600 hover:underline">Edit footer →</NuxtLink>
          <a v-if="selectedNode.nodeType === 'external'" :href="selectedNode.url" target="_blank" rel="noopener noreferrer"
            class="mt-2 block text-xs text-indigo-600 hover:underline truncate">{{ selectedNode.url }} ↗</a>
        </div>
      </Transition>
    </div>

    <p class="text-xs text-gray-400 mt-2 text-center">Scroll to zoom · drag to pan · click a node for details</p>
  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(6px); }
</style>
