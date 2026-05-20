import { BranchedGitStore } from '../lib/branched-git-store'
import { setGitStore } from '../lib/store'
import bcrypt from 'bcryptjs'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  const store = new BranchedGitStore({
    contentDir: config.contentDir,
    authorName: config.gitAuthorName,
    authorEmail: config.gitAuthorEmail,
    gitRemote: config.gitRemote || undefined,
  })

  await store.init()
  setGitStore(store)

  // Seed default admin if none exists
  const existingAdmin = await store.findOne('users', (r) => r.role === 'admin')
  if (!existingAdmin) {
    const password = process.env.ADMIN_PASSWORD || 'changeme123'
    const hashed = await bcrypt.hash(password, 12)
    await store.create(
      'users',
      {
        email: process.env.ADMIN_EMAIL || 'admin@localhost',
        name: 'Admin',
        role: 'admin',
        password: hashed,
      },
      'chore: seed default admin user'
    )
    console.log('[GitStore] Seeded default admin — change the password immediately!')
  }

  console.log('[BranchedGitStore] Ready')
})
