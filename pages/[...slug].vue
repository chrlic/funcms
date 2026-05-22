<script setup lang="ts">
import staticBlockRegistry from '~/components/blocks/index'
import LayoutFullWidth from '~/components/LayoutFullWidth.vue'
import LayoutSidebarLeft from '~/components/LayoutSidebarLeft.vue'
import LayoutSidebarRight from '~/components/LayoutSidebarRight.vue'
import LayoutLanding from '~/components/LayoutLanding.vue'
import LayoutBlank from '~/components/LayoutBlank.vue'
import type { Component } from 'vue'
import type { Page, Block, SiteSettings } from '~/types'

const { registry: customRegistry } = useCustomBlocks()

const layoutMap: Record<string, Component> = {
  'full-width': LayoutFullWidth,
  'sidebar-left': LayoutSidebarLeft,
  'sidebar-right': LayoutSidebarRight,
  'landing': LayoutLanding,
  'blank': LayoutBlank,
}

// Reuses the cached fetch from SiteNav — no extra request
const { data: settingsData } = await useFetch<{ data: SiteSettings }>('/api/settings', {
  key: 'site-settings',
  default: () => ({ data: { siteName: 'FunCMS', navStyle: 'topbar', nav: [], footer: [], logo: '', tagline: '', favicon: '', socialLinks: {}, customCss: '', headScripts: '' } }),
})
const navStyle = computed(() => settingsData.value?.data?.navStyle ?? 'topbar')
const isSidebar = computed(() => navStyle.value === 'sidebar-left')

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

// ─── Page background style ────────────────────────────────────────────────────

const pageStyle = computed(() => {
  const s = page.value?.style
  if (!s) return {}
  const style: Record<string, string> = {}
  if (s.bgColor) style.backgroundColor = s.bgColor
  if (s.bgImage) {
    style.backgroundImage = `url(${s.bgImage})`
    style.backgroundSize = s.bgSize ?? 'cover'
    style.backgroundPosition = s.bgPosition ?? 'center'
    style.backgroundRepeat = 'no-repeat'
    if (s.bgFixed) style.backgroundAttachment = 'fixed'
  }
  return style
})

const overlayOpacity = computed(() => {
  const o = page.value?.style?.bgOverlay
  return (o != null && o > 0) ? o / 100 : 0
})

// ─── Typography CSS variables ─────────────────────────────────────────────────

const { cssVars: typographyCss } = useTypography()

// ─── Custom CSS injection ─────────────────────────────────────────────────────

const allCss = computed(() => {
  const parts: string[] = []
  // Typography CSS custom properties (font families, named styles)
  if (typographyCss.value) parts.push(typographyCss.value)
  // Site-wide CSS from settings
  if (settingsData.value?.data?.customCss?.trim()) parts.push(settingsData.value.data.customCss)
  // Page-level CSS
  if (page.value?.style?.customCss?.trim()) parts.push(page.value.style.customCss)
  // Per-block CSS scoped to block wrapper
  for (const block of page.value?.blocks ?? []) {
    if (block.customCss?.trim()) {
      parts.push(`.block-${block.id} { ${block.customCss} }`)
    }
  }
  return parts.join('\n')
})

useHead({
  title: page.value?.meta?.title || page.value?.title || 'Not Found',
  meta: [
    { name: 'description', content: page.value?.meta?.description },
    { name: 'robots', content: page.value?.meta?.noIndex ? 'noindex' : 'index,follow' },
  ],
  style: computed(() => allCss.value ? [{ innerHTML: allCss.value }] : []),
})

// Set 404 status for truly missing pages (SSR-aware)
if (!page.value) {
  setResponseStatus(useRequestEvent()!, 404)
}
</script>

<template>
  <!-- Sidebar layout: nav and content sit side-by-side in a flex row -->
  <div v-if="isSidebar" class="min-h-screen flex flex-row">
    <SiteNav />
    <main class="flex-1 min-w-0 relative" :style="pageStyle">
      <!-- Background overlay -->
      <div v-if="overlayOpacity > 0" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: overlayOpacity }" />
      <div v-if="page" class="relative">
        <component :is="layoutMap[page.layout] ?? LayoutFullWidth" :blocks-by-slot="blocksBySlot" :sidebar-width="page.layoutOptions?.sidebarWidth">
          <template v-for="(blocks, slotName) in blocksBySlot" :key="slotName" #[slotName]>
            <div v-for="block in blocks" :key="block.id" :class="`block-${block.id}`">
              <component :is="(staticBlockRegistry as Record<string, Component>)[block.type] ?? customRegistry[block.type]" v-bind="block.props" />
            </div>
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

  <!-- Topbar layout: nav stacks above content -->
  <div v-else class="min-h-screen flex flex-col">
    <SiteNav />

    <main class="flex-1 min-w-0 relative" :style="pageStyle">
      <!-- Background overlay -->
      <div v-if="overlayOpacity > 0" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: overlayOpacity }" />
      <div v-if="page" class="relative">
        <component :is="layoutMap[page.layout] ?? LayoutFullWidth" :blocks-by-slot="blocksBySlot" :sidebar-width="page.layoutOptions?.sidebarWidth">
          <template v-for="(blocks, slotName) in blocksBySlot" :key="slotName" #[slotName]>
            <div v-for="block in blocks" :key="block.id" :class="`block-${block.id}`">
              <component :is="(staticBlockRegistry as Record<string, Component>)[block.type] ?? customRegistry[block.type]" v-bind="block.props" />
            </div>
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
