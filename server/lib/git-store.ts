/**
 * GitStore — git-backed JSON file store
 *
 * Each "collection" is a subdirectory under contentDir.
 * Each record is a JSON file named `{id}.json`.
 * Every write (create/update/delete) produces a git commit.
 *
 * An in-memory index is built at startup for fast list/filter queries
 * without reading every file on each request.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import simpleGit, { type SimpleGit } from 'simple-git'

export interface StoreRecord {
  _id: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

type Index = Map<string, StoreRecord>

export class GitStore {
  private git!: SimpleGit
  private contentDir: string
  private authorName: string
  private authorEmail: string
  private gitRemote: string
  /** collection → id → record (in-memory index) */
  private indexes: Map<string, Index> = new Map()
  /** Mutex per collection to serialize concurrent writes */
  private writeLocks: Map<string, Promise<void>> = new Map()

  constructor(opts: {
    contentDir: string
    authorName: string
    authorEmail: string
    gitRemote?: string
  }) {
    this.contentDir = path.resolve(opts.contentDir)
    this.authorName = opts.authorName
    this.authorEmail = opts.authorEmail
    this.gitRemote = opts.gitRemote ?? ''
    // git is initialised in init() after the directory is created
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  async init(): Promise<void> {
    await fs.mkdir(this.contentDir, { recursive: true })
    this.git = simpleGit(this.contentDir)

    const isRepo = await this.git.checkIsRepo().catch(() => false)
    if (!isRepo) {
      await this.git.init()
      await this.git.addConfig('user.name', this.authorName)
      await this.git.addConfig('user.email', this.authorEmail)
      // Initial commit so HEAD exists
      const gitkeep = path.join(this.contentDir, '.gitkeep')
      await fs.writeFile(gitkeep, '')
      await this.git.add('.gitkeep')
      await this.git.commit('chore: init content repo')
      console.log('[GitStore] Initialized new git repo at', this.contentDir)
    } else {
      await this.git.addConfig('user.name', this.authorName)
      await this.git.addConfig('user.email', this.authorEmail)
      console.log('[GitStore] Using existing git repo at', this.contentDir)
    }

    await this.buildAllIndexes()
  }

  // ─── Index ─────────────────────────────────────────────────────────────────

  protected async buildAllIndexes(): Promise<void> {
    const entries = await fs.readdir(this.contentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.buildIndex(entry.name)
      }
    }
  }

  private async buildIndex(collection: string): Promise<void> {
    const dir = this.collectionDir(collection)
    const index: Index = new Map()

    let files: string[] = []
    try {
      files = await fs.readdir(dir)
    } catch {
      // Directory doesn't exist yet — empty index
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf8')
        const record = JSON.parse(raw) as StoreRecord
        index.set(record._id, record)
      } catch (e) {
        console.warn(`[GitStore] Could not parse ${collection}/${file}:`, e)
      }
    }

    this.indexes.set(collection, index)
    console.log(`[GitStore] Indexed ${index.size} records in "${collection}"`)
  }

  private getIndex(collection: string): Index {
    if (!this.indexes.has(collection)) {
      this.indexes.set(collection, new Map())
    }
    return this.indexes.get(collection)!
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private collectionDir(collection: string): string {
    return path.join(this.contentDir, collection)
  }

  private recordPath(collection: string, id: string): string {
    return path.join(this.collectionDir(collection), `${id}.json`)
  }

  private relPath(collection: string, id: string): string {
    return path.join(collection, `${id}.json`)
  }

  /** Serialize writes per collection to avoid git race conditions */
  private async withLock(collection: string, fn: () => Promise<void>): Promise<void> {
    const existing = this.writeLocks.get(collection) ?? Promise.resolve()
    const next = existing.then(fn)
    this.writeLocks.set(collection, next.catch(() => {}))
    return next
  }

  private async commit(message: string, files: string[]): Promise<void> {
    await this.git.add(files)
    await this.git.commit(message, { '--author': `${this.authorName} <${this.authorEmail}>` })
    if (this.gitRemote) {
      // Fire-and-forget push; don't block the response
      this.git.push(this.gitRemote, 'HEAD').catch((e) =>
        console.warn('[GitStore] Push failed:', e)
      )
    }
  }

  // ─── CRUD API ──────────────────────────────────────────────────────────────

  async create<T extends object>(
    collection: string,
    data: T,
    commitMsg?: string
  ): Promise<StoreRecord & T> {
    const now = new Date().toISOString()
    const record: StoreRecord & T = {
      _id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...data,
    }

    await this.withLock(collection, async () => {
      await fs.mkdir(this.collectionDir(collection), { recursive: true })
      await fs.writeFile(this.recordPath(collection, record._id), JSON.stringify(record, null, 2))
      await this.commit(
        commitMsg ?? `feat(${collection}): create ${record._id}`,
        [this.relPath(collection, record._id)]
      )
    })

    this.getIndex(collection).set(record._id, record)
    return record
  }

  async findById<T = StoreRecord>(collection: string, id: string): Promise<(StoreRecord & T) | null> {
    const record = this.getIndex(collection).get(id)
    return (record as (StoreRecord & T)) ?? null
  }

  async findOne<T = StoreRecord>(
    collection: string,
    predicate: (record: StoreRecord) => boolean
  ): Promise<(StoreRecord & T) | null> {
    for (const record of this.getIndex(collection).values()) {
      if (predicate(record)) return record as StoreRecord & T
    }
    return null
  }

  async find<T = StoreRecord>(
    collection: string,
    predicate?: (record: StoreRecord) => boolean,
    opts?: { sort?: keyof StoreRecord; order?: 'asc' | 'desc'; skip?: number; limit?: number }
  ): Promise<Array<StoreRecord & T>> {
    let results = [...this.getIndex(collection).values()] as Array<StoreRecord & T>

    if (predicate) {
      results = results.filter(predicate as (r: StoreRecord & T) => boolean)
    }

    if (opts?.sort) {
      const key = opts.sort as string
      const dir = opts.order === 'asc' ? 1 : -1
      results.sort((a, b) => {
        const av = (a as Record<string, unknown>)[key] as string
        const bv = (b as Record<string, unknown>)[key] as string
        return av < bv ? -dir : av > bv ? dir : 0
      })
    }

    if (opts?.skip) results = results.slice(opts.skip)
    if (opts?.limit) results = results.slice(0, opts.limit)

    return results
  }

  async count(collection: string, predicate?: (record: StoreRecord) => boolean): Promise<number> {
    if (!predicate) return this.getIndex(collection).size
    let n = 0
    for (const record of this.getIndex(collection).values()) {
      if (predicate(record)) n++
    }
    return n
  }

  async update<T extends object>(
    collection: string,
    id: string,
    patch: Partial<T>,
    commitMsg?: string
  ): Promise<(StoreRecord & T) | null> {
    const existing = this.getIndex(collection).get(id)
    if (!existing) return null

    const updated: StoreRecord = {
      ...existing,
      ...patch,
      _id: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    await this.withLock(collection, async () => {
      await fs.writeFile(this.recordPath(collection, id), JSON.stringify(updated, null, 2))
      await this.commit(
        commitMsg ?? `feat(${collection}): update ${id}`,
        [this.relPath(collection, id)]
      )
    })

    this.getIndex(collection).set(id, updated)
    return updated as StoreRecord & T
  }

  async delete(collection: string, id: string, commitMsg?: string): Promise<boolean> {
    if (!this.getIndex(collection).has(id)) return false

    await this.withLock(collection, async () => {
      const filePath = this.recordPath(collection, id)
      await fs.unlink(filePath)
      await this.git.rm([this.relPath(collection, id)])
      await this.commit(
        commitMsg ?? `feat(${collection}): delete ${id}`,
        []  // already staged by git.rm
      )
    })

    this.getIndex(collection).delete(id)
    return true
  }

  // ─── Git history ───────────────────────────────────────────────────────────

  async history(collection: string, id: string, maxCount = 20) {
    const log = await this.git.log({
      file: this.relPath(collection, id),
      maxCount,
    })
    return log.all.map((c) => ({
      hash: c.hash,
      message: c.message,
      author: c.author_name,
      date: c.date,
    }))
  }

  async getAtCommit<T = StoreRecord>(
    collection: string,
    id: string,
    hash: string
  ): Promise<(StoreRecord & T) | null> {
    try {
      const raw = await this.git.show([`${hash}:${this.relPath(collection, id)}`])
      return JSON.parse(raw) as StoreRecord & T
    } catch {
      return null
    }
  }
}
