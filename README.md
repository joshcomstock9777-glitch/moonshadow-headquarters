# Moonshadow Headquarters

A creative operating system for a human creator working with AI agents,
creative applications, media tools, editors, asset libraries, and publishing
destinations.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev            # opens at localhost:5173
```

## What's Inside

- **Landing page** — Kimmy sci-fi horror fiction commission site
- **Kimmy Studio** (`/#/studio`) — gig scout + drafting workspace
- **Moonshadow Headquarters** (`/#/hq/command`) — the creative operating system:
  - Command Center — active jobs, approvals, activity stream
  - Create — turn an idea into a project + production job
  - Projects — full job pipeline (idea → plan → create → review → edit → package → approve → publish → done)
  - Roundtable — role-based conversation (Herman, Allie, Challenger, Watcher)
  - Asset Library — project-aware media with provenance
  - Content Factory — production jobs in configurable lanes
  - Publishing — queue with approval gates, honest destination status
  - Tools & Connections — module registry + external service status

## Build

```bash
npm run build    # TypeScript check + Vite production build to dist/
```

## Full Documentation

See **[PORTABILITY.md](./PORTABILITY.md)** for complete architecture,
database schema, adapter boundaries, deployment options, and restore guide.
