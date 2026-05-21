import * as vue from 'vue'
import type { Component } from 'vue'
import type { CustomBlockType } from '~/types'

// Module-level cache — survives across page navigations in the client SPA
const _clientCache = new Map<string, Component>()

function evalBlock(compiledJs: string, slug: string): Component | null {
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(`return ${compiledJs}`)() as (v: unknown, c: unknown) => Record<string, unknown>
    const component = factory(vue, {}) as Component
    return component
  } catch (err) {
    console.error(`[useCustomBlocks] Failed to eval block "${slug}":`, err)
    return null
  }
}

export function useCustomBlocks() {
  const { data, refresh } = useFetch<{ data: CustomBlockType[] }>('/api/block-types', {
    key: 'custom-block-types',
    default: () => ({ data: [] }),
  })

  const registry = computed<Record<string, Component>>(() => {
    const result: Record<string, Component> = {}

    for (const meta of data.value?.data ?? []) {
      if (_clientCache.has(meta.slug)) {
        result[meta.slug] = _clientCache.get(meta.slug)!
        continue
      }

      const component = evalBlock(meta.compiledJs, meta.slug)
      if (component) {
        _clientCache.set(meta.slug, component)
        result[meta.slug] = component
      }
    }

    return result
  })

  // Call after creating/updating a block type to bust the fetch cache and re-eval
  async function invalidate(slug?: string) {
    if (slug) _clientCache.delete(slug)
    await refresh()
  }

  return { registry, metas: computed(() => data.value?.data ?? []), invalidate }
}
