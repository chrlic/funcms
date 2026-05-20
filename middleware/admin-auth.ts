export default defineNuxtRouteMiddleware((to) => {
  // Skip on SSR — auth state lives in localStorage (client only)
  if (import.meta.server) return

  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
