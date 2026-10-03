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

## Roundtable conversation

The Roundtable uses the available screen height for one readable comment feed,
with a compact composer. Comments refresh every five seconds without pulling
the reader away from older messages. The General room contains messages with
no project; selecting a project opens that project's separate conversation.

Each requested role reads up to 12 recent saved messages from the same room.
Replies run in order, so later roles can read earlier replies. **Discuss
replies** starts a user-requested follow-up; it does not start an unattended
loop. Role names identify roles in the existing Path service, not connections
to external ChatGPT, Claude, Grok, or Gemini chat accounts.

Deploy the updated `supabase/functions/roundtable-path-route` function as well
as the frontend to enable shared context. It uses the caller's JWT for the
conversation read, requires a matching saved creator message, and keeps the
existing owner/operator and Path verification boundaries. Older callers
without a saved-message ID retain the existing isolated-request route. No
database migration is required by this change.

Run the isolated conversation and route checks with:

```bash
node --test scripts/check-roundtable-conversation.mjs
```

These checks mock database and Path responses. They prove local behavior, not
deployment, live replies, or persistence in the production database.

## Full Documentation

See **[PORTABILITY.md](./PORTABILITY.md)** for complete architecture,
database schema, adapter boundaries, deployment options, and restore guide.
