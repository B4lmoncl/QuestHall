# Agent Orchestration Dashboard

A dark-themed web dashboard for monitoring AI agent teams — built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Agent Roster** — all agents with role, model, status, uptime, and task counts
- **Current Quests** — live view of in-progress tasks with animated progress bars
- **Quest Log** — completed/failed task history with duration, token usage, and tags
- **Stat Strip** — at-a-glance totals for active agents, completed quests, tokens used
- **JSON API** — three REST endpoints, filterable by agent or status

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- JSON flat-file data store (`/data/*.json`)
- Deploy: Vercel (recommended) or Netlify/Cloudflare Pages

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
agent-dashboard/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── agents/route.ts
│       ├── quests/route.ts
│       └── current-quests/route.ts
├── components/
│   ├── AgentCard.tsx
│   ├── CurrentQuestCard.tsx
│   ├── QuestRow.tsx
│   └── StatBar.tsx
└── data/
    ├── agents.json
    ├── quests.json
    └── current-quests.json
```

## API Reference

All endpoints return JSON. No auth required in MVP.

---

### `GET /api/agents`

Returns all registered agents.

**Response**
```json
{
  "agents": [
    {
      "id": "agt-001",
      "name": "Aria",
      "role": "Research Analyst",
      "model": "claude-opus-4-6",
      "status": "active",       // "active" | "idle" | "error"
      "avatar": "AR",
      "color": "#6366f1",
      "description": "...",
      "tasksCompleted": 142,
      "uptime": "99.2%",
      "lastSeen": "2026-03-06T12:34:00Z"
    }
  ],
  "total": 6
}
```

---

### `GET /api/quests`

Returns the quest history log.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `agentId` | string | Filter by agent ID (e.g. `agt-001`) |
| `status` | string | Filter by status: `completed` or `failed` |

**Response**
```json
{
  "quests": [
    {
      "id": "qst-001",
      "title": "Synthesize Q1 market research report",
      "agentId": "agt-001",
      "agentName": "Aria",
      "status": "completed",    // "completed" | "failed"
      "priority": "high",       // "critical" | "high" | "medium" | "low"
      "completedAt": "2026-03-06T09:14:00Z",
      "durationMs": 47200,
      "tokensUsed": 28400,
      "tags": ["research", "report"],
      "error": null             // string if status=failed
    }
  ],
  "total": 8
}
```

---

### `GET /api/current-quests`

Returns all currently running tasks.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `agentId` | string | Filter by agent ID |

**Response**
```json
{
  "quests": [
    {
      "id": "cqst-001",
      "title": "Summarize academic papers on LLM reasoning",
      "agentId": "agt-001",
      "agentName": "Aria",
      "status": "running",
      "priority": "high",
      "startedAt": "2026-03-06T12:20:00Z",
      "progress": 68,           // 0-100
      "tags": ["research", "llm"]
    }
  ],
  "total": 4
}
```

---

## Data Models

Edit `data/*.json` to add real agents and tasks. The dashboard and API will pick up changes automatically on next render.

**Agent statuses:** `active` | `idle` | `error`
**Quest priorities:** `critical` | `high` | `medium` | `low`
**Quest statuses (history):** `completed` | `failed`
**Quest statuses (current):** `running` | `paused`

## Deployment

### Vercel (recommended)

1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new) — zero config needed
3. Auto-deploys on every push to `main`

### Netlify

```bash
npm run build
# Publish `.next` directory, runtime: Next.js
```

### Cloudflare Pages

Use `@cloudflare/next-on-pages` adapter.

## Roadmap

- [ ] WebSocket / SSE for real-time progress updates
- [ ] Per-agent detail page (`/agents/[id]`)
- [ ] Write API endpoints (POST quest, PATCH agent status)
- [ ] Auth (API key or OAuth)
- [ ] Real integration with Claude Agent SDK
