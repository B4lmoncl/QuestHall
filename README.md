# Agent Dashboard — OpenClaw Revenue Team

Real-time operations center for Leon's AI revenue agents: **Nova, Hex, Echo, Pixel, Atlas, Lyra, Forge**.

Live: http://187.77.139.247:3001

## Features

- **OpenClaw dark theme** — `#0a0a0a` background, red/orange accents, ember particle system
- **7 AI agents** — live status, current task, last seen, XP & level progression
- **Quest Board** — open/in-progress/completed quests with priority, types, sub-quests (quest chains)
- **Quest Types** — development, personal, learning, social
- **Quest Chains** — parent/child quests with progress tracking
- **Recurring Quests** — daily/weekly/monthly auto-reset with streak tracking
- **XP System** — agents earn XP on quest completion; level progression Novice → Apprentice → Knight → Archmage
- **REST API** — agents post status/results, dashboard auto-refreshes
- **Admin Keys** — master-key-protected API key management (create, list, revoke)
- **Master Key Auth** — separate master key for admin operations
- **Leaderboard** — agents ranked by XP and quests completed
- **Review Pipeline** — agents post quest suggestions for Leon to approve/reject
- **Quest Forge** — companion Electron desktop app (Windows/Linux/macOS)
  - System tray integration with Quick Forge popup
  - Post quests, review suggestions, manage API keys
  - Sound effects: forge hammer, sync, notifications, errors

## Running the API Server

```bash
npm install
node server.js        # API at http://187.77.139.247:3001
```

Then open `http://187.77.139.247:3001` (serves the built frontend).

Build first: `npm run build`

## API Reference

### Agent Endpoints

```
GET  /api/agents                        → all agent statuses (includes xp field)
GET  /api/agent/:name                   → single agent
POST /api/agent/:name/status            → agent posts status update
POST /api/agent/:name/result            → agent posts task result
POST /api/agent/:name/command           → send command to agent
GET  /api/agent/:name/commands          → agent polls for pending commands
PATCH /api/agent/:name/command/:cmdId   → agent acks command
POST /api/agent/:name/register          → auto-register new agent
POST /api/agent/:name/checkin           → reset health to ok
GET  /api/leaderboard                   → agents ranked by XP
```

### Quest Endpoints

```
GET   /api/quests              → all quests grouped by status (open/inProgress/completed/suggested/rejected)
POST  /api/quest               → create quest
PATCH /api/quest/:id           → update quest (status, priority, progress, proof...)
DELETE /api/quest/:id          → delete quest
POST  /api/quest/:id/approve   → approve a suggested quest
POST  /api/quest/:id/reject    → reject a suggested quest
GET   /api/quests/reset-recurring → reset recurring quests past their interval
GET   /api/health              → server health check
GET   /api/version             → server version
```

### Admin Key Endpoints (require master key)

```
GET    /api/admin/keys         → list all managed API keys (masked)
POST   /api/admin/keys         → create new API key { label }
DELETE /api/admin/keys/:key    → revoke an API key
```

### Quest Create

```bash
curl -X POST http://187.77.139.247:3001/api/quest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "title": "Research AI cost-tracker SaaS opportunity",
    "description": "Analyze the market for AI agent cost tracking tools",
    "priority": "high",
    "type": "development",
    "categories": ["Research"],
    "agentId": "atlas",
    "recurrence": "weekly"
  }'
```

### Agent Status Update

```bash
curl -X POST http://187.77.139.247:3001/api/agent/nova/status \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"status": "active", "currentTask": "Analyzing KPI metrics..."}'
```

## Agents

| Name  | Role            | Specialty                                  |
|-------|----------------|---------------------------------------------|
| Nova  | Optimizer       | KPI frameworks, dashboard optimization      |
| Hex   | Code Engineer   | MVP development, automation scripts         |
| Echo  | Sales           | Target segments, cold outreach, pricing     |
| Pixel | Marketer        | Landing pages, SEO, social campaigns        |
| Atlas | Researcher      | Market research, competitor analysis        |
| Lyra  | AI Orchestrator | Team lead, quest management, coordination   |
| Forge | Idea Smith      | Feature ideation, quest suggestions         |

## XP & Level System

Agents earn XP when quests are completed:
- High priority quest: 30 XP
- Medium priority quest: 20 XP
- Low priority quest: 10 XP

Level thresholds:
- **Novice**: 0–99 XP
- **Apprentice**: 100–299 XP
- **Knight**: 300–599 XP
- **Archmage**: 600+ XP

## Quest Forge (Companion App)

Desktop app for posting quests and managing Quest Hall.

```bash
cd electron-quest-app
npm install
npm start
```

Features:
- Post quests with priority, type, categories, recurring schedule
- Review agent suggestions (approve/reject)
- Admin panel: manage API keys (requires master key)
- System tray: minimize to tray, Quick Forge popup on click
- Sound effects (toggleable mute + volume)
- Auto-update from GitHub releases

## Production Deployment

### API Key Configuration

**DO NOT commit API keys to Git!**

```bash
cd /opt/agent-dashboard
cp .env.example .env
nano .env  # Set API_KEY=your-actual-key and MASTER_KEY=your-master-key
```

Or via docker-compose.override.yml (gitignored):

```yaml
version: '3.8'
services:
  api:
    environment:
      - API_KEY=your-api-key
      - MASTER_KEY=your-master-key
```

### Rebuild Without Losing Config

```bash
git pull
docker compose build --no-cache
docker compose up -d
```
