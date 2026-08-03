/**
 * Diagnostics — a private, append-only event log for troubleshooting.
 *
 * Purpose: give the maintainer (and the AI assistant doing the debugging) a fast,
 * factual answer to "what is the site actually showing right now, and why?" — one
 * that survives container rebuilds. Several Quest Board bugs were diagnosed three
 * times over from screenshots alone because runtime state was invisible from here.
 *
 * Design notes:
 *  - Stored in RUNTIME_DIR (the `quest-data` docker volume), so it survives
 *    rebuilds. That directory is gitignored, so nothing here reaches the repo.
 *  - Protected by a pre-shared key auto-generated on first boot and kept in the
 *    same volume. The endpoint 404s on a bad key so it isn't discoverable.
 *  - Never record credentials, tokens, password hashes or e-mail addresses. This
 *    log holds counts, ids and reasons — never user secrets.
 *  - Bounded: the file is capped so it can never grow without limit.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { RUNTIME_DIR, state } = require('./state');

const LOG_FILE = path.join(RUNTIME_DIR, 'diag.jsonl');
const KEY_FILE = path.join(RUNTIME_DIR, 'diag-key.txt');
const MAX_EVENTS = 2000;      // hard cap on retained events
const TRIM_TO = 1500;         // trim down to this when the cap is hit

let _key = null;
let _buffer = [];
let _flushTimer = null;

// ─── Pre-shared key ──────────────────────────────────────────────────────────
function getDiagKey() {
  if (_key) return _key;
  // An explicit DIAG_KEY wins, so the key can be pinned in .env and shared with
  // whoever is debugging without having to exec into the container.
  if (process.env.DIAG_KEY && process.env.DIAG_KEY.trim()) {
    _key = process.env.DIAG_KEY.trim();
    return _key;
  }
  try {
    if (fs.existsSync(KEY_FILE)) {
      const existing = fs.readFileSync(KEY_FILE, 'utf8').trim();
      if (existing) { _key = existing; return _key; }
    }
  } catch { /* fall through to regenerate */ }
  _key = crypto.randomBytes(24).toString('hex');
  try {
    fs.writeFileSync(KEY_FILE, _key, { mode: 0o600 });
  } catch (e) {
    console.error('[diag] could not persist key:', e.message);
  }
  return _key;
}

function verifyDiagKey(provided) {
  if (!provided || typeof provided !== 'string') return false;
  const expected = getDiagKey();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;          // length differs → reject
  return crypto.timingSafeEqual(a, b);              // constant-time compare
}

// ─── Event log ───────────────────────────────────────────────────────────────
function flush() {
  _flushTimer = null;
  if (_buffer.length === 0) return;
  const lines = _buffer.map(e => JSON.stringify(e)).join('\n') + '\n';
  _buffer = [];
  try {
    fs.appendFileSync(LOG_FILE, lines);
    trimIfNeeded();
  } catch (e) {
    console.error('[diag] write failed:', e.message);
  }
}

function trimIfNeeded() {
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const all = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    if (all.length <= MAX_EVENTS) return;
    fs.writeFileSync(LOG_FILE, all.slice(-TRIM_TO).join('\n') + '\n');
  } catch (e) {
    console.error('[diag] trim failed:', e.message);
  }
}

/**
 * Record a diagnostic event. Fire-and-forget: never throws, never blocks a request.
 * @param {string} event  short machine-readable name, e.g. 'board.render'
 * @param {object} data   plain counts/ids/reasons — never secrets
 */
function diagLog(event, data) {
  try {
    _buffer.push({ t: new Date().toISOString(), event, ...(data || {}) });
    if (!_flushTimer) _flushTimer = setTimeout(flush, 1000);
    if (_flushTimer.unref) _flushTimer.unref();
  } catch { /* diagnostics must never break the app */ }
}

function readEvents(limit = 200, filter = null) {
  flush();
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    let lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    if (filter) lines = lines.filter(l => l.includes(filter));
    return lines.slice(-limit).map(l => { try { return JSON.parse(l); } catch { return { raw: l }; } });
  } catch (e) {
    return [{ event: 'diag.read_error', error: e.message }];
  }
}

// ─── Live snapshot ───────────────────────────────────────────────────────────
// Answers "what is the board made of right now, and why" without a screenshot.
function questSnapshot() {
  const quests = state.quests || [];
  const open = quests.filter(q => q.status === 'open');
  const isCompanion = q => q.rarity === 'companion' || q.type === 'companion'
    || q.createdBy === 'companion' || q.createdBy === 'dobbie' || !!q.companionOwnerId;

  const byCreator = {};
  for (const q of open) byCreator[q.createdBy || '?'] = (byCreator[q.createdBy || '?'] || 0) + 1;

  return {
    total: quests.length,
    byStatus: quests.reduce((a, q) => { a[q.status || '?'] = (a[q.status || '?'] || 0) + 1; return a; }, {}),
    open: {
      total: open.length,
      withTemplateId: open.filter(q => q.templateId).length,
      withoutTemplateId: open.filter(q => !q.templateId).length,
      // the exact set that is allowed to skip the per-player pool cap
      poolBypassing: open.filter(q => !q.templateId && q.createdBy !== 'system').length,
      companion: open.filter(isCompanion).length,
      npc: open.filter(q => q.npcGiverId).length,
      byCreator,
    },
  };
}

function playerSnapshot(playerId) {
  const uid = String(playerId || '').toLowerCase();
  const pp = (state.playerProgress || {})[uid];
  const u = (state.users || {})[uid];
  if (!u) return { player: uid, exists: false };
  return {
    player: uid,
    exists: true,
    xp: u.xp || 0,
    level: u.level || null,
    pool: {
      activeQuestPool: pp ? (pp.activeQuestPool || []).length : 0,
      generatedQuests: pp ? (pp.generatedQuests || []).length : 0,
      lastPoolRefresh: pp ? (pp.lastPoolRefresh || null) : null,
      claimed: pp ? (pp.claimedQuests || []).length : 0,
      completed: pp ? Object.keys(pp.completedQuests || {}).length : 0,
    },
  };
}

function fullSnapshot(playerId) {
  return {
    at: new Date().toISOString(),
    version: (state.appState && state.appState.version) || null,
    uptimeSec: Math.round(process.uptime()),
    quests: questSnapshot(),
    player: playerId ? playerSnapshot(playerId) : null,
    counts: {
      users: Object.keys(state.users || {}).length,
      catalogTemplates: ((state.questCatalog || {}).templates || []).length,
    },
  };
}

module.exports = {
  diagLog, readEvents, fullSnapshot, questSnapshot, playerSnapshot,
  getDiagKey, verifyDiagKey, flushDiag: flush,
};
