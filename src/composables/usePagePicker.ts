export function usePagePicker() {
  const pages = ref<{ _id: string; title: string; slug: string }[]>([])
  const loaded = ref(false)

  async function load() {
    if (loaded.value) return
    const res = await $fetch<{ data: typeof pages.value }>('/api/pages')
    pages.value = res.data.filter(p => p.slug && p.status === 'published' || p.slug)
    loaded.value = true
  }

  return { pages, load }
}
