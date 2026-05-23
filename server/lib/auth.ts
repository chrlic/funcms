import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'

export interface JwtPayload {
  userId: string
  email: string
  role: string
  name: string
  /** Active editor session — present when working in a draft branch */
  sessionId?: string
}

/**
 * Verify JWT from Authorization header or cookie.
 * Returns the decoded payload or throws a 401.
 */
export function requireAuth(event: H3Event): JwtPayload {
  const config = useRuntimeConfig()

  const authHeader = getHeader(event, 'authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : getCookie(event, 'cms_token')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Token invalid or expired' })
  }
}

const roleRank: Record<string, number> = { viewer: 0, editor: 1, admin: 2 }

export function requireRole(event: H3Event, minRole: 'viewer' | 'editor' | 'admin') {
  const user = requireAuth(event)
  if ((roleRank[user.role] ?? -1) < roleRank[minRole]) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

/**
 * Extract sessionId from request — header takes priority over JWT.
 * The frontend sends X-Session-Id header when making session-aware edits.
 */
export function getSessionId(event: H3Event): string | undefined {
  return getHeader(event, 'x-session-id') ?? requireAuth(event).sessionId
}

/** Returns { name, email } for use as a git commit author. */
export function userAuthor(user: JwtPayload): { name: string; email: string } {
  return { name: user.name, email: user.email }
}
