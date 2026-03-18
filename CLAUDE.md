# CLAUDE.md

## Project Overview

**Quest Hall / Agent Dashboard** (v1.4.0) — A real-time operations center and gamified quest management system for AI agents and players. Combines agent monitoring, RPG quest mechanics (classes, companions, gacha, leveling), a REST API, and an Electron desktop companion app (Quest Forge).

## Tech Stack

- **Frontend:** Next.js 16.1.6, React 19, TypeScript 5, Tailwind CSS 4
- **Backend:** Express.js 4.18, Node.js 20, JavaScript (CommonJS)
- **Desktop:** Electron 29 (electron-builder)
- **Persistence:** JSON file storage in `/data` directory (no database)
- **Deployment:** Docker (Node 20 Alpine), Docker Compose
- **CI/CD:** GitHub Actions (Electron build on release)

## Quick Reference Commands

```bash
# Frontend development
npm install
npm run dev          # Next.js dev server (port 3000)
npm run build        # Static export to /out
npm run start        # Next.js production server

# Backend
npm run server       # Express API server (port 3001)

# Linting
npm run lint         # ESLint

# Docker
docker compose build --no-cache
docker compose up -d

# Electron app
cd electron-quest-app && npm install && npm start
```

**No test suite configured.** Validation only via `scripts/verify-items.js` and ESLint.

## Project Structure

```
app/                  # Next.js app directory (React 19, TypeScript)
  page.tsx            # Main dashboard component (~3400 lines)
  types.ts            # Shared TypeScript interfaces
  utils.ts            # Fetch helpers & utilities
  config.ts           # UI configuration constants
  globals.css         # Tailwind + global styles
components/           # React UI components (~16k lines total)
lib/                  # Backend business logic (JS, CommonJS)
  state.js            # Central state & JSON persistence
  helpers.js          # Utility functions
  quest-catalog.js    # Quest templates
  npc-engine.js       # NPC rotation
  gacha-engine.js     # Gacha mechanics
routes/               # Express API routes (14 files)
  agents.js           # Agent CRUD & status
  quests.js           # Quest management
  config-admin.js     # Admin key management
  habits-inventory.js # Rituals, gear, inventory
  ...
public/
  data/               # Read-only game template data (JSON)
  images/             # Pixel art icons, portraits, UI frames
electron-quest-app/   # Electron desktop companion app
scripts/              # Asset generation & data validation
server.js             # Express entry point
```

## Architecture

- **Monolithic single-process:** Next.js static export served by Express
- **State management:** Backend uses centralized `lib/state.js` global object; frontend uses React hooks
- **Data flow:** React components → `/api/*` endpoints → `state` object → `saveData()` writes JSON to `/data`
- **API:** RESTful routes with `requireApiKey` middleware, grouped by domain (`/api/agents/*`, `/api/quests/*`, etc.)
- **No ORM/DB:** All persistence is JSON files in the `/data` volume

## Code Style & Conventions

- **Indentation:** 2 spaces
- **Frontend:** TypeScript, arrow functions, PascalCase components, camelCase variables
- **Backend:** JavaScript CommonJS (`require`/`module.exports`), camelCase
- **Imports:** Absolute paths via `@/*` alias (e.g., `@/components/`, `@/app/`)
- **Styling:** Tailwind utility classes, dark theme (`#0a0a0a` bg, `#ff4444` accents), pixel art rendering
- **Comments:** Section headers with `// ─── Section ───` pattern in backend

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `API_KEY` / `API_KEYS` | API authentication keys |
| `MASTER_KEY` | Admin operations key |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `production` or `development` |

Template: `.env.example`

## Key Game Systems

Quest system, XP/leveling, gear/inventory with set bonuses, companions with bond levels, gacha banners with pity, daily rituals/streaks, campaign quest chains, multi-currency economy (gold, stardust, essenz).

## Important Files

| File | Role |
|------|------|
| `app/page.tsx` | Main dashboard UI (largest file) |
| `app/types.ts` | All TypeScript interfaces |
| `lib/state.js` | State management & persistence |
| `lib/helpers.js` | Shared utility functions |
| `server.js` | Express server entry point |
| `routes/quests.js` | Core quest API |
| `public/data/*.json` | Game data templates (read-only) |

## Documentation

- `README.md` — API endpoints, deployment, agents
- `BACKLOG.md` — Bugs, features, tech debt
- `ITEM-SYSTEM-SPEC.md` — Gear & equipment design
- `GACHA-REBUILD-TASK.md` — Gacha redesign tasks
- `REFACTOR-TASK.md` — Code cleanup priorities
- `SCALABILITY-AUDIT.md` — Performance analysis
- `TEMPLATES.md` — Quest template formats
