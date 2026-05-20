# FunCMS

A self-hosted headless CMS with a built-in admin panel, git-backed content storage, and a Nuxt 3 SSR frontend.

Pages are composed of ordered **blocks** (Hero, Rich Text, Media+Text, CTA, Gallery, Video, …) mapped to layout slots. The backend uses **git as the database** — every content write is a commit. Collaborative editing is branch-based: each admin session gets its own git worktree; changes only go live after an explicit **Publish**.

---

## Table of Contents

1. [Requirements](#requirements)
2. [Quick start (local dev)](#quick-start-local-dev)
3. [Environment variables](#environment-variables)
4. [Git / content store](#git--content-store)
5. [Production build](#production-build)
6. [Setup on macOS](#setup-on-macos)
7. [Running on a fresh Linux server](#running-on-a-fresh-linux-server)
8. [Reverse proxy (nginx)](#reverse-proxy-nginx)
9. [Process manager (PM2)](#process-manager-pm2)
10. [Docker](#docker)
11. [Remote content backup](#remote-content-backup)
12. [Architecture overview](#architecture-overview)

---

## Requirements

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 18.x LTS | 20.x or 22.x recommended |
| npm | 9+ | Ships with Node |
| git | 2.28+ | Must be on `PATH` and have `init.defaultBranch` support |

No database server is needed. Content is stored as JSON files in a sibling git repository.

---

## Quick start (local dev)

```bash
# 1. Clone the app
git clone https://github.com/chrlic/funcms.git
cd funcms

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
#   Edit .env — at minimum set a real JWT_SECRET

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) and log in with the credentials from your `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). The content repository is created automatically at `../funcms-content` on first run.

---

## Environment variables

Copy `.env.example` to `.env` and edit before first run.

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **yes** | `change-me-in-production` | Secret key for signing auth tokens. Use a random string ≥ 32 chars. |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime, e.g. `1d`, `12h`. |
| `CONTENT_DIR` | no | `../funcms-content` | Path to the git content repository. Absolute or relative to the app root. |
| `GIT_AUTHOR_NAME` | no | `FunCMS` | Name used in content commit messages. |
| `GIT_AUTHOR_EMAIL` | no | `cms@localhost` | Email used in content commit messages. |
| `GIT_REMOTE` | no | _(empty)_ | Remote name to push content after each write, e.g. `origin`. Leave blank to disable. |
| `ADMIN_EMAIL` | no | `admin@localhost` | Email for the seeded admin account (first run only). |
| `ADMIN_PASSWORD` | no | `changeme123` | Password for the seeded admin account (first run only). **Change immediately.** |
| `APP_NAME` | no | `FunCMS` | Displayed in the browser title and admin sidebar. |
| `NODE_ENV` | no | `development` | Set to `production` in production deployments. |

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Git / content store

### How it works

FunCMS keeps all content (pages, users, settings, media metadata) as JSON files inside a dedicated git repository — the **content repo**. Every write produces a git commit, giving you a full audit trail and the ability to restore any page to any previous state from the admin panel.

```
funcms/              ← app code (this repo)
funcms-content/      ← content repo (auto-created, separate repo)
  pages/
  users/
  settings/
  media/
  uploads/
```

The content repo is **created and initialised automatically** at `CONTENT_DIR` on first run. You do not need to create the directory or run `git init` manually. The startup plugin:

1. Creates the directory (including any missing parent directories)
2. Runs `git init` if it is not already a repository
3. Makes an initial commit so `HEAD` exists
4. Sets `user.name` / `user.email` locally inside the repo from `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL`

Because the identity is written into the repo's local config, **global git config is not required** on the server.

### Worktrees and sessions

Each editor session creates a **git worktree** inside `funcms/.worktrees/{sessionId}/`, checked out on a `draft/{user}/{sessionId}` branch. Edits stay on that branch until the editor clicks **Publish**, which merges into `main`. This means:

- Multiple editors can work in parallel without conflicts in most cases.
- Unpublished changes never appear on the public site.
- Merge conflicts are surfaced in the UI for field-by-field resolution.

Worktrees are cleaned up automatically on publish or abandon.

### git identity

Git author identity is set **locally inside the content repo** by the app on every startup, using `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` from `.env`. No global `git config` is required on the server.

The only hard requirement is that the `git` binary is on `PATH`.

---

## Production build

```bash
# Build the Nuxt app
npm run build

# The output is in .output/
# Start the production server
node .output/server/index.mjs
```

The server listens on port `3000` by default. Change it with the `PORT` environment variable:

```bash
PORT=8080 node .output/server/index.mjs
```

---

## Setup on macOS

These steps work on macOS 12 Monterey and later (Intel and Apple Silicon).

### 1 — Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the printed instructions — on Apple Silicon it will ask you to add Homebrew to your `PATH`.

### 2 — Install Node.js

The recommended way is via [nvm](https://github.com/nvm-sh/nvm) so you can switch versions easily:

```bash
brew install nvm
```

Add nvm to your shell (paste into `~/.zshrc` or `~/.bash_profile`):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix nvm)/nvm.sh" ] && source "$(brew --prefix nvm)/nvm.sh"
```

Then reload your shell and install Node:

```bash
source ~/.zshrc          # or source ~/.bash_profile
nvm install 22
nvm use 22
node --version           # v22.x.x
```

Alternatively, install Node directly without nvm:

```bash
brew install node@22
```

### 3 — Install git

macOS ships with Apple git. It works, but the Homebrew version is newer:

```bash
brew install git
git --version            # 2.40+
```

> If `which git` still points to `/usr/bin/git` after installing, add Homebrew's bin to your PATH:
> ```bash
> echo 'export PATH="$(brew --prefix)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
> ```

### 4 — Clone and configure the app

```bash
git clone https://github.com/chrlic/funcms.git
cd funcms
npm install
cp .env.example .env
```

Open `.env` in your editor and set at minimum:

```dotenv
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<your password>
```

### 5 — Run in development mode

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin). The content repo is created automatically at `../funcms-content` on first run.

### 6 — Run as a production server on macOS

Build and start:

```bash
npm run build
node .output/server/index.mjs
```

To keep it running in the background and restart on login, use PM2:

```bash
npm install -g pm2
pm2 start .output/server/index.mjs --name funcms
pm2 save
pm2 startup         # prints a launchctl command — run it to survive reboots
```

### macOS firewall / local access

By default the server is only accessible on `localhost`. To allow other devices on your local network (e.g. testing on a phone):

```bash
PORT=3000 node .output/server/index.mjs
# Then access via http://<your-mac-ip>:3000
```

Find your Mac's IP in **System Settings → Network**, or:

```bash
ipconfig getifaddr en0    # Wi-Fi
ipconfig getifaddr en1    # Ethernet
```

---

## Running on a fresh Linux server

These steps assume Ubuntu 22.04 / Debian 12. Adapt package manager calls for other distros.

### 1 — Install Node.js 22.x

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version   # should print v22.x.x
```

### 2 — Install git

```bash
sudo apt-get install -y git
git --version    # should print 2.34+
```

No global git config is needed — the app writes author identity directly into the content repo on startup using `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` from `.env`.

### 3 — Create an app user (recommended)

```bash
sudo useradd -m -s /bin/bash funcms
sudo su - funcms
```

### 4 — Clone and configure the app

```bash
git clone https://github.com/chrlic/funcms.git
cd funcms
npm install
cp .env.example .env
```

Edit `.env`:

```bash
nano .env
```

Minimum required changes:

```dotenv
JWT_SECRET=<64-char random hex string>
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<strong password>
NODE_ENV=production
```

### 5 — Build

```bash
npm run build
```

### 6 — Start (test run)

```bash
node .output/server/index.mjs
```

Visit `http://<server-ip>:3000/admin`. Log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The content repo is created at `../funcms-content` automatically.

---

## Reverse proxy (nginx)

Install nginx and create a site config:

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/funcms
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase body size limit for media uploads (default 1M is too small)
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host       $host;
        proxy_set_header   X-Real-IP  $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/funcms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically updates the nginx config and sets up auto-renewal.

---

## Process manager (PM2)

PM2 keeps the app running after logout and restarts it on crash.

```bash
sudo npm install -g pm2

# Start the app
pm2 start .output/server/index.mjs \
  --name funcms \
  --env production \
  -- --port 3000

# Save the process list so it survives reboots
pm2 save

# Generate and enable the systemd startup script
pm2 startup systemd -u funcms --hp /home/funcms
# Run the printed sudo command to enable it
```

Useful PM2 commands:

```bash
pm2 status          # list processes
pm2 logs funcms     # tail logs
pm2 restart funcms  # restart after a redeploy
pm2 stop funcms     # stop
```

### Deploying updates

```bash
cd ~/funcms
git pull
npm install
npm run build
pm2 restart funcms
```

---

## Docker

A minimal `Dockerfile` for containerised deployments:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

Build and run:

```bash
docker build -t funcms .

docker run -d \
  --name funcms \
  -p 3000:3000 \
  -v /data/funcms-content:/funcms-content \
  -e JWT_SECRET=<your-secret> \
  -e CONTENT_DIR=/funcms-content \
  -e ADMIN_EMAIL=you@yourdomain.com \
  -e ADMIN_PASSWORD=<your-password> \
  -e NODE_ENV=production \
  funcms
```

Mount `/funcms-content` from the host so content survives container restarts and upgrades.

> **git identity inside Docker** — the container must have git configured. Add these lines before `CMD` in the Dockerfile, or pass them as env vars and configure in an entrypoint script:
> ```dockerfile
> RUN git config --global user.name "FunCMS" && \
>     git config --global user.email "cms@localhost" && \
>     git config --global init.defaultBranch main
> ```

---

## Remote content backup

Set `GIT_REMOTE=origin` in `.env` and add a remote to the content repo after first run:

```bash
cd ../funcms-content
git remote add origin git@github.com:yourorg/funcms-content.git
git push -u origin main
```

Every subsequent content write will push automatically. Use a private repository — content may include user data.

For SSH authentication on the server, add the server's public key to your git host:

```bash
ssh-keygen -t ed25519 -C "cms@yourserver"
cat ~/.ssh/id_ed25519.pub   # add this to GitHub/GitLab deploy keys
```

---

## Architecture overview

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
│  • Public site  →  GET  /              (SSR)        │
│  • Admin panel  →  /admin/**           (SSR + SPA)  │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────────────┐
│  Nuxt 3 (Node.js server — .output/server/index.mjs) │
│                                                     │
│  Nitro API routes  (/api/**)                        │
│  ├── /api/auth/*      — JWT login / logout / me     │
│  ├── /api/pages/*     — CRUD + history + restore    │
│  ├── /api/sessions/*  — draft branches + publish    │
│  ├── /api/media/*     — upload / list / delete      │
│  └── /api/settings    — site-wide configuration     │
│                                                     │
│  BranchedGitStore                                   │
│  ├── In-memory index  (fast reads, no disk I/O)     │
│  ├── Main branch      (published content)           │
│  └── Worktrees        (.worktrees/{sessionId}/)     │
└────────────────────┬────────────────────────────────┘
                     │ fs + simple-git
┌────────────────────▼────────────────────────────────┐
│  Content repository  (funcms-content/)              │
│  ├── pages/{uuid}.json                              │
│  ├── users/{uuid}.json                              │
│  ├── settings/site.json                             │
│  ├── media/{uuid}.json                              │
│  └── uploads/                                      │
│                                                     │
│  Git history  →  full audit trail                   │
│  Git branches →  one per active editor session      │
└─────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Reason |
|---|---|
| Git as database | Full audit trail, history, restore, offline-capable, no DB server to manage |
| Worktrees per session | Concurrent editors on separate branches without HEAD switching |
| SSR (Nuxt 3) | Pages are crawlable, no JS required for public content |
| JWT in httpOnly cookie | XSS-resistant auth; also supports `Authorization` header for API clients |
| Block + slot system | Layouts define named slots (main, sidebar, hero); blocks are assigned to slots |
| Static block registry | All block components statically imported — SSR-safe, no dynamic import issues |
