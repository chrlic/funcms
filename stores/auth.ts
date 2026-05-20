import { defineStore } from 'pinia'
import type { User } from '~/types'

interface AuthState {
  user: User | null
  token: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
    isEditor: (state) => ['admin', 'editor'].includes(state.user?.role ?? ''),
  },

  actions: {
    async login(email: string, password: string) {
      const { data } = await $fetch<{ data: { token: string; user: User } }>(
        '/api/auth/login',
        { method: 'POST', body: { email, password } }
      )
      this.token = data.token
      this.user = data.user
    },

    logout() {
      this.token = null
      this.user = null
      navigateTo('/admin/login')
    },
  },

  persist: true, // requires @pinia-plugin-persistedstate
})
