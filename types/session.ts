// ─── Editor Sessions ───────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'published' | 'abandoned' | 'conflict'

export interface EditorSession {
  id: string                  // short random id, used as branch suffix
  userId: string
  userEmail: string
  userName: string
  branch: string              // e.g. "draft/alice/sess-abc123"
  forkPoint: string           // commit hash of main when session was created
  status: SessionStatus
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

// ─── Diffs & Conflicts ─────────────────────────────────────────────────────────

export interface ChangedFile {
  collection: string
  recordId: string
  operation: 'create' | 'update' | 'delete'
  /** Summary fields changed (for updates) */
  changedFields?: string[]
}

export interface ConflictField {
  field: string
  /** Value on the draft branch (this session's version) */
  ours: unknown
  /** Value on main (the version that was merged first) */
  theirs: unknown
  /** The common ancestor value before either edit */
  base: unknown
}

export interface ConflictRecord {
  collection: string
  recordId: string
  /** Field-level conflicts */
  fields: ConflictField[]
  /** Full record as it exists on draft branch */
  oursFull: Record<string, unknown>
  /** Full record as it exists on main */
  theirsFull: Record<string, unknown>
}

export interface PublishResult {
  status: 'ok' | 'conflict'
  /** Set when status === 'conflict' */
  conflicts?: ConflictRecord[]
  /** Commit hash on main when status === 'ok' */
  mergeCommit?: string
}

// ─── Resolution ────────────────────────────────────────────────────────────────

/** Admin submits chosen values for each conflicting field */
export interface FieldResolution {
  collection: string
  recordId: string
  /** Map of fieldName → chosen value */
  resolutions: Record<string, unknown>
}
