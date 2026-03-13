const router = require('express').Router();
const crypto = require('crypto');
const { state, XP_BY_PRIORITY, GOLD_BY_PRIORITY, TEMP_BY_PRIORITY, STREAK_MILESTONES, RARITY_WEIGHTS, RARITY_COLORS, RARITY_ORDER, EQUIPMENT_SLOTS, LEVELS, PLAYER_QUEST_TYPES, saveQuests, savePlayerProgress, saveManagedKeys } = require('../lib/state');
const { now, getLevelInfo, getPlayerProgress, awardXP } = require('../lib/helpers');
const { requireApiKey, requireMasterKey, getMasterKey } = require('../lib/middleware');

// GET /api/config — expose game constants to frontend (no auth required)
router.get('/api/config', (req, res) => {
  res.json({
    xpByPriority:    XP_BY_PRIORITY,
    goldByPriority:  GOLD_BY_PRIORITY,
    tempByPriority:  TEMP_BY_PRIORITY,
    streakMilestones: STREAK_MILESTONES,
    rarityWeights:   RARITY_WEIGHTS,
    rarityColors:    RARITY_COLORS,
    rarityOrder:     RARITY_ORDER,
    equipmentSlots:  EQUIPMENT_SLOTS,
    levels:          LEVELS,
    playerQuestTypes: PLAYER_QUEST_TYPES,
  });
});

// GET /api/leaderboard — returns combined leaderboard
// mode=agents: agents only; mode=players: registered users only (default: agents for backward compat)
router.get('/api/leaderboard', (req, res) => {
  const agentIds = new Set(Object.keys(state.store.agents));

  // Build agents-only ranked list
  const agentsRanked = Object.values(state.store.agents)
    .map(a => {
      const levelInfo = getLevelInfo(a.xp || 0);
      return {
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        color: a.color,
        role: a.role,
        xp: a.xp || 0,
        questsCompleted: a.questsCompleted || 0,
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        isAgent: true,
      };
    })
    .sort((a, b) => b.xp - a.xp || b.questsCompleted - a.questsCompleted)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  // Build players-only ranked list (registered users, exclude agent IDs)
  const playersRanked = Object.values(state.users)
    .filter(u => !agentIds.has(u.id))
    .map(u => {
      const levelInfo = getLevelInfo(u.xp || 0);
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        color: u.color,
        role: null,
        xp: u.xp || 0,
        questsCompleted: u.questsCompleted || 0,
        level: levelInfo.level,
        levelTitle: levelInfo.title,
        isAgent: false,
      };
    })
    .sort((a, b) => b.xp - a.xp || b.questsCompleted - a.questsCompleted)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  // Return combined list with agents first for backward compat (client separates via isAgent)
  res.json([...agentsRanked, ...playersRanked]);
});

// ─── Quest Pool System ─────────────────────────────────────────────────────────
// Maintains a per-player pool of up to 10 player-type quests (personal/fitness/social/learning)
// Mix: 2-3 personal, 2-3 fitness, 2-3 social, 1-2 learning

const POOL_TYPES = ['personal', 'fitness', 'social', 'learning'];
const POOL_MIX = { personal: 3, fitness: 3, social: 2, learning: 2 }; // target counts

function buildQuestPool(playerName, playerLevel) {
  const uid = playerName.toLowerCase();
  const pp = getPlayerProgress(uid);
  const completedIds = new Set(Object.keys(pp.completedQuests || {}));
  const claimedIds = new Set(pp.claimedQuests || []);
  const pool = [];

  for (const type of POOL_TYPES) {
    const target = POOL_MIX[type] || 2;
    const candidates = state.quests.filter(q =>
      q.status === 'open' &&
      q.type === type &&
      !q.parentQuestId &&
      !completedIds.has(q.id) &&
      !claimedIds.has(q.id) &&
      (q.minLevel || 1) <= playerLevel
    );
    // Shuffle candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(target, shuffled.length); i++) {
      pool.push(shuffled[i].id);
    }
  }
  return pool.slice(0, 10);
}

// GET /api/quests/pool?player=X — get or initialize the quest pool
router.get('/api/quests/pool', (req, res) => {
  const playerParam = req.query.player ? String(req.query.player).toLowerCase() : null;
  if (!playerParam) return res.status(400).json({ error: 'player parameter required' });
  const userRecord = state.users[playerParam];
  if (!userRecord) return res.status(404).json({ error: 'Player not found' });
  const pp = getPlayerProgress(playerParam);
  const playerLevel = getLevelInfo(userRecord.xp || 0).level;

  // Fill pool if empty or has no valid quests
  if (!pp.activeQuestPool || pp.activeQuestPool.length === 0) {
    pp.activeQuestPool = buildQuestPool(playerParam, playerLevel);
    savePlayerProgress();
  } else {
    // Remove completed/rejected quests from pool
    const validIds = new Set(state.quests.filter(q => q.status === 'open' || q.status === 'in_progress').map(q => q.id));
    pp.activeQuestPool = pp.activeQuestPool.filter(id => validIds.has(id));
    if (pp.activeQuestPool.length < 3) {
      pp.activeQuestPool = buildQuestPool(playerParam, playerLevel);
      savePlayerProgress();
    }
  }

  const poolQuests = pp.activeQuestPool
    .map(id => state.quests.find(q => q.id === id))
    .filter(Boolean);

  res.json({ pool: poolQuests, lastRefresh: pp.lastPoolRefresh || null });
});

// POST /api/quests/pool/refresh?player=X — refresh the pool (1 per hour cooldown)
router.post('/api/quests/pool/refresh', requireApiKey, (req, res) => {
  const playerParam = req.query.player ? String(req.query.player).toLowerCase() : null;
  if (!playerParam) return res.status(400).json({ error: 'player parameter required' });
  const userRecord = state.users[playerParam];
  if (!userRecord) return res.status(404).json({ error: 'Player not found' });
  const pp = getPlayerProgress(playerParam);
  const playerLevel = getLevelInfo(userRecord.xp || 0).level;

  // Cooldown check: 1 refresh per hour
  const nowMs = Date.now();
  if (pp.lastPoolRefresh) {
    const elapsed = nowMs - new Date(pp.lastPoolRefresh).getTime();
    if (elapsed < 3600 * 1000) {
      const waitMin = Math.ceil((3600 * 1000 - elapsed) / 60000);
      return res.status(429).json({ error: `Pool refresh cooldown. Try again in ${waitMin} min.` });
    }
  }

  pp.activeQuestPool = buildQuestPool(playerParam, playerLevel);
  pp.lastPoolRefresh = new Date().toISOString();
  savePlayerProgress();

  const poolQuests = pp.activeQuestPool
    .map(id => state.quests.find(q => q.id === id))
    .filter(Boolean);

  res.json({ ok: true, pool: poolQuests, lastRefresh: pp.lastPoolRefresh });
});

// GET /api/quests/reset-recurring — reset completed recurring quests based on interval
router.get('/api/quests/reset-recurring', (req, res) => {
  const nowMs = Date.now();
  const INTERVAL_MS = { daily: 24*3600*1000, weekly: 7*24*3600*1000, monthly: 30*24*3600*1000 };
  let resetCount = 0;
  for (const q of state.quests) {
    if (q.status !== 'completed' || !q.recurrence) continue;
    const interval = INTERVAL_MS[q.recurrence];
    if (!interval) continue;
    const lastDone = q.lastCompletedAt ? new Date(q.lastCompletedAt).getTime() : 0;
    if (nowMs - lastDone >= interval) {
      q.status = 'open';
      q.claimedBy = null;
      q.completedBy = null;
      q.completedAt = null;
      resetCount++;
    }
  }
  if (resetCount > 0) saveQuests();
  console.log(`[recurring] reset ${resetCount} recurring quest(s)`);
  res.json({ ok: true, reset: resetCount });
});

// GET /api/admin/keys
router.get('/api/admin/keys', requireMasterKey, (req, res) => {
  const master = getMasterKey();
  const allKeys = [
    { key: master, label: 'Master Key', created: null, isMaster: true },
    ...state.managedKeys.map(k => ({ ...k, isMaster: false })),
  ];
  res.json(allKeys.map(k => ({ ...k, masked: k.key.slice(0, 4) + '****' + k.key.slice(-4) })));
});

// POST /api/admin/keys
router.post('/api/admin/keys', requireMasterKey, (req, res) => {
  const { label } = req.body;
  const newKey = crypto.randomBytes(16).toString('hex');
  const entry = { key: newKey, label: label || `Key ${state.managedKeys.length + 1}`, created: now() };
  state.managedKeys.push(entry);
  state.validApiKeys.add(newKey);
  saveManagedKeys();
  console.log(`[admin] new key created: ${entry.label}`);
  res.json({ ok: true, key: newKey, masked: newKey.slice(0, 4) + '****' + newKey.slice(-4), label: entry.label });
});

// DELETE /api/admin/keys/:key
router.delete('/api/admin/keys/:key', requireMasterKey, (req, res) => {
  const keyParam = req.params.key;
  if (keyParam === getMasterKey()) {
    return res.status(400).json({ error: 'Cannot revoke master key' });
  }
  const before = state.managedKeys.length;
  state.managedKeys = state.managedKeys.filter(k => k.key !== keyParam);
  if (state.managedKeys.length < before) {
    state.validApiKeys.delete(keyParam);
    saveManagedKeys();
    console.log(`[admin] key revoked`);
    return res.json({ ok: true });
  }
  res.status(404).json({ error: 'Key not found' });
});

module.exports = router;
