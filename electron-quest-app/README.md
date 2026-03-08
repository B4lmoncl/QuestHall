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

The API endpoint and key are hardcoded in `renderer.js`:

```js
const API_BASE = 'http://187.77.139.247:3001';
const API_KEY  = '133e6c2602b0fd62e64de00779d44093';
```

Change these if the server moves or the key rotates.

## Usage

1. Fill in **Quest Title** (required)
2. Optionally add a **Description**
3. Select **Priority** (low / medium / high)
4. Click **Quest Posten**

On success the form clears and shows the new quest ID.
The quest appears immediately on the Agent Dashboard Quest Board.
