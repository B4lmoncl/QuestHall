# Quest Poster — Electron App

A minimal desktop app to post quests to the Agent Dashboard.

## Requirements

- Node.js 18+
- npm

## Setup

```bash
cd electron-quest-app
npm install
```

## Run (development)

```bash
npm start
```

## Build distributables

```bash
# All platforms (requires cross-compile tooling)
npm run build

# Windows only
npm run build:win

# macOS only (run on macOS)
npm run build:mac

# Linux only
npm run build:linux
```

Built files are output to `dist/`.

## Configuration

Copy the example config and fill in your details:

```bash
cp .quest-config.json.example .quest-config.json
```

Edit `.quest-config.json`:

```json
{
  "API_BASE": "http://your-server-ip:3001",
  "API_KEY": "your-api-key-here"
}
```

`.quest-config.json` is gitignored — never commit it.

## Usage

1. Fill in **Quest Title** (required)
2. Optionally add a **Description**
3. Select **Priority** (low / medium / high)
4. Click **Quest Posten**

On success the form clears and shows the new quest ID.
The quest appears immediately on the Agent Dashboard Quest Board.
