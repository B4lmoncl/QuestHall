/**
 * Gacha Engine — Core pull logic, pity calculation, 50/50 tracking, duplicate handling.
 * Used by routes/gacha.js. All state mutations happen through helpers.
 */

// Drop rate constants
const BASE_LEGENDARY_RATE = 0.016;  // 1.6%
const EPIC_RATE = 0.13;
const RARE_RATE = 0.35;
const UNCOMMON_RATE = 0.40;
// Common fills remainder: ~10.4%

const SOFT_PITY_START = 35;
const HARD_PITY = 50;
const SOFT_PITY_INCREASE = 0.03;  // +3% per pull after soft pity
const EPIC_PITY = 10;

const DUPLICATE_REFUND = {
  common: 1,
  uncommon: 3,
  rare: 8,
  epic: 20,
  legendary: 50,
};

const RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
};

/**
 * Calculate effective legendary rate based on pity counter.
 */
function getEffectiveLegendaryRate(pityCounter) {
  if (pityCounter >= HARD_PITY - 1) return 1.0;
  if (pityCounter >= SOFT_PITY_START) {
    return Math.min(1.0, BASE_LEGENDARY_RATE + (pityCounter - SOFT_PITY_START) * SOFT_PITY_INCREASE);
  }
  return BASE_LEGENDARY_RATE;
}

/**
 * Roll a rarity based on current pity state.
 */
function rollRarity(pityCounter, epicPityCounter) {
  const legendaryRate = getEffectiveLegendaryRate(pityCounter);

  // Epic pity: guaranteed epic at 10 pulls without epic+
  if (epicPityCounter >= EPIC_PITY - 1) {
    const roll = Math.random();
    if (roll < legendaryRate) return 'legendary';
    return 'epic';
  }

  const roll = Math.random();
  let cumulative = 0;
  cumulative += legendaryRate;
  if (roll < cumulative) return 'legendary';
  cumulative += EPIC_RATE;
  if (roll < cumulative) return 'epic';
  cumulative += RARE_RATE;
  if (roll < cumulative) return 'rare';
  cumulative += UNCOMMON_RATE;
  if (roll < cumulative) return 'uncommon';
  return 'common';
}

/**
 * Pick a random item from pool matching the given rarity.
 */
function pickFromPool(pool, rarity) {
  const filtered = pool.filter(item => item.rarity === rarity);
  if (filtered.length === 0) {
    // Fallback to any item
    return pool[Math.floor(Math.random() * pool.length)] || null;
  }
  return filtered[Math.floor(Math.random() * filtered.length)];
}

module.exports = {
  BASE_LEGENDARY_RATE,
  EPIC_RATE,
  RARE_RATE,
  UNCOMMON_RATE,
  SOFT_PITY_START,
  HARD_PITY,
  SOFT_PITY_INCREASE,
  EPIC_PITY,
  DUPLICATE_REFUND,
  RARITY_COLORS,
  getEffectiveLegendaryRate,
  rollRarity,
  pickFromPool,
};
