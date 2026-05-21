/**
 * Server-side singleton that holds compiled custom block components.
 * Initialized at startup from the content repo; updated on every save.
 *
 * Both SSR (server render) and the public API endpoint read from this registry.
 */

import * as vue from 'vue'
import { evalCompiledBlock } from './custom-block-compiler'
import type { CustomBlockType } from '~/types'

type VueComponent = Record<string, unknown>

interface CustomBlockEntry {
  meta: CustomBlockType
  component: VueComponent
}

const registry = new Map<string, CustomBlockEntry>()

/** Standard FunCMS components injected into every custom block's scope */
const sharedComponents: Record<string, unknown> = {}

export function registerCustomBlock(meta: CustomBlockType): void {
  try {
    const component = evalCompiledBlock(meta.compiledJs, vue as unknown as Record<string, unknown>, sharedComponents)
    // Attach a display name so Vue devtools / error messages are readable
    component.__name = meta.slug
    registry.set(meta.slug, { meta, component })
  } catch (err) {
    console.error(`[CustomBlockRegistry] Failed to eval block "${meta.slug}":`, err)
  }
}

export function unregisterCustomBlock(slug: string): void {
  registry.delete(slug)
}

export function getCustomBlock(slug: string): VueComponent | undefined {
  return registry.get(slug)?.component
}

export function listCustomBlockMeta(): CustomBlockType[] {
  return [...registry.values()].map(e => e.meta)
}

export function hasCustomBlock(slug: string): boolean {
  return registry.has(slug)
}
