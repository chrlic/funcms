import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { useGitStore, COLLECTION } from '~/server/lib/store'
import type { User } from '~/types'
import type { StoreRecord } from '~/server/lib/git-store'

type UserRecord = StoreRecord & User & { password: string }

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const config = useRuntimeConfig()
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password required' })
  }

  const store = useGitStore()
  const user = await store.findOne<UserRecord>(
    COLLECTION.USERS,
    (r) => (r as UserRecord).email === email.toLowerCase().trim()
  )

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )

  setCookie(event, 'cms_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  // Never return password hash to client
  const { password: _pw, ...safeUser } = user

  return { data: { token, user: safeUser } }
})
