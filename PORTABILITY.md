# Moonshadow Headquarters — Portability & Restore Guide

This document lets any competent developer (or AI) clone this repository,
configure services, apply migrations, run the app locally, build it, and
deploy it — without needing the original Bolt conversation.

---

## 1. What This Project Is

Moonshadow Headquarters is a creative operating system built as a single-page
React + TypeScript app. It manages projects, production jobs (through a
visible pipeline), a role-based Roundtable conversation system, an asset
library with provenance, a content factory with configurable lanes, a
publishing queue with approval gates, and a tools/connections registry.

The frontend talks directly to a Supabase PostgreSQL database. There is no
custom server application — the database, its RLS policies, and (future)
Supabase Edge Functions ARE the backend.

The project also contains the original Kimmy sci-fi horror landing page and
a Kimmy Studio (gig scout + drafting workspace), preserved as-is.

---

## 2. Technology Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| UI framework   | React 18 + TypeScript                         |
| Build tool     | Vite 5                                        |
| Styling        | Tailwind CSS 3                                |
| Database       | Supabase (PostgreSQL)                         |
| Auth           | Supabase (not yet enabled — no sign-in UI)    |
| Storage        | Supabase Storage (not yet used)               |
| Edge functions | Supabase Edge Functions (not yet deployed)    |
| Fonts          | Google Fonts (Cormorant Garamond, Inter, JetBrains Mono) |

No backend application server. No Docker. No Kubernetes. The app is a
static build served from any static host.

---

## 3. Repository Structure

```
/
├── index.html                  # Vite entry point
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
├── tailwind.config.js          # Tailwind theme (colors, fonts, animations)
├── postcss.config.js           # PostCSS (Tailwind + autoprefixer)
├── .env.example                # Environment variable names (no secrets)
│
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Root component + routing
│   ├── index.css               # Tailwind base + custom component classes
│   │
│   ├── lib/
│   │   ├── router.ts           # Hash-based router (home, studio, hq/*)
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── hq.ts               # Headquarters constants, stages, roles, modules, helpers
│   │   ├── hqTypes.ts          # Headquarters TypeScript interfaces
│   │   ├── genres.ts           # Kimmy Studio genre/status constants
│   │   └── types.ts            # Kimmy Studio TypeScript interfaces
│   │
│   └── components/
│       ├── Nav.tsx             # Landing page navigation
│       ├── Hero.tsx            # Landing hero section
│       ├── Work.tsx            # Landing services section
│       ├── Genres.tsx          # Landing sub-genres section
│       ├── Excerpt.tsx         # Landing excerpt section
│       ├── Process.tsx         # Landing process section
│       ├── OrderForm.tsx       # Landing commission form (writes to story_inquiries)
│       ├── Footer.tsx          # Landing footer
│       ├── Starfield.tsx       # Animated canvas starfield
│       │
│       ├── studio/             # Kimmy Studio (existing, preserved)
│       │   ├── StudioShell.tsx
│       │   ├── StudioOverview.tsx
│       │   ├── GigScout.tsx
│       │   └── DraftingWorkspace.tsx
│       │
│       └── hq/                 # Moonshadow Headquarters
│           ├── HqShell.tsx          # HQ layout + navigation
│           ├── CommandCenter.tsx    # Home screen: active jobs, approvals, activity
│           ├── CreateFlow.tsx       # Idea → project + job creation
│           ├── Projects.tsx         # Project list + detail with job pipeline
│           ├── Roundtable.tsx       # Role-based conversation (Herman, Allie, Challenger, Watcher)
│           ├── AssetLibrary.tsx     # Project-aware media library with provenance
│           ├── ContentFactory.tsx   # Production jobs in configurable lanes
│           ├── PublishingCenter.tsx # Publishing queue with approval gates
│           └── ToolsConnections.tsx # Module registry + external connection status
│
└── supabase/
    └── migrations/
        ├── 20260719173848_create_story_inquiries.sql       # Kimmy landing inquiries
        ├── 20260719174802_create_studio_gigs_drafts.sql     # Kimmy Studio gigs + drafts
        └── 20260830054625_..._create_headquarters_core.sql  # HQ core schema (8 tables)
```

---

## 4. Database Schema

Provider: **Supabase** (managed PostgreSQL)

Project reference: `pxmwpqhpdbooxzhcfndh`
Region: determined by Supabase provisioning

### Tables

| Table                   | Purpose                                              | Migration file                     |
|-------------------------|------------------------------------------------------|------------------------------------|
| `story_inquiries`       | Landing page commission form submissions             | 20260719173848                     |
| `gigs`                  | Kimmy Studio freelance lead tracking                 | 20260719174802                     |
| `drafts`                | Kimmy Studio story drafting workspace                | 20260719174802                     |
| `projects`              | HQ creative projects                                 | 20260830054625                     |
| `jobs`                  | HQ production jobs with pipeline stages              | 20260830054625                     |
| `assets`                | HQ asset library with provenance and revisions       | 20260830054625                     |
| `activity`              | HQ human-readable activity/evidence log              | 20260830054625                     |
| `roundtable_messages`   | HQ role-based conversation                           | 20260830054625                     |
| `approvals`             | HQ approval gates (publish, spend, destructive)      | 20260830054625                     |
| `publish_items`         | HQ publishing queue (ready vs published)             | 20260830054625                     |
| `connections`           | HQ external service connection status                | 20260830054625                     |

### Row Level Security

All tables have RLS enabled. The app is single-tenant (no sign-in screen),
so policies use `TO anon, authenticated` with `USING (true)` — the anon-key
frontend can read and write all data. When sign-in is added later, these
policies must be replaced with ownership-scoped checks using `auth.uid()`.

### Migrations Location

All SQL migrations are in `supabase/migrations/`. They were applied via the
Supabase MCP `apply_migration` tool. To re-apply on a fresh Supabase project,
run the SQL files in chronological order using the Supabase SQL Editor or
`supabase db push` (if using the Supabase CLI locally).

---

## 5. Environment Variables

Only two variables are needed today. Both are **public** (exposed to the
browser by design — the anon key is safe to expose; RLS protects the data).

| Variable                  | Purpose                          | Where to configure           |
|---------------------------|----------------------------------|------------------------------|
| `VITE_SUPABASE_URL`       | Supabase project API URL         | `.env` (local) / host env    |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anon (public) key       | `.env` (local) / host env    |

**No server-side secrets exist yet.** When Edge Functions are deployed for
external API proxying (OpenAI, Stripe, etc.), their secrets are configured
through the Supabase dashboard under Edge Functions > Secrets, never in
`.env` or frontend code.

The following Supabase internal variables exist in the hosting environment
but are NOT needed in `.env`:
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to frontend
- `SUPABASE_DB_URL` — direct Postgres connection string

---

## 6. Local Development Setup

### Prerequisites
- Node.js 18+ 
- A Supabase project (free tier works)

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url> moonshadow-headquarters
cd moonshadow-headquarters

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your Supabase URL and anon key

# 4. Apply database migrations
#    Option A: Use Supabase SQL Editor — paste each .sql file from
#              supabase/migrations/ in chronological order
#    Option B: Use Supabase CLI locally:
#              supabase db push
#              (requires supabase login and project link)

# 5. Start the dev server
npm run dev

# 6. Open the app
#    The app runs at http://localhost:5173
#    Landing page:       /
#    Kimmy Studio:       /#/studio
#    Headquarters:       /#/hq/command
```

### Build

```bash
npm run build
# Output goes to dist/
# This is a static build — serve it from any static host
```

### Preview production build

```bash
npm run preview
```

---

## 7. Deployment Options

The app is a static single-page application. After `npm run build`, the
`dist/` directory can be deployed to:

- **Bolt hosting** — click Publish in Bolt (easiest while developing in Bolt)
- **Netlify** — drag and drop `dist/` or connect the repo for CI/CD
- **Vercel** — connect the repo, framework preset: Vite
- **GitHub Pages** — serve `dist/` via GitHub Actions
- **Any static host** — upload `dist/` contents

The app uses hash-based routing (`#/hq/command`), so no server-side rewrite
rules are needed — all routes work on any static host.

---

## 8. Architecture — Clean Separation

```
UI Layer (React components)
    ↓ calls
State Layer (supabase-js client, in-component state)
    ↓ talks to
Database Layer (Supabase PostgreSQL with RLS)
    ↑ will talk to (future)
Edge Functions (Supabase, for external API proxying with secrets)
```

### Module / Adapter Registry

The module registry (`src/lib/hq.ts`, MODULES array) describes each internal
and external tool with:
- id, name, category
- status: connected / needs-auth / unavailable / development
- description of capabilities

To add a new module, add an entry to the MODULES array. To connect a real
external service, create a Supabase Edge Function that proxies the API
(server-side secrets), then update the module status to `connected`.

### Adapter Boundaries (Prepared, Not Yet Wired)

The following adapters have clean boundaries but need real API contracts
before wiring:

| System                  | What's Needed Before Wiring                                    |
|-------------------------|----------------------------------------------------------------|
| Moonshadow Path         | Path endpoint URL, auth method, job/event schema, callback     |
|                         | contract, rate limits, retry behavior                          |
| Moonshadow Editor       | Editor API for project create/open, asset send, edit request,  |
|                         | preview receive, export receive                                |
| Studio Go               | Capture/ingest API, auth, media transfer mechanism             |
| Skin Studio             | Image generation provider API key (server-side), prompt schema  |
| Kimmy (as HQ module)    | Writing assignment API or shared database access pattern       |
| Publishing connectors   | OAuth credentials per destination (YouTube, Instagram, etc.)   |

No fake API contracts are invented. Each boundary is documented in
`src/components/hq/ToolsConnections.tsx` with honest status.

### Job Pipeline

Stages: `idea → plan → create → review → edit → package → approve → publish → done`

Jobs are stored in the `jobs` table and advanced manually or programmatically.
The pipeline is visualized in the Project detail view and the Content Factory.

### Roundtable Role System

Roles are defined in `src/lib/hq.ts` (ROLES array + ROLE_META). The system
is designed as roles, not hard-coded personalities. To add a new specialist,
add an entry to ROLES and ROLE_META, then add response logic in
`src/components/hq/Roundtable.tsx` (generateRoleResponse function).

### Activity / Evidence Log

Every important action writes to the `activity` table via the `logActivity`
helper in `src/lib/hq.ts`. This makes it impossible for the system to
quietly claim something happened when it did not.

### Approval System

Destructive, expensive, private, or public-facing actions create entries in
the `approvals` table with status `pending`. The creator approves or rejects
them. The publishing flow uses this gate before anything goes live.

---

## 9. What Travels With the Source Code

✅ Complete UI (all React components)
✅ Complete routing system
✅ Complete TypeScript types
✅ All database migrations (SQL files)
✅ Tailwind theme and styling
✅ Module registry and adapter boundaries
✅ Herman/Roundtable role system
✅ Job pipeline definitions
✅ Activity logging helpers
✅ Build configuration

## 10. What Does NOT Travel With the Source Code

These require migration or recreation if moving to a new environment:

| Item                    | Current Location         | Migration Action                          |
|-------------------------|--------------------------|-------------------------------------------|
| Database data           | Supabase project         | Export via `supabase db dump` or SQL      |
| Supabase project config | Supabase dashboard       | Create new project, apply migrations      |
| Supabase project URL    | `.env`                   | Update `VITE_SUPABASE_URL`                |
| Supabase anon key       | `.env`                   | Update `VITE_SUPABASE_ANON_KEY`           |
| Supabase service role   | Supabase dashboard       | Available in new project dashboard        |
| Edge function secrets   | Not yet configured       | Configure in Supabase dashboard when added|
| Hosting/deployment      | Bolt (or chosen host)    | Deploy `dist/` to new host                |
| Custom domain           | Not yet configured       | Configure at new host                     |

---

## 11. Bolt-Specific Dependencies

The following are tied to the Bolt development environment:

- **Bolt dev server** — runs Vite automatically; not needed outside Bolt
- **Bolt hosting** — optional publishing target; replaceable with any static host
- **Bolt GitHub sync** — automatic commit syncing; replaceable with standard git
- **Supabase MCP tools** — used for migrations in Bolt; replaceable with
  Supabase CLI or SQL Editor outside Bolt

The application code itself has **zero Bolt-specific dependencies**. It is a
standard Vite + React + TypeScript app that runs anywhere Node.js is available.

---

## 12. Continuing Development

### From Bolt
Continue as normal. If GitHub is connected, Bolt auto-commits changes.

### From outside Bolt
```bash
git pull
npm install
npm run dev
```

### Adding a new Headquarters feature
1. Define types in `src/lib/hqTypes.ts`
2. Add constants to `src/lib/hq.ts`
3. Create the component in `src/components/hq/`
4. Add the route in `src/lib/router.ts`
5. Wire it into `src/App.tsx`
6. Apply any database migration via Supabase MCP or SQL Editor
7. Run `npm run build` to verify

### Adding a new database table
1. Write the migration SQL in `supabase/migrations/`
2. Apply via Supabase SQL Editor or `supabase db push`
3. Enable RLS and add policies (see existing migrations for patterns)
4. Add the TypeScript interface in `src/lib/hqTypes.ts`

---

## 13. Verification

To verify the project is working after a restore:

```bash
npm install
npm run build   # should succeed with no TypeScript errors
npm run dev     # app should load at localhost:5173
```

Then in the browser:
- `/` — landing page should render with hero, work, genres, excerpt, process, order form
- `/#/studio` — Kimmy Studio overview should load
- `/#/hq/command` — Headquarters Command Center should load and show empty states
- `/#/hq/create` — Create flow should accept an idea and create a project + job
- `/#/hq/projects` — the created project should appear
- `/#/hq/roundtable` — Roundtable should load with 4 role seats
- `/#/hq/assets` — Asset Library should load
- `/#/hq/factory` — Content Factory should load with default lanes
- `/#/hq/publish` — Publishing Center should load
- `/#/hq/tools` — Tools & Connections should show all modules and connections

If any page is blank, check the browser console — the most common issue is
missing or incorrect Supabase environment variables.
