/**
 * useSessionFetch
 *
 * Drop-in replacement for $fetch that automatically ensures a valid session
 * exists before writes, then injects X-Session-Id into the request.
 *
 * Usage (in admin pages):
 *   const { sfetch } = useSessionFetch()
 *   await sfetch('/api/pages/abc', { method: 'PUT', body: updatedPage })
 */
export function useSessionFetch() {
  const session = useSessionStore()

  async function sfetch<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    const method = (opts.method as string | undefined)?.toUpperCase() ?? 'GET'
    const isWrite = method !== 'GET' && method !== 'HEAD'

    let sessionId = session.sessionId

    // Auto-create/validate session on writes
    if (isWrite) {
      const s = await session.ensureSession()
      sessionId = s.id
    }

    const headers: Record<string, string> = {
      ...(opts.headers as Record<string, string> ?? {}),
    }

    if (sessionId) {
      headers['X-Session-Id'] = sessionId
    }

    return $fetch<T>(url, { ...opts, headers })
  }

  return { sfetch }
}
