/**
 * Singleton accessor for the BranchedGitStore instance.
 * Initialized by the Nitro plugin on startup.
 */
import type { BranchedGitStore } from './branched-git-store'

let _store: BranchedGitStore | null = null

export function setGitStore(store: BranchedGitStore): void {
  _store = store
}

export function useGitStore(): BranchedGitStore {
  if (!_store) {
    throw new Error('[GitStore] Not initialized — did the git-store plugin run?')
  }
  return _store
}

// ─── Collection name constants ─────────────────────────────────────────────────
export const COLLECTION = {
  PAGES: 'pages',
  USERS: 'users',
  MEDIA: 'media',
  SETTINGS: 'settings',
  BLOCK_TYPES: 'block-types',
  TEMPLATES: 'templates',
} as const
