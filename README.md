# Iwosan Integration Hub

A centralized internal web platform for the Iwosan Healthcare network — providing staff, partners, and stakeholders with a single destination for news, resources, leadership information, learning content, and quick access to operational tools.

---

## Overview

The Iwosan Integration Hub is a full-stack application: a React single-page frontend backed by an Express API and a Postgres database. It serves as the digital front door for the Iwosan Healthcare group — surfacing the group's five subsidiary platforms, news and announcements, leadership profiles, a learning centre (courses, learning paths, live sessions), a picture library, and an AI assistant ("Ivy") — alongside an admin/CMS panel for managing that content and a set of authenticated users.

Some content (company overview, leadership bios, subsidiary directory, milestones) is static, bundled at build time from `src/data/`. Content that changes regularly (news, courses, learning paths, sessions, picture library) is fully database-driven and editable through the admin/CMS panel.

---

## Tech Stack

| Layer | Technology |
| - | - |
| Frontend framework | React 18 + TypeScript 5 |
| Build tool | Vite 8 (SWC compiler) |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix) |
| Routing | React Router DOM 6 |
| State/Data | TanStack Query 5 |
| Forms | React Hook Form + Zod |
| Backend | Express 5 (single-file server, `server.js`) |
| Database | PostgreSQL (`pg`) |
| Auth | JWT (httpOnly cookie + bearer) + Azure AD SSO (MSAL, 3 orgs) |
| AI assistant | Groq (streaming chat completion) |
| Testing | Vitest + Testing Library |
| Process manager | pm2 (production) |
| Web server | nginx (reverse proxy + static hosting, production) |

---

## Architecture

- **Frontend**: Vite-built React SPA, served as static files by nginx in production.
- **Backend**: a single Express server (`server.js`) exposing `/api/*` — auth, admin/user management, CMS CRUD (news, courses, learning paths, sessions, picture library), image upload (stored as blobs in Postgres, not on disk), and the `/api/chat` streaming endpoint for the Ivy AI assistant.
- **Database**: PostgreSQL. Schema in `schema.sql`, applied via `npm run setup-db`.

**Environments:**

| Environment | Branch | Frontend hosting | Backend/API hosting | Database |
| - | - | - | - | - |
| Production | `master` | AWS EC2 (`Integration-Hub`, nginx) | AWS EC2 (`Integration-Hub`, pm2) | AWS EC2 (`Integration-Hub-DB`, Postgres, private subnet) |
| UAT | `develop` | Netlify | Railway | Railway Postgres |

Production deploys automatically on every push to `master` via a GitHub Actions workflow (`.github/workflows/deploy.yml`) running on a self-hosted runner installed on `Integration-Hub` — no inbound SSH exposure is needed for CI/CD. UAT redeploys automatically via Netlify's and Railway's own native GitHub integrations on push to `develop`.

See [`deploy/nginx.conf`](deploy/nginx.conf) and [`ecosystem.config.cjs`](ecosystem.config.cjs) for the production nginx and pm2 configuration.

---

## Project Structure

```text
server.js               # Express API (auth, admin, CMS CRUD, chat, uploads)
schema.sql               # Postgres schema, applied by scripts/setup-db.js
ecosystem.config.cjs     # pm2 process config (production)
deploy/nginx.conf        # nginx config (production: static hosting + API reverse proxy)
.github/workflows/       # GitHub Actions (deploy.yml — master branch, self-hosted runner)
scripts/                 # DB setup, user management, image migration/backup utilities

src/
├── assets/               # Images, logos, video
├── components/           # Shared UI (navbar, footer, chat widget, sidebar, etc.)
│   ├── cms/               # CMS editing widgets (image/gallery fields, search bar)
│   │   └── previews/       # Live preview dialogs for CMS content
│   └── ui/                # shadcn/ui primitives
├── contexts/
│   └── AuthContext.tsx    # Global auth state
├── data/
│   ├── hub-data.ts        # Static: core values, subsidiary cards, leadership, milestones
│   └── subsidiary-data.ts # Static: detailed per-subsidiary portal info
├── hooks/                 # useInactivityLogout, useScrollAnimation, use-mobile, use-toast
├── layouts/
│   ├── HubLayout.tsx      # Public/authenticated hub shell (navbar, footer, chat widget)
│   ├── AdminLayout.tsx    # Admin panel shell (dashboard, users, CMS)
│   └── CmsLayout.tsx      # CMS-editor-only shell (content management, no user admin)
├── lib/
│   ├── msalConfig.ts      # Azure AD app registrations (3 orgs)
│   └── utils.ts           # cn(), slugify, date formatting
├── pages/                 # Public hub pages (Home, About, News, Learning, etc.)
│   ├── admin/              # Admin dashboard, user management, CMS managers
│   └── cms/                # CMS-editor dashboard + shared CMS managers
├── services/
│   ├── authService.ts     # Auth + user-management API calls, Azure MSAL login flow
│   └── cmsService.ts      # Public content reads + CMS CRUD + image upload
└── test/                  # Vitest setup (minimal test coverage — see Testing below)
```

---

## Getting Started

### Prerequisites

- Node.js 22 (matches production; 18+ generally works)
- npm 9 or later
- A local or reachable PostgreSQL instance

### Installation

```bash
git clone <repository-url>
cd iwosan-integration-hub

npm install
cp .env.example .env.local   # fill in DB credentials, JWT_SECRET, etc.
npm run setup-db             # creates tables + a seed admin user
```

### Development

The frontend and backend run as two separate processes locally:

```bash
npm run dev        # Vite dev server on :5173
node server.js      # Express API on :3001 (set PORT in .env.local if needed)
```

The frontend talks to the API via `VITE_API_BASE_URL` (see `.env.example`), not a Vite proxy — set it to `http://localhost:3001` for local dev.

### Production build

```bash
npm run build
```

Output goes to `dist/`, served by nginx in production. Preview a build locally with `npm run preview`.

### Other commands

```bash
npm run lint          # ESLint check
npm run test          # Run Vitest tests once
npm run test:watch    # Watch mode
npm run create-user    # CLI to create a single portal user
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list with inline explanations. Key groups:

- **`VITE_API_BASE_URL`** — where the frontend sends API requests
- **`DB_*`** — Postgres connection (host, port, name, user, password, SSL). In production, `DB_HOST` points at the private IP of the `Integration-Hub-DB` instance.
- **`JWT_SECRET`, `COOKIE_DOMAIN`, `ALLOWED_ORIGINS`** — auth/session and CORS config. `ALLOWED_ORIGINS` is a comma-separated exact-match list — include every origin the frontend is actually served from (e.g. both the apex domain and `www`).
- **`AZURE_*` / `VITE_AZURE_*`** (×3 orgs: Lagoon Hospitals, Iwosan Healthcare, Euracare) — Azure AD app registration IDs for Microsoft SSO.
- **`GROQ_API_KEY`** — powers the Ivy AI assistant's chat completions.

---

## Authentication

Two login paths, both issuing the same JWT:

1. **Email/password** — bcrypt-checked against the `users` table, rate-limited. First-login users are forced through a change-password flow.
2. **Microsoft SSO** — MSAL popup login against one of three Azure AD tenants (Lagoon Hospitals, Iwosan Healthcare, Euracare), verified server-side and matched/created against the `users` table.

The JWT is set as both an httpOnly cookie and returned to the client (cached in `localStorage`, sent as `Authorization: Bearer` on every request) — the server accepts either. Azure-SSO users are auto-logged-out after an hour of inactivity; password-based users are not.

**Roles**: `user`, `manager`, `admin`, plus an independent `canEditCms` boolean that can be granted to any role. `admin`/`manager` get the full admin panel (`/admin/*`, including user management); `canEditCms` alone grants the CMS-only panel (`/cms/*`) without user management access.

---

## Content Management

**Database-driven** (full CRUD via the admin/CMS panel, public reads via `src/services/cmsService.ts` → `/api/*`): news articles, courses, learning paths, live sessions, picture library. Images are uploaded and stored as blobs in the `cms_images` Postgres table, not on local disk (hosting platforms like Railway/ephemeral containers wipe local files on redeploy).

**Static** (edited directly in code, bundled at build time — no CMS involved): company core values, subsidiary summary cards, leadership/board bios, milestones, and detailed per-subsidiary portal info. Lives in [`src/data/hub-data.ts`](src/data/hub-data.ts) and [`src/data/subsidiary-data.ts`](src/data/subsidiary-data.ts).

---

## Database

- **Schema**: [`schema.sql`](schema.sql) — applied by `npm run setup-db`, which also seeds an initial admin user.
- **Scripts** (`scripts/`):
  - `setup-db.js` — one-time bootstrap: applies schema, seeds admin user.
  - `create-user.js` — CLI to create a single portal user with a generated temp password.
  - `export-cms-images.mjs` — backs up all `cms_images` rows to local disk.
  - `migrate-uploads-to-db.mjs` — one-off migration of legacy disk-based upload references into the DB.
  - `optimize-images.py` — Pillow-based static asset resize/compression to WebP (requires `pip install Pillow`).

---

## Testing

Vitest + Testing Library are configured and functional (`npm test`), but coverage is currently minimal — only a placeholder test exists. Routing, auth, CMS services, and components do not yet have real test coverage; this is a known gap, not an oversight to rely on.

---

## Subsidiaries

The hub represents five platforms in the Iwosan network:

| Platform | Category | Website |
| - | - | - |
| Iwosan Healthcare Systems Limited | Corporate | iwosanhealth.com |
| Iwosan Lagoon Hospitals Limited | Hospital | lagoonhospitals.com |
| Eurapharma Care Services Nigeria Limited | Hospital | euracarehealth.com |
| Paelon Memorial Hospital Limited | Hospital | paelonmemorial.com |
| IASO Medipark Limited | Medical Campus | iasomedipark.com |

---

## Deployment

**Production** (`master` branch) runs on two AWS EC2 instances:

- `Integration-Hub` — nginx (static frontend + reverse proxy to the API) and the Express API under pm2. See [`deploy/nginx.conf`](deploy/nginx.conf) and [`ecosystem.config.cjs`](ecosystem.config.cjs).
- `Integration-Hub-DB` — PostgreSQL, private subnet only, reachable exclusively from `Integration-Hub`.

Deploys are automatic: pushing to `master` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which runs on a self-hosted GitHub Actions runner installed directly on `Integration-Hub` (`git pull` → `npm install` → `npm run build` → `pm2 restart`). SSL is handled by certbot/Let's Encrypt with auto-renewal.

**UAT** (`develop` branch) deploys automatically via Netlify (frontend) and Railway (backend + Postgres), using their native GitHub integrations — no custom workflow needed there.

Suggested flow: push to `develop`, verify on UAT, then merge/push to `master` (via PR or direct push) to release to production.

---

## License

Internal use only — © Iwosan Healthcare Systems Limited. All rights reserved.
