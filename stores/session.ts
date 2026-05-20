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
    clearSession() {
      this.currentSession = null
      this.conflicts = []
      this.isDirty = false
    },

    /**
     * Ensure an active session exists, creating one if needed.
     * Validates any persisted session against the server first.
     */
    async ensureSession(): Promise<EditorSession> {
      if (this.currentSession) {
        try {
          await $fetch(`/api/sessions/${this.currentSession.id}`)
          if (this.isActive) return this.currentSession
        } catch {
          this.clearSession()
        }
      }
      return this.openSession()
    },

    async openSession(): Promise<EditorSession> {
      const data = await $fetch<{ data: EditorSession }>('/api/sessions', { method: 'POST' })
      this.currentSession = data.data
      this.isDirty = false
      return data.data
    },

    async fetchDiff() {
      if (!this.currentSession) return []
      const data = await $fetch<{ data: ReturnType<typeof Object.create> }>(
        `/api/sessions/${this.currentSession.id}/diff`
      )
      return data.data
    },

    async publish(): Promise<PublishResult> {
      if (!this.currentSession) throw new Error('No active session')

      const data = await $fetch<{ data: PublishResult }>(
        `/api/sessions/${this.currentSession.id}/publish`,
        { method: 'POST' }
      ).catch((e) => {
        if (e.response?.status === 409) return e.data as { data: PublishResult }
        throw e
      })

      const result = data.data

      if (result.status === 'conflict') {
        this.conflicts = result.conflicts ?? []
        if (this.currentSession) this.currentSession.status = 'conflict'
      } else {
        this.clearSession()
      }

      return result
    },

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
        this.clearSession()
      }

      return result
    },

    async abandon() {
      if (!this.currentSession) return
      await $fetch(`/api/sessions/${this.currentSession.id}/abandon`, { method: 'POST' })
      this.clearSession()
    },

    markDirty() {
      this.isDirty = true
    },
  },

  persist: true,
})
