/**
 * useSessionFetch
 *
 * Drop-in replacement for $fetch that automatically injects the
 * X-Session-Id header when a session is active, routing writes
 * to the correct draft branch.
 *
 * Usage (in admin pages):
 *   const { sfetch } = useSessionFetch()
 *   await sfetch('/api/pages/abc', { method: 'PUT', body: updatedPage })
 */
export function useSessionFetch() {
  const session = useSessionStore()

  async function sfetch<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string> ?? {}),
    }

    if (session.sessionId) {
      headers['X-Session-Id'] = session.sessionId
    }

    return $fetch<T>(url, { ...opts, headers })
  }

  return { sfetch }
}
