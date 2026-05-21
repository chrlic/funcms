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
7. [Running on a fresh Linux server — Debian / Ubuntu](#running-on-a-fresh-linux-server--debian--ubuntu)
8. [Running on a fresh Linux server — RHEL / CentOS / Fedora](#running-on-a-fresh-linux-server--rhel--centos--fedora)
9. [Reverse proxy (nginx)](#reverse-proxy-nginx)
10. [Process manager (PM2)](#process-manager-pm2)
11. [Docker](#docker)
12. [Remote content backup](#remote-content-backup)
13. [Architecture overview](#architecture-overview)

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
2. Initialises the `simple-git` instance against that directory
3. Runs `git init` if it is not already a repository
4. Makes an initial commit so `HEAD` exists
5. Sets `user.name` / `user.email` locally inside the repo from `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL`

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

## Running on a fresh Linux server — Debian / Ubuntu

These steps are for Ubuntu 22.04 / 24.04 and Debian 11 / 12.

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

## Running on a fresh Linux server — RHEL / CentOS / Fedora

These steps cover:
- **RHEL 8 / 9** and **AlmaLinux 8 / 9** and **Rocky Linux 8 / 9**
- **CentOS Stream 9**
- **Fedora 38+**

Commands use `dnf`. On older CentOS 7 / RHEL 7 replace `dnf` with `yum`.

### 1 — Install Node.js 22.x

Use the NodeSource repository:

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
node --version   # v22.x.x
npm --version
```

On **Fedora** the default repo often has a recent-enough Node:

```bash
sudo dnf install -y nodejs npm
node --version
```

If the version is too old, use the NodeSource method above instead.

### 2 — Install git

```bash
sudo dnf install -y git
git --version    # 2.39+ on RHEL 9 / Fedora
```

On **RHEL 8** the default git may be 2.27. That's sufficient, but if you want newer:

```bash
sudo dnf install -y https://packages.endpointdev.com/rhel/8/os/x86_64/endpoint-repo.x86_64.rpm
sudo dnf install -y git
```

No global git config is needed — identity is written into the content repo by the app on startup.

### 3 — Open the firewall port

RHEL-family systems use `firewalld` by default:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

If you are running nginx as a reverse proxy (recommended) you only need port 80/443:

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 4 — Create an app user (recommended)

```bash
sudo useradd -m -s /bin/bash funcms
sudo su - funcms
```

### 5 — Clone and configure the app

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

Generate a secure `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 6 — Build

```bash
npm run build
```

### 7 — Start (test run)

```bash
node .output/server/index.mjs
```

Visit `http://<server-ip>:3000/admin`. The content repo is created at `../funcms-content` automatically.

### SELinux note

If the app starts but the browser gets connection refused even with the port open, SELinux may be blocking Node from binding. Allow it:

```bash
# Allow Node.js to listen on port 3000
sudo semanage port -a -t http_port_t -p tcp 3000
```

If `semanage` is not installed:

```bash
sudo dnf install -y policycoreutils-python-utils
```

Alternatively, if running behind nginx (recommended), only nginx needs port access and Node only listens on `127.0.0.1` — no SELinux change needed for the app port itself.

---

## Reverse proxy (nginx)

Install nginx:

```bash
# Debian / Ubuntu
sudo apt-get install -y nginx

# RHEL / AlmaLinux / Rocky / CentOS Stream / Fedora
sudo dnf install -y nginx
sudo systemctl enable --now nginx
```

On RHEL-family systems nginx uses `/etc/nginx/conf.d/` instead of `sites-available`. Create a config file there:

```bash
# Debian / Ubuntu
sudo nano /etc/nginx/sites-available/funcms

# RHEL-family
sudo nano /etc/nginx/conf.d/funcms.conf
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
# Debian / Ubuntu — enable via symlink
sudo ln -s /etc/nginx/sites-available/funcms /etc/nginx/sites-enabled/

# All distros — test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS with Let's Encrypt

```bash
# Debian / Ubuntu
sudo apt-get install -y certbot python3-certbot-nginx

# RHEL-family
sudo dnf install -y certbot python3-certbot-nginx

# All distros
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically updates the nginx config and sets up auto-renewal.

---

## Process manager (PM2)

PM2 keeps the app running after logout, restarts it on crash, and integrates with systemd so it survives reboots. These instructions apply to both Debian/Ubuntu and RHEL-family systems.

### Install PM2

```bash
sudo npm install -g pm2
```

### Start the app

Run this as the `funcms` user (or whichever user owns the app directory):

```bash
cd ~/funcms
pm2 start .output/server/index.mjs \
  --name funcms \
  --env production \
  -- --port 3000
```

Verify it started:

```bash
pm2 status
```

You should see `funcms` listed with status `online`.

### Enable auto-start on boot (systemd)

This works on all modern Linux distributions (Ubuntu, Debian, RHEL, AlmaLinux, Rocky, Fedora — anything running systemd):

```bash
# Generate the startup hook — run as the app user
pm2 startup systemd -u funcms --hp /home/funcms
```

PM2 prints a `sudo env ...` command. **Copy and run that exact command** — it registers a systemd service that starts PM2 on boot.

Then save the current process list so PM2 knows what to restore:

```bash
pm2 save
```

Confirm the systemd service is active:

```bash
sudo systemctl status pm2-funcms
```

### Managing the service

```bash
pm2 status                  # show all processes and their state
pm2 logs funcms             # tail live logs (Ctrl+C to exit)
pm2 logs funcms --lines 100 # last 100 log lines
pm2 restart funcms          # restart the app
pm2 reload funcms           # zero-downtime reload (for config changes)
pm2 stop funcms             # stop without removing from process list
pm2 delete funcms           # remove from PM2 entirely
pm2 monit                   # live CPU / memory dashboard
```

Via systemd (useful for scripting or if PM2 daemon itself needs restarting):

```bash
sudo systemctl stop pm2-funcms
sudo systemctl start pm2-funcms
sudo systemctl restart pm2-funcms
sudo journalctl -u pm2-funcms -f   # systemd logs for the PM2 daemon
```

### Environment variables

PM2 reads environment variables from the shell it was started in, but for production it is better to use an ecosystem file so variables are explicit and survive restarts:

```bash
# ~/funcms/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'funcms',
    script: '.output/server/index.mjs',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
```

Start with the ecosystem file:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
```

> Add `ecosystem.config.cjs` to `.gitignore` if it contains secrets. Prefer keeping secrets in `.env` (loaded by the app at runtime) rather than in the ecosystem file.

### Log rotation

PM2 logs grow unbounded by default. Install the log-rotate module:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Deploying updates

```bash
cd ~/funcms
git pull
npm install          # pick up any new dependencies
npm run build        # rebuild .output/
pm2 reload funcms    # zero-downtime swap to the new build
```

If the build fails, the old version keeps running. Only `pm2 reload` (not `restart`) guarantees zero downtime — it starts the new process before killing the old one.

### Checking what's registered with systemd

```bash
# List all PM2-managed systemd services
systemctl list-units | grep pm2

# Show full service file PM2 generated
cat /etc/systemd/system/pm2-funcms.service
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
