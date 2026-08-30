# Moonshadow Headquarters

Moonshadow Headquarters is the central control layer for the Moonshadow creative system. It is designed around a simple operating principle:

> The creator directs. The AI operates the equipment.

The application brings creative planning, projects, asset management, production routing, publishing, connections, and machine/tool orchestration into one place without forcing every existing Moonshadow system to be rebuilt.

## Major areas

- Headquarters command center
- Create flow
- Projects
- Roundtable
- Asset Library
- Content Factory
- Publishing Center
- Tools & Connections
- Moonshadow Dock
- Existing Kimmy / Studio surfaces

## Dock

Moonshadow Dock is the universal connection layer. It provides a machine registry, standardized handoff envelopes, capability discovery, connection testing, adapter boundaries, and provenance so Herman can route work between replaceable tools and studios.

See `DOCK.md` for the Dock contract and `PORTABILITY.md` for restore/migration instructions.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and provide the required Supabase values locally. Never commit `.env` or real credentials.

## Build

```bash
npm run build
```

This repository is intended to remain portable outside Bolt. The source is standard Vite + React + TypeScript with Supabase as the persistence layer.
