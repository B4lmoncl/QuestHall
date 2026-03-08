# Agent Dashboard — OpenClaw Revenue Team

Real-time operations center for Leon's AI revenue agents: **Nova, Hex, Echo, Pixel, Atlas**.

Live: https://b4lmoncl.github.io/agent-dashboard/

## Features

- **OpenClaw dark theme** — `#0a0a0a` background, red/orange accents
- **5 revenue agents** — live status, current task, last seen
- **Quests system** — expandable cards with What/Why/Output, Pending bucket
- **REST API** — agents post status/results, dashboard auto-refreshes
- **Dual mode** — runs as static GitHub Pages OR live API server

## Running the API Server

```bash
npm install
node server.js        # API at http://localhost:3001
```

Then open `http://localhost:3001` (serves the built frontend).

Build first: `npm run build`

## API Reference

### Agent Endpoints

```
GET  /api/agents                        → all agent statuses
GET  /api/agent/:name                   → single agent
POST /api/agent/:name/status            → agent posts status update
POST /api/agent/:name/result            → agent posts task result
POST /api/agent/:name/command           → send command to agent
GET  /api/agent/:name/commands          → agent polls for pending commands
PATCH /api/agent/:name/command/:cmdId   → agent acks command
```

### Quest Endpoints

```
GET   /api/quests          → all quests (filter: ?status=pending&agent=nova)
POST  /api/quests          → create quest
PATCH /api/quest/:id       → update quest status/progress
DELETE /api/quest/:id      → delete quest
GET   /api/health          → server health check
```

### Agent Status Update

```bash
curl -X POST http://localhost:3001/api/agent/nova/status \
  -H "Content-Type: application/json" \
  -d '{"status": "active", "currentTask": "Analyzing KPI metrics..."}'
```

### Post Task Result

```bash
curl -X POST http://localhost:3001/api/agent/hex/result \
  -H "Content-Type: application/json" \
  -d '{"title": "Built API endpoint", "output": "Done. 3 endpoints live.", "success": true}'
```

### Create Quest

```bash
curl -X POST http://localhost:3001/api/quests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research AI cost-tracker SaaS opportunity",
    "description": "Analyze the market for AI agent cost tracking tools",
    "why": "Revenue potential: teams waste money on untracked LLM costs",
    "agentId": "atlas",
    "priority": "high",
    "tags": ["research", "saas"]
  }'
```

## Agents

| Name  | Role         | Specialty                                  |
|-------|-------------|---------------------------------------------|
| Nova  | Optimizer   | KPI frameworks, dashboard optimization      |
| Hex   | Code Eng.   | MVP development, automation scripts         |
| Echo  | Sales       | Target segments, cold outreach, pricing     |
| Pixel | Marketer    | Landing pages, SEO, social campaigns        |
| Atlas | Researcher  | Market research, competitor analysis        |

## Static GitHub Pages Mode

The dashboard auto-detects whether the live API is available. If not, it falls back to reading `/data/agents.json` (served from `public/data/`).

The `update-dashboard.sh` script writes agent data to `public/data/agents.json` and triggers a rebuild via GitHub Actions.
