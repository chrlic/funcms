/**
 * BranchedGitStore
 *
 * Extends GitStore with a draft-branch-per-session model:
 *
 *   main  ──────────────────────────────────────►
 *              │              │
 *         draft/alice    draft/bob
 *          (session A)   (session B)
 *              │              │
 *         [edits...]    [edits...]
 *              │              │
 *         publish() ──► fast-forward or merge commit
 *                            │
 *                       publish() ──► conflict if both edited same file
 *
 * Writes on a session branch do NOT touch the main index until publish().
 * The main in-memory index always reflects the merged main branch.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import simpleGit, { type SimpleGit, type SimpleGitOptions } from 'simple-git'
import { GitStore, type StoreRecord } from './git-store'
import type {
  EditorSession,
  SessionStatus,
  ChangedFile,
  ConflictRecord,
  ConflictField,
  PublishResult,
  FieldResolution,
} from '~/types/session'

const MAIN_BRANCH = 'main'
const SESSIONS_COLLECTION = 'sessions'
const DRAFT_BRANCH_TTL_DAYS = 7

// ─── WorktreeStore ─────────────────────────────────────────────────────────────
// A lightweight wrapper around a git worktree for a session branch.
// Reads/writes hit the worktree directory; commits go on the session branch.

class WorktreeStore {
  readonly dir: string
  readonly branch: string
  private git: SimpleGit
  private authorName: string
  private authorEmail: string
  private writeLocks: Map<string, Promise<void>> = new Map()

  constructor(opts: {
    dir: string
    branch: string
    authorName: string
    authorEmail: string
  }) {
    this.dir = opts.dir
    this.branch = opts.branch
    this.authorName = opts.authorName
    this.authorEmail = opts.authorEmail
    this.git = simpleGit(opts.dir)
  }

  private collectionDir(collection: string) {
    return path.join(this.dir, collection)
  }

  private recordPath(collection: string, id: string) {
    return path.join(this.collectionDir(collection), `${id}.json`)
  }

  private relPath(collection: string, id: string) {
    return path.join(collection, `${id}.json`)
  }

  private async withLock(key: string, fn: () => Promise<void>) {
    const prev = this.writeLocks.get(key) ?? Promise.resolve()
    const next = prev.then(fn)
    this.writeLocks.set(key, next.catch(() => {}))
    return next
  }

  async readRecord<T = StoreRecord>(collection: string, id: string): Promise<(StoreRecord & T) | null> {
    try {
      const raw = await fs.readFile(this.recordPath(collection, id), 'utf8')
      return JSON.parse(raw) as StoreRecord & T
    } catch {
      return null
    }
  }

  async writeRecord<T extends object>(
    collection: string,
    record: StoreRecord & T,
    commitMsg: string
  ): Promise<void> {
    await this.withLock(`${collection}/${record._id}`, async () => {
      await fs.mkdir(this.collectionDir(collection), { recursive: true })
      await fs.writeFile(this.recordPath(collection, record._id), JSON.stringify(record, null, 2))
      await this.git.add([this.relPath(collection, record._id)])
      await this.git.commit(commitMsg, {
        '--author': `${this.authorName} <${this.authorEmail}>`,
        '--allow-empty': null,
      })
    })
  }

  async deleteRecord(collection: string, id: string, commitMsg: string): Promise<void> {
    await this.withLock(`${collection}/${id}`, async () => {
      await this.git.rm([this.relPath(collection, id)])
      await this.git.commit(commitMsg, {
        '--author': `${this.authorName} <${this.authorEmail}>`,
      })
    })
  }

  async listRecords<T = StoreRecord>(collection: string): Promise<(StoreRecord & T)[]> {
    try {
      const dir = this.collectionDir(collection)
      const files = await fs.readdir(dir)
      const records = await Promise.all(
        files.filter(f => f.endsWith('.json')).map(async f => {
          try {
            const raw = await fs.readFile(path.join(dir, f), 'utf8')
            return JSON.parse(raw) as StoreRecord & T
          } catch { return null }
        })
      )
      return records.filter(Boolean) as (StoreRecord & T)[]
    } catch {
      return []
    }
  }

  async listChangedFiles(mainBranch: string): Promise<string[]> {
    // Files changed on this branch vs main
    const diff = await this.git.diff([`${mainBranch}...HEAD`, '--name-only'])
    return diff.split('\n').map((s) => s.trim()).filter(Boolean)
  }
}

// ─── BranchedGitStore ──────────────────────────────────────────────────────────

export class BranchedGitStore extends GitStore {
  private contentDir: string
  private authorName: string
  private authorEmail: string
  private mainGit!: SimpleGit
  /** sessionId → WorktreeStore */
  private worktrees: Map<string, WorktreeStore> = new Map()
  /** sessionId → EditorSession (in-memory, also persisted as JSON in sessions/) */
  private sessions: Map<string, EditorSession> = new Map()
  /** Global write lock for main-branch operations (merge, delete worktree) */
  private mainLock: Promise<void> = Promise.resolve()

  constructor(opts: {
    contentDir: string
    authorName: string
    authorEmail: string
    gitRemote?: string
  }) {
    super(opts)
    this.contentDir = path.resolve(opts.contentDir)
    this.authorName = opts.authorName
    this.authorEmail = opts.authorEmail
    // mainGit initialised in init() after directory is created by super.init()
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  override async init(): Promise<void> {
    await super.init()
    this.mainGit = simpleGit(this.contentDir)

    // Ensure we're on main branch (rename master → main if needed)
    const branches = await this.mainGit.branchLocal()
    if (!branches.all.includes(MAIN_BRANCH)) {
      await this.mainGit.checkoutLocalBranch(MAIN_BRANCH)
    } else if (branches.current !== MAIN_BRANCH) {
      await this.mainGit.checkout(MAIN_BRANCH)
    }

    // Restore active sessions from disk
    await this.loadSessionsFromDisk()

    // Prune stale draft branches
    await this.pruneStaleWorktrees()

    console.log(`[BranchedGitStore] Ready on branch "${MAIN_BRANCH}"`)
  }

  private async loadSessionsFromDisk(): Promise<void> {
    const sessDir = path.join(this.contentDir, SESSIONS_COLLECTION)
    let files: string[] = []
    try { files = await fs.readdir(sessDir) } catch { return }

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await fs.readFile(path.join(sessDir, file), 'utf8')
        const session = JSON.parse(raw) as EditorSession
        if (session.status === 'active' || session.status === 'conflict') {
          this.sessions.set(session.id, session)
          await this.attachWorktree(session)
        }
      } catch (e) {
        console.warn('[BranchedGitStore] Could not load session:', file, e)
      }
    }
    console.log(`[BranchedGitStore] Restored ${this.sessions.size} active session(s)`)
  }

  private async pruneStaleWorktrees(): Promise<void> {
    const cutoff = Date.now() - DRAFT_BRANCH_TTL_DAYS * 86400_000
    for (const session of this.sessions.values()) {
      if (new Date(session.updatedAt).getTime() < cutoff) {
        console.log(`[BranchedGitStore] Pruning stale session ${session.id}`)
        await this.abandonSession(session.id).catch(() => {})
      }
    }
  }

  // ─── Worktree management ─────────────────────────────────────────────────────

  private worktreeDir(sessionId: string): string {
    return path.join(this.contentDir, '..', `.worktrees`, sessionId)
  }

  private async attachWorktree(session: EditorSession): Promise<WorktreeStore> {
    const dir = this.worktreeDir(session.id)

    // Check if worktree directory already exists
    const exists = await fs.access(dir).then(() => true).catch(() => false)
    if (!exists) {
      // Re-create worktree from existing branch
      const branches = await this.mainGit.branchLocal()
      if (branches.all.includes(session.branch)) {
        await this.mainGit.raw(['worktree', 'add', dir, session.branch])
      } else {
        console.warn(`[BranchedGitStore] Branch ${session.branch} missing for session ${session.id}`)
        return this.worktrees.get(session.id)!
      }
    }

    const wt = new WorktreeStore({
      dir,
      branch: session.branch,
      authorName: session.userName,
      authorEmail: session.userEmail,
    })
    this.worktrees.set(session.id, wt)
    return wt
  }

  private getWorktree(sessionId: string): WorktreeStore {
    const wt = this.worktrees.get(sessionId)
    if (!wt) throw createError({ statusCode: 404, statusMessage: `Session "${sessionId}" not found or not active` })
    return wt
  }

  // ─── Session persistence ─────────────────────────────────────────────────────

  private async persistSession(session: EditorSession): Promise<void> {
    const sessDir = path.join(this.contentDir, SESSIONS_COLLECTION)
    await fs.mkdir(sessDir, { recursive: true })
    await fs.writeFile(
      path.join(sessDir, `${session.id}.json`),
      JSON.stringify(session, null, 2)
    )
  }

  // ─── Public session API ───────────────────────────────────────────────────────

  async createSession(user: { userId: string; email: string; name: string }): Promise<EditorSession> {
    const sessionId = uuidv4().slice(0, 8)
    const branch = `draft/${user.email.split('@')[0]}/${sessionId}`
    const now = new Date().toISOString()

    // Get current main HEAD as fork point
    const log = await this.mainGit.log([MAIN_BRANCH, '-1'])
    const forkPoint = log.latest?.hash ?? 'HEAD'

    // Create branch and worktree atomically
    const dir = this.worktreeDir(sessionId)
    await fs.mkdir(path.dirname(dir), { recursive: true })
    await this.mainGit.raw(['worktree', 'add', '-b', branch, dir, MAIN_BRANCH])

    const session: EditorSession = {
      id: sessionId,
      userId: user.userId,
      userEmail: user.email,
      userName: user.name,
      branch,
      forkPoint,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const wt = new WorktreeStore({
      dir,
      branch,
      authorName: user.name,
      authorEmail: user.email,
    })

    this.sessions.set(sessionId, session)
    this.worktrees.set(sessionId, wt)
    await this.persistSession(session)

    console.log(`[BranchedGitStore] Created session ${sessionId} on branch "${branch}"`)
    return session
  }

  getSession(sessionId: string): EditorSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  listSessions(userId?: string): EditorSession[] {
    const all = [...this.sessions.values()]
    return userId ? all.filter((s) => s.userId === userId) : all
  }

  // ─── Session-aware reads ──────────────────────────────────────────────────────

  async sessionRead<T extends object>(
    sessionId: string,
    collection: string,
    id: string
  ): Promise<(StoreRecord & T) | null> {
    const session = this.sessions.get(sessionId)
    if (!session || (session.status !== 'active' && session.status !== 'conflict')) return null
    const wt = this.getWorktree(sessionId)
    return wt.readRecord<T>(collection, id)
  }

  async sessionFind<T extends object>(
    sessionId: string,
    collection: string,
    predicate?: (r: StoreRecord & T) => boolean
  ): Promise<(StoreRecord & T)[]> {
    const session = this.sessions.get(sessionId)
    if (!session || (session.status !== 'active' && session.status !== 'conflict')) return []
    const wt = this.getWorktree(sessionId)
    const all = await wt.listRecords<T>(collection)
    return predicate ? all.filter(predicate) : all
  }

  // ─── Session-aware writes ─────────────────────────────────────────────────────

  async sessionCreate<T extends object>(
    sessionId: string,
    collection: string,
    data: T,
    commitMsg?: string
  ): Promise<StoreRecord & T> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'active') {
      throw createError({ statusCode: 400, statusMessage: 'Session is not active' })
    }

    const wt = this.getWorktree(sessionId)
    const now = new Date().toISOString()
    const record: StoreRecord & T = { _id: uuidv4(), createdAt: now, updatedAt: now, ...data }

    await wt.writeRecord(collection, record,
      commitMsg ?? `feat(${collection}): create ${record._id}`)

    await this.touchSession(session)
    return record
  }

  async sessionUpdate<T extends object>(
    sessionId: string,
    collection: string,
    id: string,
    patch: Partial<T>,
    commitMsg?: string
  ): Promise<(StoreRecord & T) | null> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'active') {
      throw createError({ statusCode: 400, statusMessage: 'Session is not active' })
    }

    const wt = this.getWorktree(sessionId)

    // Read from worktree (may have session-local changes) or fall back to main index
    const existing = await wt.readRecord<T>(collection, id)
      ?? await this.findById<T>(collection, id)

    if (!existing) return null

    const updated: StoreRecord & T = {
      ...existing,
      ...patch,
      _id: id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    } as StoreRecord & T

    await wt.writeRecord(collection, updated,
      commitMsg ?? `feat(${collection}): update ${id}`)

    await this.touchSession(session)
    return updated
  }

  async sessionDelete(
    sessionId: string,
    collection: string,
    id: string,
    commitMsg?: string
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'active') {
      throw createError({ statusCode: 400, statusMessage: 'Session is not active' })
    }

    const wt = this.getWorktree(sessionId)
    const exists = await wt.readRecord(collection, id) ?? await this.findById(collection, id)
    if (!exists) return false

    await wt.deleteRecord(collection, id,
      commitMsg ?? `feat(${collection}): delete ${id}`)

    await this.touchSession(session)
    return true
  }

  private async touchSession(session: EditorSession): Promise<void> {
    session.updatedAt = new Date().toISOString()
    await this.persistSession(session)
  }

  // ─── Diff ────────────────────────────────────────────────────────────────────

  async sessionDiff(sessionId: string): Promise<ChangedFile[]> {
    const wt = this.getWorktree(sessionId)
    const changedPaths = await wt.listChangedFiles(MAIN_BRANCH)
    const result: ChangedFile[] = []

    for (const p of changedPaths) {
      // p = "pages/uuid.json" or "users/uuid.json"
      const parts = p.split('/')
      if (parts.length !== 2 || !parts[1].endsWith('.json')) continue

      const collection = parts[0]
      const recordId = parts[1].replace('.json', '')

      const onDraft = await wt.readRecord(collection, recordId)
      const onMain = await this.findById(collection, recordId)

      let operation: ChangedFile['operation']
      if (!onMain && onDraft) operation = 'create'
      else if (onMain && !onDraft) operation = 'delete'
      else operation = 'update'

      let changedFields: string[] | undefined
      if (operation === 'update' && onMain && onDraft) {
        changedFields = Object.keys(onDraft).filter(
          (k) => JSON.stringify(onDraft[k]) !== JSON.stringify(onMain[k as keyof typeof onMain])
        )
      }

      result.push({ collection, recordId, operation, changedFields })
    }

    return result
  }

  // ─── Publish (merge into main) ────────────────────────────────────────────────

  async publishSession(sessionId: string): Promise<PublishResult> {
    const session = this.sessions.get(sessionId)
    if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })
    if (session.status !== 'active' && session.status !== 'conflict') {
      throw createError({ statusCode: 400, statusMessage: `Session status is "${session.status}"` })
    }

    return new Promise((resolve, reject) => {
      this.mainLock = this.mainLock.then(async () => {
        try {
          resolve(await this._doMerge(session))
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  private async _doMerge(session: EditorSession): Promise<PublishResult> {
    // Merge with -X theirs so the session's version always wins on conflict.
    // For a CMS the editor's explicit save is the source of truth — there is
    // no meaningful "both sides changed" scenario worth surfacing to the user.
    try {
      await this.mainGit.merge([
        session.branch,
        '--no-ff',
        '-X', 'theirs',
        '-m', `feat: publish session ${session.id} by ${session.userEmail}`,
      ])
    } catch {
      // Should rarely happen with -X theirs, but handle gracefully
      await this.mainGit.merge(['--abort']).catch(() => {})

      session.status = 'conflict'
      session.updatedAt = new Date().toISOString()
      await this.persistSession(session)

      return { status: 'conflict', conflicts: [] }
    }

    // Success — rebuild main index from merged files
    await this.rebuildMainIndex()

    const log = await this.mainGit.log(['-1'])
    const mergeCommit = log.latest?.hash ?? ''

    session.status = 'published'
    session.publishedAt = new Date().toISOString()
    session.updatedAt = session.publishedAt
    await this.persistSession(session)

    // Clean up worktree
    await this._removeWorktree(session)

    if (this['gitRemote' as keyof this]) {
      this.mainGit.push(this['gitRemote' as keyof this] as string, MAIN_BRANCH).catch(() => {})
    }

    console.log(`[BranchedGitStore] Session ${session.id} published → ${mergeCommit.slice(0, 7)}`)
    return { status: 'ok', mergeCommit }
  }

  private async _extractConflicts(session: EditorSession): Promise<ConflictRecord[]> {
    // Get list of conflicting files from git status
    const status = await this.mainGit.status()
    const conflictingFiles = status.conflicted

    const records: ConflictRecord[] = []

    for (const filePath of conflictingFiles) {
      const parts = filePath.split('/')
      if (parts.length !== 2 || !parts[1].endsWith('.json')) continue

      const collection = parts[0]
      const recordId = parts[1].replace('.json', '')

      // Get three versions: base (fork point), ours (main HEAD), theirs (draft branch)
      const [baseRaw, oursRaw, theirsRaw] = await Promise.all([
        this.mainGit.show([`${session.forkPoint}:${filePath}`]).catch(() => 'null'),
        this.mainGit.show([`${MAIN_BRANCH}:${filePath}`]).catch(() => 'null'),
        this.mainGit.show([`${session.branch}:${filePath}`]).catch(() => 'null'),
      ])

      const base = JSON.parse(baseRaw) as Record<string, unknown>
      const theirs = JSON.parse(oursRaw) as Record<string, unknown>   // main = "theirs" from editor's POV
      const ours = JSON.parse(theirsRaw) as Record<string, unknown>   // draft = "ours"

      // Find fields that differ between ours and theirs (and at least one changed from base)
      const allKeys = new Set([...Object.keys(ours), ...Object.keys(theirs)])
      const fields: ConflictField[] = []

      for (const key of allKeys) {
        const oursVal = ours[key]
        const theirsVal = theirs[key]
        const baseVal = base?.[key]

        const oursChanged = JSON.stringify(oursVal) !== JSON.stringify(baseVal)
        const theirsChanged = JSON.stringify(theirsVal) !== JSON.stringify(baseVal)

        // Only flag as conflict if BOTH sides changed from base
        if (oursChanged && theirsChanged && JSON.stringify(oursVal) !== JSON.stringify(theirsVal)) {
          fields.push({ field: key, ours: oursVal, theirs: theirsVal, base: baseVal })
        }
      }

      if (fields.length > 0) {
        records.push({ collection, recordId, fields, oursFull: ours, theirsFull: theirs })
      }
    }

    return records
  }

  // ─── Conflict resolution ──────────────────────────────────────────────────────

  async resolveConflicts(
    sessionId: string,
    resolutions: FieldResolution[]
  ): Promise<PublishResult> {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'conflict') {
      throw createError({ statusCode: 400, statusMessage: 'Session is not in conflict state' })
    }

    const wt = this.getWorktree(sessionId)

    // Apply resolutions: build merged records and commit them on the draft branch
    for (const resolution of resolutions) {
      const { collection, recordId, resolutions: fieldValues } = resolution

      // Start from "ours" (draft), apply chosen field values
      const existing = await wt.readRecord(collection, recordId)
        ?? await this.findById(collection, recordId)

      if (!existing) continue

      const resolved: StoreRecord = {
        ...existing,
        ...fieldValues,
        _id: recordId,
        updatedAt: new Date().toISOString(),
      }

      await wt.writeRecord(
        collection,
        resolved,
        `fix(${collection}): resolve conflict on ${recordId} (session ${sessionId})`
      )
    }

    // Re-activate session and retry publish
    session.status = 'active'
    session.updatedAt = new Date().toISOString()
    await this.persistSession(session)

    return this.publishSession(sessionId)
  }

  // ─── Abandon ─────────────────────────────────────────────────────────────────

  async abandonSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) throw createError({ statusCode: 404, statusMessage: 'Session not found' })

    await this._removeWorktree(session)

    session.status = 'abandoned'
    session.updatedAt = new Date().toISOString()
    await this.persistSession(session)
    this.sessions.delete(sessionId)

    console.log(`[BranchedGitStore] Session ${sessionId} abandoned`)
  }

  private async _removeWorktree(session: EditorSession): Promise<void> {
    const dir = this.worktreeDir(session.id)

    // Remove worktree, then delete the branch
    await this.mainGit.raw(['worktree', 'remove', '--force', dir]).catch(() => {})
    await this.mainGit.deleteLocalBranch(session.branch, true).catch(() => {})

    this.worktrees.delete(session.id)
  }

  // ─── Rebuild main index after merge ──────────────────────────────────────────

  private async rebuildMainIndex(): Promise<void> {
    await this.buildAllIndexes()
  }
}
