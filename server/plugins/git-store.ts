import { BranchedGitStore } from '../lib/branched-git-store'
import { setGitStore, COLLECTION } from '../lib/store'
import { registerCustomBlock } from '../lib/custom-block-registry'
import { compileCustomBlock } from '../lib/custom-block-compiler'
import type { CustomBlockType } from '~/types'
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

  // Load all saved custom block types — recompile any with the old broken format
  const customBlocks = await store.find(COLLECTION.BLOCK_TYPES) as CustomBlockType[]
  for (let block of customBlocks) {
    // Recompile if not using the current setup()-based format
    if (!block.compiledJs.includes('setup(props')) {
      console.log(`[CustomBlockRegistry] Recompiling stale block "${block.slug}"…`)
      const { code, errors } = await compileCustomBlock(block.source)
      if (!errors.length) {
        block = { ...block, compiledJs: code }
        await store.update(COLLECTION.BLOCK_TYPES, block._id!, { compiledJs: code }, `chore: recompile block "${block.slug}" with updated compiler`)
      } else {
        console.warn(`[CustomBlockRegistry] Failed to recompile "${block.slug}": ${errors[0]}`)
      }
    }
    registerCustomBlock(block)
  }
  if (customBlocks.length) {
    console.log(`[CustomBlockRegistry] Loaded ${customBlocks.length} custom block type(s)`)
  }

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
