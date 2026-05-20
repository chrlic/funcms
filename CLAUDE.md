# NuxtCMS — Claude Code Project Context

## Project Overview
A headless CMS with a **Nuxt 3 SSR frontend** and built-in admin panel.
Pages are composed of ordered **blocks** (Vue components) mapped to layout **slots**.
The backend uses **git as the database** — content is stored as JSON files and every
write is a git commit. Collaborative editing uses **draft branches per session**:
each admin opens a session (a git worktree on its own branch), edits freely, then
publishes by merging into `main`. Merge conflicts are surfaced as structured JSON
diffs so the editor can resolve them field-by-field in the UI.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Nuxt 3 (SSR) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + `@tailwindcss/typography` |
| State | Pinia (`stores/`) |
| Storage | Git + JSON files via `simple-git` |
| Branching | Git worktrees (one per session) |
| Auth | JWT (httpOnly cookie + Authorization header) + bcryptjs |
| Icons | `nuxt-icon` (Heroicons: `i-heroicons-*`) |

---

## Architecture — Storage Layer

### Two-class storage design
```
GitStore (server/lib/git-store.ts)
  └── BranchedGitStore (server/lib/branched-git-store.ts)   ← what the app uses
```

**`GitStore`** — base class. CRUD over JSON files with an in-memory index and a
git commit per write. Handles collection management, index building, history queries.

**`BranchedGitStore`** — extends GitStore with session/branch logic:
- Each editor session gets a **git worktree** in `.worktrees/{sessionId}/`
- Worktree = isolated working directory checked out on `draft/{user}/{sessionId}`
- Session writes (`sessionCreate/sessionUpdate/sessionDelete`) go to the worktree
- `publishSession()` merges the worktree branch into `main` via `git merge --no-ff`
- On conflict: git merge is aborted, conflicts are extracted as structured `ConflictRecord[]`
- `resolveConflicts()` applies chosen field values to the worktree then retries the merge
- `abandonSession()` removes the worktree and deletes the branch

### Why worktrees (not branch-switching)
Git worktrees give each session a **separate filesystem directory** checked out to its
branch. This means concurrent sessions can write without switching the main repo's HEAD.
The main repo always stays on `main`; sessions operate in `.worktrees/{id}/`.

### In-memory index
The main-branch index (built from `content/`) is always current after init and after
each merge. Session writes do NOT update the main index — the main index reflects
what's published. Use `sessionUpdate`/`sessionCreate` to stage changes; they become
visible in the main index only after `publishSession()` succeeds.

---

## Session Lifecycle

```
Editor opens session    → POST /api/sessions
                        → creates draft/user/sessionId branch + worktree

Editor makes edits      → PUT/PATCH /api/pages/:id  (with X-Session-Id header)
                        → commits to worktree branch

Editor clicks Publish   → POST /api/sessions/:id/publish
                        → git merge --no-ff draft/... → main

  ┌── Clean merge ──────→ index rebuilt, worktree removed, branch deleted
  └── Conflict ──────────→ 409, ConflictRecord[] returned

Editor resolves fields  → POST /api/sessions/:id/resolve  { resolutions: [...] }
                        → applies choices to worktree, retries merge

Editor abandons         → POST /api/sessions/:id/abandon
                        → worktree + branch deleted, changes lost
```

---

## Directory Structure
```
nuxt-cms/
├── content/                    ← git repo (auto-created on first run)
│   ├── pages/{uuid}.json       ← page records
│   ├── users/{uuid}.json       ← user records (bcrypt password inside)
│   ├── media/{uuid}.json       ← media metadata
│   ├── sessions/{id}.json      ← session state (survives restarts)
│   └── uploads/                ← raw uploaded files
├── .worktrees/                 ← git worktrees, one per active session
│   └── {sessionId}/            ← isolated checkout of draft/user/sessionId
│
├── components/
│   ├── blocks/                 ← Block components + registry (index.ts)
│   ├── layout/                 ← Layout shell components
│   └── admin/
│       ├── SessionToolbar.vue  ← Start / Publish / Abandon controls
│       └── ConflictResolver.vue← Field-by-field conflict UI (modal)
├── composables/
│   └── useSessionFetch.ts      ← $fetch wrapper that injects X-Session-Id
├── layouts/
│   ├── admin.vue               ← Admin sidebar layout (includes SessionToolbar)
│   └── admin-auth.vue          ← Minimal layout for login page
├── middleware/
│   └── admin-auth.ts           ← Client-side route guard
├── pages/
│   ├── [...slug].vue           ← CMS page renderer (catch-all)
│   └── admin/                  ← Admin panel pages
├── server/
│   ├── api/
│   │   ├── pages/              ← index.ts, [id].ts, by-slug.ts,
│   │   │                          [id].history.ts, [id].restore.ts
│   │   ├── sessions/           ← index.ts, [id].ts, [id].publish.ts,
│   │   │                          [id].abandon.ts, [id].diff.ts, [id].resolve.ts
│   │   ├── media/              ← upload, list, delete
│   │   └── auth/               ← login.ts, logout.ts, me.ts
│   ├── lib/
│   │   ├── git-store.ts        ← Base storage class
│   │   ├── branched-git-store.ts ← Session + worktree + merge logic
│   │   └── store.ts            ← Singleton accessor + COLLECTION constants
│   ├── middleware/
│   │   └── auth.ts             ← requireAuth, requireRole, getSessionId
│   └── plugins/
│       └── git-store.ts        ← Nitro startup: init BranchedGitStore, seed admin
├── stores/
│   ├── auth.ts                 ← Pinia auth store
│   └── session.ts              ← Pinia session store (openSession, publish, resolve, abandon)
├── types/
│   ├── index.ts                ← Page, Block, User, MediaItem, SiteSettings
│   └── session.ts              ← EditorSession, ConflictRecord, ConflictField, PublishResult, FieldResolution
└── .env.example
```

---

## API Routes

### Pages
| Method | Route | Auth | Session-aware | Purpose |
|---|---|---|---|---|
| GET | `/api/pages` | public/editor+ | — | List pages |
| POST | `/api/pages` | editor+ | ✓ | Create page |
| GET | `/api/pages/:id` | public | — | Get page (from main) |
| PUT | `/api/pages/:id` | editor+ | ✓ | Full update |
| PATCH | `/api/pages/:id` | editor+ | ✓ | Partial update |
| DELETE | `/api/pages/:id` | admin | ✓ | Delete page |
| GET | `/api/pages/by-slug` | public | — | Resolve slug → published page |
| GET | `/api/pages/:id/history` | editor+ | — | Git log for page |
| POST | `/api/pages/:id/restore` | editor+ | — | Restore to past commit |

### Sessions
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/sessions` | editor+ | List sessions |
| POST | `/api/sessions` | editor+ | Create session (opens draft branch) |
| GET | `/api/sessions/:id` | editor+ | Session info |
| GET | `/api/sessions/:id/diff` | editor+ | Changed files vs main |
| POST | `/api/sessions/:id/publish` | editor+ | Merge → main (200 or 409 conflict) |
| POST | `/api/sessions/:id/resolve` | editor+ | Apply resolutions, retry merge |
| POST | `/api/sessions/:id/abandon` | editor+ | Discard changes |

### Auth
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Login, sets httpOnly cookie |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Clear cookie |

---

## GitStore / BranchedGitStore API
```ts
// Base reads (always from main index — fast, no git I/O)
store.findById(collection, id)
store.findOne(collection, predicate)
store.find(collection, predicate?, opts?)
store.count(collection, predicate?)

// Main-branch writes (bypasses sessions — for auth/settings/seeding)
store.create(collection, data, commitMsg?)
store.update(collection, id, patch, commitMsg?)
store.delete(collection, id, commitMsg?)

// Session-scoped writes (go to worktree branch)
store.sessionCreate(sessionId, collection, data, commitMsg?)
store.sessionUpdate(sessionId, collection, id, patch, commitMsg?)
store.sessionDelete(sessionId, collection, id, commitMsg?)

// Session management
store.createSession({ userId, email, name })
store.getSession(sessionId)
store.listSessions(userId?)
store.sessionDiff(sessionId)           // → ChangedFile[]
store.publishSession(sessionId)        // → PublishResult
store.resolveConflicts(sessionId, resolutions)
store.abandonSession(sessionId)

// History (always on main)
store.history(collection, id, maxCount?)
store.getAtCommit(collection, id, hash)
```
Import: `import { useGitStore, COLLECTION } from '~/server/lib/store'`

---

## Frontend Session Pattern

### Making session-aware requests
```ts
// In admin components — always use sfetch, never $fetch directly for writes
const { sfetch } = useSessionFetch()
await sfetch('/api/pages/abc-123', { method: 'PUT', body: updatedPage })
// sfetch automatically adds X-Session-Id: {sessionId} when a session is active
```

### SessionToolbar.vue
Drop into any admin layout. Shows:
- **"Start editing"** button → calls `session.openSession()` → creates worktree branch
- **Branch badge** → shows `user/sessionId` short name
- **Change count** → polls `/api/sessions/:id/diff` every 10s
- **Publish button** → calls `session.publish()` → 409 opens ConflictResolver
- **Trash button** → `session.abandon()` with confirmation

### ConflictResolver.vue
Modal showing each conflicting record and field. For each field:
- Left panel = **Your version** (draft branch)
- Right panel = **Published version** (what's on main)
- Click to select; submits `FieldResolution[]` to `session.resolve()`

---

## Coding Conventions
- **Session writes**: always use `sessionCreate/sessionUpdate/sessionDelete`; only use
  `create/update/delete` directly for non-content data (users, settings, seeding)
- **`getSessionId(event)`**: extract from `X-Session-Id` header (preferred) or JWT
- **COLLECTION constants**: always use `COLLECTION.PAGES` etc., never raw strings
- **Error handling**: `createError({ statusCode, statusMessage })` in all handlers
- **Types**: import session types from `~/types/session`, content types from `~/types`
- **Vue**: `<script setup lang="ts">`, `withDefaults` for props with defaults
- **Never** access `.worktrees/` directly — always go through `BranchedGitStore` methods

---

## What Needs Building Next (priority order)
1. **`layouts/admin-auth.vue`** — minimal centered layout for `/admin/login`
2. **`layouts/landing.vue`**, **`layouts/blank.vue`**, **`layouts/sidebar-right.vue`**
3. **`pages/admin/pages/index.vue`** — page list with search, filter, pagination
4. **`pages/admin/pages/[id].vue`** — drag-and-drop block builder (use `vuedraggable`)
   - Must call `session.openSession()` on first edit if no session exists
   - Use `sfetch` for all save operations
5. **`components/admin/BlockEditor.vue`** — auto-generates settings form from `blockSchemas`
6. **Wire `SessionToolbar` into `layouts/admin.vue`** header slot
7. **`server/api/media/`** — upload, list, delete endpoints
8. **`pages/admin/media/index.vue`** — media library grid
9. **Remaining block components**: `GridBlock`, `ImageBlock`, `GalleryBlock`, `VideoBlock`,
   `CtaBlock`, `CardRowBlock`, `DividerBlock`, `RawHtmlBlock`
10. **`server/api/settings/`** and `pages/admin/settings/index.vue`

---

## Local Dev Setup
```bash
cp .env.example .env        # set JWT_SECRET; optionally GIT_REMOTE
pnpm install
pnpm dev
# Content repo auto-initialized at ./content on first run
# Worktrees created at ./.worktrees/{sessionId}/ as sessions are opened
# Default admin: admin@localhost / changeme123
```

## Linting
```bash
pnpm lint
pnpm typecheck
```
