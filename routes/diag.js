// ─── Diagnostics endpoint (private) ──────────────────────────────────────────
// Read-only troubleshooting surface, gated by a pre-shared key that is generated
// on first boot and stored in the persistent data volume. Intended for the
// maintainer / AI assistant only — it answers "what is the site showing and why"
// without needing screenshots.
//
// Every response is derived state: counts, ids and reasons. No credentials,
// tokens or e-mail addresses are ever exposed here.

const router = require('express').Router();
const { readEvents, fullSnapshot, verifyDiagKey, flushDiag } = require('../lib/diag');

// Unknown/incorrect key → 404 rather than 401, so the endpoint is not discoverable.
function requireDiagKey(req, res, next) {
  const key = req.get('x-diag-key') || req.query.key;
  if (!verifyDiagKey(key)) return res.status(404).json({ error: 'Not found' });
  next();
}

// GET /api/_diag?player=X&limit=200&filter=board
// Live snapshot + recent events.
router.get('/api/_diag', requireDiagKey, (req, res) => {
  const player = req.query.player ? String(req.query.player) : null;
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));
  const filter = req.query.filter ? String(req.query.filter) : null;
  res.json({
    snapshot: fullSnapshot(player),
    events: readEvents(limit, filter),
  });
});

// GET /api/_diag/snapshot?player=X — snapshot only (small, quick to eyeball)
router.get('/api/_diag/snapshot', requireDiagKey, (req, res) => {
  res.json(fullSnapshot(req.query.player ? String(req.query.player) : null));
});

// POST /api/_diag/flush — force pending events to disk before reading
router.post('/api/_diag/flush', requireDiagKey, (req, res) => {
  flushDiag();
  res.json({ ok: true });
});

module.exports = router;
