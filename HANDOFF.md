# Moonshadow Headquarters — Handoff Packet for Aki

**Date:** 2026-08-30
**Project:** Moonshadow Headquarters (package.json name: `kimmy-sci-fi-horror`)
**Version:** 1.0.0
**Prepared by:** Allie (Architect / Planner)
**Zip:** `project-handoff.zip` — 128KB, 53 files (excludes node_modules, .env, .bolt, build artifacts)

---

## 1. What This Is

Moonshadow Headquarters is a creative operating system — a single-page
React + TypeScript app that manages projects, production jobs, a role-based
conversation system, an asset library, a content factory, a publishing queue,
a tools/connections registry, and a universal machine connection layer called
Dock. It also preserves the original Kimmy sci-fi horror fiction landing page
and Kimmy Studio (gig scout + drafting workspace).

The frontend talks directly to a Supabase PostgreSQL database. There is no
custom server application. The database, its RLS policies, and (future)
Supabase Edge Functions are the backend.

---

## 2. Technology Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| UI framework   | React 18 + TypeScript (strict mode)           |
| Build tool     | Vite 5                                        |
| Styling        | Tailwind CSS 3                                |
| Database       | Supabase (PostgreSQL), project ref `pxmwpqhpdbooxzhcfndh` |
| Auth           | Supabase — NOT yet enabled (no sign-in UI)    |
| Storage        | Supabase Storage — not yet used               |
| Edge functions | Supabase Edge Functions — none deployed       |
| Fonts          | Google Fonts: Cormorant Garamond, Inter, JetBrains Mono |
| Routing        | Hash-based (custom, no library)               |

No backend application server. No Docker. No Kubernetes. Static build served
from any static host.

---

## 3. Complete File Structure (53 files)

```
/
├── .env                          # Real Supabase credentials (NOT in zip, NOT committed)
├── .env.example                  # Template: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .gitkeep                      # Empty root marker
├── .bolt/mcp.json                # Bolt MCP config (Bolt-specific, not portable)
│
├── DOCK.md                       # Dock architecture & developer guide (301 lines)
├── PORTABILITY.md                # Full portability/restore guide (405 lines)
├── README.md                     # Quick start + feature overview (39 lines)
├── HANDOFF.md                    # This document
│
├── index.html                    # Vite entry, Google Fonts, horror meta description
├── package.json                  # name: kimmy-sci-fi-horror, deps: React 18, Supabase JS, Vite 5
├── package-lock.json             # Lockfile
├── postcss.config.js             # Tailwind + autoprefixer
├── tailwind.config.js            # 4 color ramps (ink/blood/toxic/amber), 3 font families, 5 animations
├── tsconfig.json                 # Strict, ES2020, bundler resolution, noEmit
├── tsconfig.tsbuildinfo          # Build cache (should be gitignored)
├── vite.config.ts                # Minimal — React plugin only
│
├── public/
│   └── favicon.svg               # Dark circle with red ring
│
├── src/
│   ├── main.tsx                  # React 18 root, StrictMode
│   ├── App.tsx                   # Root component, hash-route switch (landing/studio/hq)
│   ├── index.css                 # Tailwind base + 20 custom component classes
│   ├── vite-env.d.ts             # Vite env type declarations
│   │
│   ├── lib/
│   │   ├── router.ts             # Hash router: 15 routes, useRoute() hook, navigate()
│   │   ├── supabase.ts           # Supabase client singleton (persistSession: false)
│   │   ├── hq.ts                 # HQ constants + helpers (stages, roles, modules, assets, etc.)
│   │   ├── hqTypes.ts            # 7 interfaces: Project, Job, Asset, Activity, etc.
│   │   ├── types.ts              # Kimmy Studio types: Gig, Draft
│   │   ├── genres.ts             # Kimmy Studio constants: 8 genres, 7 gig statuses, 6 draft statuses
│   │   ├── dockTypes.ts          # Dock types: 7 statuses, 7 adapters, 6 auth types, 14 capabilities
│   │   └── dockAdapters.ts       # 7 adapter implementations, capability discovery, handoff builder
│   │
│   └── components/
│       ├── Nav.tsx               # Landing nav
│       ├── Hero.tsx              # Landing hero
│       ├── Work.tsx              # Landing services
│       ├── Genres.tsx            # Landing sub-genres
│       ├── Excerpt.tsx           # Landing excerpt
│       ├── Process.tsx           # Landing process
│       ├── OrderForm.tsx         # Commission form (writes to story_inquiries)
│       ├── Footer.tsx            # Landing footer
│       ├── Starfield.tsx         # Animated canvas starfield
│       │
│       ├── studio/               # Kimmy Studio (preserved)
│       │   ├── StudioShell.tsx
│       │   ├── StudioOverview.tsx
│       │   ├── GigScout.tsx
│       │   └── DraftingWorkspace.tsx
│       │
│       └── hq/                   # Moonshadow Headquarters
│           ├── HqShell.tsx           # HQ layout + navigation (10 nav items)
│           ├── CommandCenter.tsx     # Active jobs, approvals, activity stream
│           ├── CreateFlow.tsx        # Idea → project + job creation
│           ├── Projects.tsx          # Project list + detail with 9-stage pipeline
│           ├── Roundtable.tsx        # Role-based conversation (4 roles)
│           ├── AssetLibrary.tsx      # Project-aware media with provenance
│           ├── ContentFactory.tsx    # Production jobs in configurable lanes
│           ├── PublishingCenter.tsx  # Publishing queue with approval gates
│           ├── ToolsConnections.tsx  # Module registry + external service status
│           └── Dock.tsx              # Machine registry, add wizard, tests, capability search
│
└── supabase/
    └── migrations/
        ├── 20260719173848_create_story_inquiries.sql        # story_inquiries
        ├── 20260719174802_create_studio_gigs_drafts.sql      # gigs + drafts
        ├── 20260830054625_..._create_headquarters_core.sql.sql  # 8 HQ tables (NOTE: double .sql ext)
        └── 20260830062830_..._create_moonshadow_dock.sql     # 3 Dock tables + 7 seed machines
```

---

## 4. Database — Complete Schema (14 tables, 4 migrations)

### Migration 1: story_inquiries (2026-07-19)
Landing page commission form submissions.
- Columns: id (uuid PK), name, email, sub_genre, length, tone, idea, elements, status (default 'new'), created_at
- RLS: anon+authenticated, USING(true) for all CRUD

### Migration 2: gigs + drafts (2026-07-19)
Kimmy Studio freelance lead tracking and story drafting.
- **gigs**: id, source, url, client, title, genre, brief, word_count, budget_usd, deadline, status (default 'new'), notes, created_at, updated_at
- **drafts**: id, gig_id (FK→gigs, SET NULL), title, genre, brief, outline, scaffold, final_copy, word_count_target, status (default 'idea'), created_at, updated_at
- Triggers: bump_updated_at() on both tables
- Indexes: gigs(status), gigs(genre), drafts(status), drafts(genre), drafts(gig_id)
- RLS: anon+authenticated, USING(true) for all CRUD

### Migration 3: Headquarters Core (2026-08-30) — 8 tables
- **projects**: id, title, goal, status (default 'active'), type, tone, target_platform, duration, notes, created_at, updated_at
- **jobs**: id, project_id (FK→projects CASCADE), title, kind (default 'production'), stage (default 'idea'), brief, script, shots, narration, music, captions, edit_notes, package_title, package_description, thumbnail, rights, assigned_to, error, created_at, updated_at
- **assets**: id, project_id (FK→projects CASCADE), job_id (FK→jobs SET NULL), name, kind, source, tool, prompt, url, revision (default 1), rights, meta (jsonb), created_at
- **activity**: id, project_id (FK→projects CASCADE), job_id (FK→jobs CASCADE), actor, action, category (default 'info'), detail, created_at
- **roundtable_messages**: id, project_id (FK→projects CASCADE), role, message, addressed_to, kind (default 'message'), proposed_action, created_at
- **approvals**: id, project_id (FK→projects CASCADE), job_id (FK→jobs CASCADE), title, description, status (default 'pending'), category (default 'general'), created_at, decided_at
- **publish_items**: id, project_id (FK→projects CASCADE), job_id (FK→jobs SET NULL), title, description, caption, thumbnail, destination, status (default 'ready'), scheduled_for, published_at, rights, created_at
- **connections**: id (text PK), name, category, status (default 'needs-auth'), detail, updated_at
- Triggers: touch_updated_at() on projects, jobs, connections
- Indexes: 9 indexes across all tables
- Seed data: 13 connections (Google Drive, Gmail, YouTube, Instagram, Facebook, TikTok, X, OpenAI, Slack, Notion, Spotify, GitHub, Moonshadow Path)
- RLS: anon+authenticated, USING(true) for all CRUD (via DO block loop)

### Migration 4: Moonshadow Dock (2026-08-30) — 3 tables
- **dock_machines**: id (text PK/slug), name, description, location_url, api_base_url, source_repo, adapter_type (default 'web'), invocation_detail (jsonb), capabilities (text[]), accepted_inputs (text[]), produced_outputs (text[]), auth_type (default 'none'), credential_ref, connection_status (default 'unknown'), health_status (default 'unknown'), last_connected_at, last_failure_at, last_failure_reason, machine_type, version, owner_source, notes, manifest (jsonb), created_at, updated_at
- **dock_handoffs**: id (uuid PK), correlation_id (uuid), job_id (FK→jobs SET NULL), project_id (FK→projects SET NULL), requested_action, creator_instructions, payload (jsonb), asset_refs (text[]), source_machine_id (FK→dock_machines SET NULL), destination_machine_id (FK→dock_machines SET NULL), expected_output, approval_state (default 'not-required'), approval_id (FK→approvals SET NULL), provenance (text[]), status (default 'pending'), result (jsonb), error, retries (default 0), created_at, updated_at, sent_at, received_at
- **dock_connection_tests**: id (uuid PK), machine_id (FK→dock_machines CASCADE), test_type, http_status, response_body, latency_ms, success (default false), error, created_at
- Triggers: touch_dock_updated_at() on dock_machines, dock_handoffs
- Indexes: 7 indexes including GIN on capabilities array
- Seed data: 7 machines (moonshadow-path, studio-go, moonshadow-editor, kimmy, skin-studio, content-factory, code-lab) — each with full JSONB manifest
- RLS: anon+authenticated, USING(true) for all CRUD (via DO block loop)

### RLS Summary
ALL 14 tables have RLS enabled. All use `TO anon, authenticated` with
`USING (true)` — single-tenant, no sign-in. When auth is added, these must
be replaced with `auth.uid()` ownership checks.

---

## 5. App Architecture

### Routing (hash-based, 15 routes)
- `/` — landing page
- `/#/studio` — Kimmy Studio overview
- `/#/studio/gigs` — gig scout
- `/#/studio/drafts` — drafting workspace
- `/#/hq/command` — Command Center
- `/#/hq/create` — Create Flow
- `/#/hq/projects` — Projects list
- `/#/hq/projects/:id` — Project detail
- `/#/hq/roundtable` or `/#/hq/roundtable/:projectId` — Roundtable
- `/#/hq/assets` — Asset Library
- `/#/hq/factory` — Content Factory
- `/#/hq/publish` — Publishing Center
- `/#/hq/tools` — Tools & Connections
- `/#/hq/dock` — Dock

### Job Pipeline (9 stages)
`idea → plan → create → review → edit → package → approve → publish → done`
Color-coded: ink (early), toxic (create/review), amber (edit/package), blood (approve/publish/done)

### Roundtable Roles (4)
- **Herman** (⬡) — Operator / Router
- **Allie** (◈) — Architect / Planner
- **Challenger** (⊘) — Tester / Critic
- **Watcher** (◎) — Optimizer / Observer

### Module Registry (8 modules in hq.ts)
Studio Go (needs-auth), Moonshadow Editor (needs-auth), Kimmy (connected),
Skin Studio (needs-auth), Content Factory (connected), Code Lab (needs-auth),
Asset Library (connected), Publishing (connected)

### Activity Logging
`logActivity()` in hq.ts — fire-and-forget POST to Supabase REST API.
Records actor, action, category, detail. Categories: info, create, approve,
publish, error, system.

### Approval System (5 categories)
publish, spend, destructive, private, general. Status: pending → approved/rejected.

---

## 6. Dock — Universal Connection Layer

### 7 Adapter Types (all in dockAdapters.ts)
Each implements `test()` and `send()` with 15s timeout via AbortController:
- **rest** — GET to test, POST to send
- **webhook** — POST test payload, POST envelope
- **mcp** — JSON-RPC tools/list to test, tools/call to send
- **web** — GET to test. send() fails (no programmatic handoff)
- **github** — GitHub API repo check. send() fails (needs runner)
- **file** — No network. Verifies path configured. send() fails (manual)
- **internal** — No network. Verifies registration. send() fails (contract TBD)

### 14 Capabilities (extensible)
WRITE_STORY, WRITE_SCRIPT, GENERATE_IMAGE, EDIT_IMAGE, GENERATE_VIDEO,
EDIT_VIDEO, GENERATE_AUDIO, TRANSCRIBE, STORE_ASSET, SEARCH_ASSETS,
PACKAGE_PROJECT, PUBLISH, RUN_CODE, ROUTE_JOB

### Key Functions
- `findMachinesByCapability()` — machines with capability, connected or ready
- `findConnectedMachinesByCapability()` — only connected machines
- `buildHandoffEnvelope()` — creates envelope with crypto.randomUUID() correlation ID
- `buildManifest()` — portable Machine Manifest
- `saveTestResult()` — persists test to dock_connection_tests
- `updateMachineHealth()` — updates machine status after real test (only upgrades to "connected" on success)

### Secret Handling
`credential_ref` stores only the NAME of the server-side secret. Actual
secrets belong in Supabase Edge Function secrets. UI never shows credential values.

### 7 Seeded Machines
moonshadow-path (rest, development), studio-go (web, ready-to-connect),
moonshadow-editor (web, ready-to-connect), kimmy (internal, connected),
skin-studio (web, ready-to-connect), content-factory (internal, connected),
code-lab (github, needs-auth)

---

## 7. Design System

### Colors (4 ramps × 8-9 shades)
- **ink** (950→100) — dark neutral backgrounds and text
- **blood** (900→300) — red, primary accent / error
- **toxic** (900→300) — teal, success / connected
- **amber** (900→300) — gold, warning / pending

### Fonts (3 families, loaded via Google Fonts in index.html)
- Cormorant Garamond — display/headings
- Inter — body text
- JetBrains Mono — code/labels/eyebrows

### Custom CSS (index.css, 20 component classes)
grain (film noise overlay), vignette, container-narrow, container-prose,
btn-primary, btn-ghost, btn-secondary, btn-danger, field-label, field-input,
field-textarea, field-select, card, card-hover, section-eyebrow, section-title,
prose-horror (with drop-cap first letter), text-gradient-blood, divider-rune,
line-clamp-2

### Animations (tailwind.config.js)
fade-in, fade-up, flicker, pulse-slow, drift

---

## 8. Environment Variables

| Variable                  | Purpose                          | In .env | In .env.example |
|---------------------------|----------------------------------|---------|-----------------|
| `VITE_SUPABASE_URL`       | Supabase project API URL         | Yes     | Yes (placeholder) |
| `VITE_SUPABASE_ANON_KEY`  | Supabase anon (public) key       | Yes     | Yes (placeholder) |

No server-side secrets exist yet. When Edge Functions are added, their secrets
go in Supabase dashboard under Edge Functions > Secrets.

The following exist in the hosting environment but are NOT in `.env`:
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, never expose to frontend
- `SUPABASE_DB_URL` — direct Postgres connection string

---

## 9. Build Status

- **TypeScript:** strict mode, passes clean
- **Vite build:** succeeds, outputs to dist/
- **Build command:** `tsc -b && vite build`
- **Dev server:** `npm run dev` (runs at localhost:5173)
- **Preview:** `npm run preview`
- **Dependencies:** React 18, Supabase JS 2, Vite 5, Tailwind 3, TypeScript 5

---

## 10. GitHub Status

| Item | Status |
|------|--------|
| Remote repo | `joshcomstock9777-glitch/moonshadow-headquarters` — private, exists, **empty** |
| Local `.git` | **Does not exist** — stripped by workspace resets |
| `.gitignore` | **Does not exist on disk** — must be recreated before committing |
| Credentials | No GitHub token accessible from current sandbox |
| Push status | **Not pushed** — must use Bolt UI GitHub sync or manual upload |

**To push:** Use the Bolt UI GitHub icon (top-right) to link this project
to the existing repo, or export the zip and upload manually.

---

## 11. What's Built vs What's Prepared

### Built and working
- Full landing page (hero, services, genres, excerpt, process, order form)
- Kimmy Studio (gig scout + drafting workspace)
- HQ Command Center, Create Flow, Projects (list + detail with pipeline)
- Roundtable (4-role conversation)
- Asset Library (project-aware media with provenance)
- Content Factory (production jobs in lanes)
- Publishing Center (queue with approval gates)
- Tools & Connections (module registry + 13 connections)
- Dock (machine registry, 4-step add wizard, connection tests, capability search)
- 14 database tables with RLS, triggers, indexes, and seed data
- TypeScript strict build passes clean

### Prepared but not yet wired
- Auth/sign-in — no UI, no auth.uid() policies (all USING(true))
- Edge Functions — none deployed, none written
- Supabase Storage — not used (assets store URLs only)
- Herman routing to Dock — findMachinesByCapability() exists but Roundtable doesn't call it
- Real external connections — all modules are internal or need-auth
- Publishing connectors — all destinations marked unavailable
- Adapter send() for web/github/file/internal — all return failure (need contracts)

---

## 12. Known Issues

### Should fix
1. **No `.gitignore` on disk** — must recreate before any git init (exclude: node_modules/, .env, dist/, .bolt/, tsconfig.tsbuildinfo)
2. **Migration filename has double `.sql` extension** — `...create_headquarters_core.sql.sql`. Cosmetic but may confuse tooling.
3. **PORTABILITY.md is stale** — lists 3 migrations / 11 tables; actual is 4 migrations / 14 tables. Missing Dock tables, dockTypes.ts, dockAdapters.ts, DOCK.md from the structure diagram.
4. **package.json name is `kimmy-sci-fi-horror`** — doesn't match "Moonshadow Headquarters". Cosmetic.
5. **`logActivity()` uses raw `fetch()` instead of Supabase client** — inconsistent with rest of app. Same in dockAdapters.ts saveTestResult() and updateMachineHealth().
6. **Design system has 4 color ramps** — guidelines recommend 6+ (success/warning/error overloaded onto toxic/amber/blood).

### Minor
7. `tsconfig.tsbuildinfo` on disk — should be gitignored
8. Vite warns about 521KB chunk size — no code splitting configured
9. `noUnusedLocals` and `noUnusedParameters` are false in tsconfig
10. Supabase client has `persistSession: false` — correct for no-auth, needs change when auth added

---

## 13. Local Setup (for Aki)

```bash
# 1. Unzip the handoff
unzip project-handoff.zip moonshadow-headquarters
cd moonshadow-headquarters

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env: fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# (get from Supabase dashboard: Settings > API)
# OR use the existing Supabase project pxmwpqhpdbooxzhcfndh

# 4. Apply database migrations
#    Paste each .sql file from supabase/migrations/ in chronological order
#    into the Supabase SQL Editor, OR use supabase db push with CLI

# 5. Run
npm run dev    # opens at localhost:5173

# 6. Verify routes
#    /                  — landing page
#    /#/studio          — Kimmy Studio
#    /#/hq/command      — Headquarters Command Center
#    /#/hq/dock         — Dock machine registry
```

### Build verification
```bash
npm run build   # should succeed with zero TypeScript errors
```

---

## 14. Documentation References

- **README.md** — quick start and feature list
- **PORTABILITY.md** — full architecture, deployment options, restore guide (note: slightly stale, see issues)
- **DOCK.md** — Dock architecture, adapter interface, capability registry, secret handling, failure recovery
- **This file (HANDOFF.md)** — complete snapshot for handoff

---

## 15. What Does NOT Travel With the Source Code

| Item | Location | Migration Action |
|------|----------|------------------|
| Database data | Supabase project | Export via supabase db dump or SQL |
| Supabase project config | Supabase dashboard | Create new project, apply migrations |
| Supabase URL + anon key | .env (not in zip) | Update .env with new project values |
| Supabase service role key | Supabase dashboard | Available in new project dashboard |
| Edge function secrets | Not yet configured | Configure when Edge Functions added |
| Hosting/deployment | Bolt or chosen host | Deploy dist/ to new host |
| Custom domain | Not yet configured | Configure at host |
| node_modules/ | Not in zip | Run npm install |

The application code has **zero Bolt-specific dependencies**. It is a standard
Vite + React + TypeScript app that runs anywhere Node.js is available.
