<script setup lang="ts">
import blockRegistry from '~/components/blocks/index'
import LayoutFullWidth from '~/components/LayoutFullWidth.vue'
import LayoutSidebarLeft from '~/components/LayoutSidebarLeft.vue'
import LayoutSidebarRight from '~/components/LayoutSidebarRight.vue'
import LayoutLanding from '~/components/LayoutLanding.vue'
import LayoutBlank from '~/components/LayoutBlank.vue'
import type { Component } from 'vue'
import type { Page, Block } from '~/types'

const layoutMap: Record<string, Component> = {
  'full-width': LayoutFullWidth,
  'sidebar-left': LayoutSidebarLeft,
  'sidebar-right': LayoutSidebarRight,
  'landing': LayoutLanding,
  'blank': LayoutBlank,
}


const route = useRoute()

const preview = route.query.preview === '1'
const headers = preview ? useRequestHeaders(['cookie']) : {}

const { data: pageData } = await useFetch<{ data: Page }>(
  '/api/pages/by-slug',
  {
    headers,
    credentials: preview ? 'include' : 'same-origin',
    query: { slug: route.path, ...(preview ? { preview: '1' } : {}) },
    key: `page-${route.path}-${preview}`,
    ignoreResponseError: true,
  }
)

const page = computed(() => pageData.value?.data ?? null)

const blocksBySlot = computed(() => {
  const slots: Record<string, Block[]> = {}
  for (const block of page.value?.blocks ?? []) {
    if (!block.visible) continue
    const slot = block.slot || 'main'
    if (!slots[slot]) slots[slot] = []
    slots[slot].push(block)
  }
  for (const key in slots) {
    slots[key].sort((a, b) => a.order - b.order)
  }
  return slots
})

useHead({
  title: page.value?.meta?.title || page.value?.title || 'Not Found',
  meta: [
    { name: 'description', content: page.value?.meta?.description },
    { name: 'robots', content: page.value?.meta?.noIndex ? 'noindex' : 'index,follow' },
  ],
})

// Set 404 status for truly missing pages (SSR-aware)
if (!page.value) {
  setResponseStatus(useRequestEvent()!, 404)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <SiteNav />

    <main class="flex-1">
      <div v-if="page">
        <component :is="layoutMap[page.layout] ?? LayoutFullWidth" :blocks-by-slot="blocksBySlot">
          <template v-for="(blocks, slotName) in blocksBySlot" :key="slotName" #[slotName]>
            <component
              :is="blockRegistry[block.type]"
              v-for="block in blocks"
              :key="block.id"
              v-bind="block.props"
            />
          </template>
        </component>
      </div>

      <div v-else class="flex items-center justify-center py-32">
        <div class="text-center">
          <p class="text-7xl font-bold text-gray-200 dark:text-gray-700 mb-4">404</p>
          <h1 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Page not found</h1>
          <p class="text-gray-500 mb-6">There's no published page at <code class="font-mono text-sm">{{ route.path }}</code>.</p>
          <NuxtLink to="/admin" class="text-indigo-600 hover:underline text-sm">Go to admin</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>
