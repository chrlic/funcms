<script setup lang="ts">
import staticBlockRegistry from '~/components/blocks/index'
import type { Component } from 'vue'
import type { FooterColumn, FooterColWidth, SiteSettings } from '~/types'

const { registry: customRegistry } = useCustomBlocks()

const { data: settingsData } = await useFetch<{ data: SiteSettings }>('/api/settings', {
  key: 'site-settings',
  default: () => ({ data: { siteName: 'FunCMS', nav: [], socialLinks: {}, customCss: '', headScripts: '' } }),
})

const settings = computed(() => settingsData.value?.data ?? null)
const { currentLocale } = useCurrentLocale(settings)

const columns = computed<FooterColumn[]>(() => {
  const s = settings.value
  if (!s) return []
  if (currentLocale.value && s.footerLocales?.[currentLocale.value]?.length) {
    return s.footerLocales[currentLocale.value]
  }
  return s.footerColumns ?? []
})

const paddingClass = computed(() => {
  const map: Record<string, string> = {
    none: 'py-0',
    xs:   'py-2',
    sm:   'py-4',
    md:   'py-8',
    lg:   'py-12',
    xl:   'py-20',
  }
  return map[settings.value?.footerPadding ?? 'md'] ?? 'py-8'
})

// Tailwind width map — must be full literal strings (no dynamic construction)
const widthClass: Record<FooterColWidth, string> = {
  '1/4':  'w-1/4',
  '1/3':  'w-1/3',
  '1/2':  'w-1/2',
  '2/3':  'w-2/3',
  '3/4':  'w-3/4',
  'full': 'w-full',
}

// Build Tailwind visibility classes from showFrom / hideFrom
function visibilityClasses(col: FooterColumn): string {
  const classes: string[] = []

  // Start hidden or visible at xs
  if (col.showFrom === 'xs') {
    classes.push('block')
  } else {
    classes.push('hidden')
    // Show from the specified breakpoint
    const showMap = { sm: 'sm:block', md: 'md:block', lg: 'lg:block', xl: 'xl:block' }
    classes.push(showMap[col.showFrom] ?? 'block')
  }

  // Hide from the specified breakpoint (if set)
  if (col.hideFrom) {
    const hideMap = { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden', xl: 'xl:hidden' }
    classes.push(hideMap[col.hideFrom] ?? '')
  }

  return classes.filter(Boolean).join(' ')
}
</script>

<template>
  <footer v-if="columns.length" class="w-full border-t border-[var(--color-border,#e5e7eb)] bg-[var(--color-surface,#fff)] dark:bg-[var(--color-surface,#1f2937)]">
    <div :class="['max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', paddingClass]">
      <div class="flex flex-wrap gap-y-8">
        <div
          v-for="col in columns"
          :key="col.id"
          :class="[widthClass[col.width] ?? 'w-full', visibilityClasses(col), 'px-4 min-w-0']"
        >
          <component
            :is="(staticBlockRegistry as Record<string, Component>)[col.block.type] ?? customRegistry[col.block.type]"
            v-bind="col.block.props"
          />
        </div>
      </div>
    </div>
  </footer>
</template>
