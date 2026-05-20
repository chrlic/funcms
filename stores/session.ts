import { defineStore } from 'pinia'
import type { EditorSession, PublishResult, ConflictRecord, FieldResolution } from '~/types/session'

interface SessionState {
  currentSession: EditorSession | null
  conflicts: ConflictRecord[]
  isDirty: boolean
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    currentSession: null,
    conflicts: [],
    isDirty: false,
  }),

  getters: {
    sessionId: (state) => state.currentSession?.id ?? null,
    isActive: (state) => state.currentSession?.status === 'active',
    hasConflicts: (state) => state.currentSession?.status === 'conflict',
    branch: (state) => state.currentSession?.branch ?? null,
  },

  actions: {
    /** Open a new draft session (creates a git branch) */
    async openSession() {
      const data = await $fetch<{ data: EditorSession }>('/api/sessions', {
        method: 'POST',
      })
      this.currentSession = data.data
      this.isDirty = false
      return data.data
    },

    /** Fetch what has changed in the current session vs main */
    async fetchDiff() {
      if (!this.currentSession) return []
      const data = await $fetch<{ data: ReturnType<typeof Object.create> }>(
        `/api/sessions/${this.currentSession.id}/diff`
      )
      return data.data
    },

    /** Attempt to publish (merge) the session into main */
    async publish(): Promise<PublishResult> {
      if (!this.currentSession) throw new Error('No active session')

      const data = await $fetch<{ data: PublishResult }>(
        `/api/sessions/${this.currentSession.id}/publish`,
        { method: 'POST' }
      ).catch((e) => {
        // 409 Conflict — parse response
        if (e.response?.status === 409) return e.data as { data: PublishResult }
        throw e
      })

      const result = data.data

      if (result.status === 'conflict') {
        this.conflicts = result.conflicts ?? []
        if (this.currentSession) this.currentSession.status = 'conflict'
      } else {
        this.currentSession = null
        this.conflicts = []
        this.isDirty = false
      }

      return result
    },

    /** Submit field-level resolutions and retry publish */
    async resolve(resolutions: FieldResolution[]): Promise<PublishResult> {
      if (!this.currentSession) throw new Error('No active session')

      const data = await $fetch<{ data: PublishResult }>(
        `/api/sessions/${this.currentSession.id}/resolve`,
        { method: 'POST', body: { resolutions } }
      ).catch((e) => {
        if (e.response?.status === 409) return e.data as { data: PublishResult }
        throw e
      })

      const result = data.data

      if (result.status === 'conflict') {
        this.conflicts = result.conflicts ?? []
      } else {
        this.currentSession = null
        this.conflicts = []
        this.isDirty = false
      }

      return result
    },

    /** Discard all changes and delete the draft branch */
    async abandon() {
      if (!this.currentSession) return
      await $fetch(`/api/sessions/${this.currentSession.id}/abandon`, { method: 'POST' })
      this.currentSession = null
      this.conflicts = []
      this.isDirty = false
    },

    markDirty() {
      this.isDirty = true
    },
  },

  persist: true,
})
