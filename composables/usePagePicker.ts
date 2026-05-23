import type { Page } from '~/types'

type PagePickerItem = Pick<Page, '_id' | 'title' | 'slug' | 'status' | 'locales'>

export function usePagePicker() {
  const pages = ref<PagePickerItem[]>([])
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    const res = await $fetch<{ data: Page[] }>('/api/pages')
    pages.value = res.data.filter(p => !!p.slug)
    loaded.value = true
  }

  return { pages, load }
}
