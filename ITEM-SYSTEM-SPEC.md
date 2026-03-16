# Item System Overhaul — Full Spec

## Problem Statement
Two completely separate item systems exist that don't talk to each other:
1. **Shop/Gear** (`gearTemplates.json` → `FULL_GEAR_ITEMS[]`) — equippable via `/api/player/:name/equip/:itemId`, has slots/stats
2. **Inventory** (`user.inventory[]`) — items from loot drops + gacha pulls, stored on player, but NO backend logic to use/equip/consume them

The `/api/player/:name/inventory/use/:itemId` endpoint **removes the item but applies NO effect**.
Gacha items with stats (e.g. Wanderermantel with `ausdauer:6, weisheit:2`) can NOT be equipped because equip only searches `FULL_GEAR_ITEMS`.

## Goal
Unify the item systems so that:
- **Equipment items** (with stats/slots) from ANY source (shop, gacha, loot, NPC reward) can be equipped into character slots
- **Consumable items** (with instant effects) can be used with proper backend effect application + frontend feedback
- **Items can be discarded** with confirmation
- Clean, scalable architecture using an item template system

---

## Part 1: Item Template System

### Create `itemTemplates.json` (new file in `public/data/`)
Single source of truth for ALL item definitions. Similar to `questTemplates.json`.

```json
{
  "items": [
    {
      "id": "gold-small",
      "name": "Beutel mit Münzen",
      "type": "consumable",
      "rarity": "common",
      "icon": "/images/icons/loot-gold-small.png",
      "description": "Ein kleiner Beutel mit 15 Goldmünzen.",
      "effect": { "type": "gold", "amount": 15 },
      "minLevel": 1
    },
    {
      "id": "wanderermantel",
      "name": "Wanderermantel",
      "type": "equipment",
      "slot": "armor",
      "rarity": "rare",
      "icon": "/images/icons/gacha-wanderermantel.png",
      "description": "Ein robuster Mantel für lange Reisen.",
      "stats": { "ausdauer": 6, "weisheit": 2 },
      "minLevel": 1
    }
  ]
}
```

**Item types:**
- `consumable` — instant use, removed after use (gold, xp, bond, streak shields, etc.)
- `equipment` — equippable into a slot, has stats
- `passive` — sits in inventory, effect is always active while owned (gacha items like rarity_boost, pity_minus)
- `cosmetic` — visual only (titles, auras)
- `special` — unique mechanics (companion_egg, unlock_secret_quest, etc.)

### Migration
- Merge items from: `lootTables.json`, `gachaPool.json` standardPool, and `gearTemplates.json` into itemTemplates
- `lootTables.json` becomes a **drop table** that references item IDs from templates (not inline definitions)
- `gachaPool.json` pools reference item IDs from templates
- `gearTemplates.json` shop items reference item IDs from templates
- Keep backward compatibility: existing inventory items in `user.inventory[]` should still work (match by `itemId`)

### Loading
- Load `itemTemplates.json` into `state.itemTemplates` (Map by id)
- `resolveItem(itemId)` — looks up full item definition from template
- When items are added to inventory, store: `{ id: uniqueInstanceId, itemId: templateId, obtainedAt, source }`
- Template data (name, icon, stats, effect, type, slot) comes from the template at runtime, not stored per-instance

---

## Part 2: Consumable Use System

### Backend: Rewrite `POST /api/player/:name/inventory/use/:itemId`

Find item in inventory → look up template → apply effect → remove from inventory → return result with feedback.

**Effect handlers (implement ALL of these):**

| Effect Type | Action | Feedback Message |
|---|---|---|
| `gold` | Add `amount` to `user.gold` and `user.currencies.gold` | "+{amount} Gold erhalten!" |
| `xp` | Add `amount` to `user.xp` | "+{amount} XP erhalten!" |
| `xp_boost` | Store active buff: `{ type: 'xp_boost', amount, duration, activatedAt }` on user | "XP-Boost aktiv! +{amount}% für {duration}" |
| `bond` | Add `amount` to `user.companion.bondXp`, recalc bondLevel | "+{amount} Bond XP! {companion.name} freut sich!" |
| `streak_shield` | Add `amount` to `user.streakShields` | "+{amount} Streak-Schutzschild(e) erhalten!" |
| `forge_temp` | Add `amount` to user's forgeTemp | "Schmiedeglut +{amount}°! Forge-Temperatur steigt!" |
| `armor` | Currently no armor stat — either add or convert to ausdauer boost | TBD |
| `random_gear` | Roll a random gear item from tier appropriate to level, add to inventory | "Du erhältst: {item.name}!" |
| `random_gear_epic` | Same but minimum epic rarity | "Du erhältst: {item.name}!" |
| `companion_egg` | Future feature — store as pending | "Ein mysteriöses Ei... (coming soon)" |
| `cosmetic` | Add to `user.cosmetics[]` array | "Neuer Cosmetic freigeschaltet: {name}!" |
| `gear_next_tier` | Upgrade lowest-tier equipped item to next tier equivalent | TBD |
| `undo_missed_ritual` | Reset ritual miss counter | "Zweite Chance! Verpasstes Ritual zurückgesetzt." |
| `named_gear` | Add specific legendary weapon to inventory | "Legendäre Waffe erhalten: {name}!" |
| `team_buff` | Store active team buff (affects all players) | "Gildensegen aktiv! +{amount}% XP für alle!" |
| `title` | Add title to `user.titles[]` | "Neuer Titel freigeschaltet: {title}!" |
| `unlock_secret_quest` | Create a secret quest for the player | "Eine geheime Quest wurde freigeschaltet..." |
| `revive` | Add phoenix feather flag to user | "Phoenix-Feder bereit! Nächster Streak-Verlust wird verhindert." |

**Gacha passive items (NOT consumed, always active while in inventory):**

| Effect String | Action |
|---|---|
| `pity_minus_5` | Reduce pity counter by 5 when pulling (check in gacha pull logic) |
| `rarity_boost_15` | +15% rare+ chance in gacha (check in gacha pull logic) |
| `gold_boost_next` | 2x gold on next quest completion (check in quest complete logic, then consume) |
| `quest_timer_24h` | +24h on all active quest timers (apply once on use) |
| `streak_recovery_50` | 50% chance to recover streak on miss (check in streak logic) |
| `xp_boost_10` / `xp_boost_5` | Permanent +10%/+5% XP while item owned |
| `gold_2x_24h` | 2x gold for 24h (timed buff) |
| `essenz_boost_48h` | 2x essenz drops for 48h (timed buff) |
| `small_heal` | Consumable: +10 forge temp |

For items that should be `passive` type: check for their presence in inventory during relevant game actions (quest complete, gacha pull, streak check). Do NOT consume them — they're permanent.

For timed buffs: store `{ type, activatedAt, duration }` in `user.activeBuffs[]`. Check and expire in relevant endpoints.

### Response Format
```json
{
  "ok": true,
  "effect": { "type": "gold", "amount": 15 },
  "message": "+15 Gold erhalten!",
  "updatedValues": { "gold": 166 }
}
```

---

## Part 3: Equipment from Inventory

### Problem
Gacha items with stats (e.g. `wanderermantel` with `{ ausdauer: 6, weisheit: 2 }` and implicit slot `armor`) are in `user.inventory[]` but can't be equipped because `POST equip/:itemId` only searches `FULL_GEAR_ITEMS` (shop items).

### Solution
Modify equip endpoint to also check `user.inventory[]` for equipment-type items:

1. First check `FULL_GEAR_ITEMS` (shop buy+equip flow, costs gold)  
2. If not found there, check `user.inventory[]` for items with `type: "equipment"` (already owned, no gold cost)
3. Look up template for slot/stats
4. Equip into slot, remove from inventory (it's now "worn")
5. If something was already in that slot, return it to inventory

### Unequip
When unequipping, the item should go back to `user.inventory[]` (not disappear).
Current unequip just deletes from `user.equipment` — fix this to re-add to inventory.

### Level Requirement
Yes, use `minLevel` from item template. Check player level before equipping.
- Shop items already have `reqLevel` ✅
- Gacha/loot items: add `minLevel` to template (default 1 for most, higher for epic/legendary)

---

## Part 4: Discard System

### Backend: `POST /api/player/:name/inventory/discard/:itemId`
- Find item in inventory
- Remove it permanently
- Return `{ ok: true, discarded: item }`
- No gold/compensation (it's trash)

### Frontend: Confirm dialog before discard
- "Willst du {item.name} wirklich wegwerfen? Das kann nicht rückgängig gemacht werden."
- Red "Wegwerfen" button + grey "Abbrechen" button

---

## Part 5: Frontend — Inventory Item Actions

### Click on inventory item → Action popup (context menu style)
Small popup/tooltip appearing near the clicked item with available actions:

**For equipment items:**
- **Ausrüsten** (if not equipped, meets level req)
- **Ablegen** (if currently equipped)  
- **Wegwerfen** (with confirm)
- Item stats preview

**For consumable items:**
- **Benutzen** (primary action)
- **Wegwerfen** (with confirm)
- Effect description

**For passive items:**
- **Info** (shows effect description)
- **Wegwerfen** (with confirm)
- "Aktiv solange im Inventar" indicator

### Consume Feedback (Diablo-style)
When using a consumable:
1. Item glows briefly (0.3s pulse animation)
2. Item fades out (0.5s)
3. **Center-screen toast/banner** appears with:
   - Item icon + name
   - Effect description ("+50 Gold erhalten!")
   - Rarity-colored border
   - Auto-dismiss after 3s
4. Relevant stat in UI updates with a brief highlight/pulse

Do NOT use a blocking modal. Use a non-blocking toast/banner overlay — similar to the quest completion toasts already in the game.

### Equip Feedback
- Equipped item appears in character slot with brief glow
- Stats panel updates with green +X indicators for changed stats
- Short toast: "{item.name} ausgerüstet!"

---

## Part 6: Stat Effects (what stats DO)

Current state: only `glueck` does something (drop bonus). Define ALL stat effects:

| Stat | Effect | Formula |
|---|---|---|
| **Kraft** | +XP from quest completion | `+1% XP per point` (multiplicative with other bonuses) |
| **Ausdauer** | +Forge temp retention (slower decay) | `-0.5% decay rate per point` (base 2%/h) |
| **Weisheit** | +Gold from quest completion | `+1% Gold per point` |
| **Glück** | +Loot drop chance, +gacha rarity | `+0.5% drop chance per point` (already implemented) |

Integrate these into existing multiplier functions:
- `getXpMultiplier()` — add kraft bonus
- `getGoldMultiplier()` — add weisheit bonus  
- `calcDynamicForgeTemp()` — factor in ausdauer
- `getUserDropBonus()` — already uses glueck ✅

---

## Implementation Order (suggested)

### Task 1: Item Templates + Consumable Backend (foundation)
- Create `itemTemplates.json` with all items from loot + gacha + gear
- Load into state, create `resolveItem()` helper
- Rewrite `inventory/use` endpoint with full effect handlers
- Add `activeBuffs[]` system to users
- Add discard endpoint
- **NO frontend changes yet**

### Task 2: Equipment Unification + Stats  
- Modify equip endpoint to work with inventory items
- Modify unequip to return items to inventory
- Implement stat effects (kraft→xp, ausdauer→forge, weisheit→gold)
- Wire passive gacha item effects into game logic (quest complete, gacha pull, streak check)

### Task 3: Frontend — Actions + Feedback
- Inventory item click → action popup
- Use/Equip/Discard buttons
- Consume feedback animation + toast
- Equip feedback + stat highlights
- Discard confirm dialog
- Level requirement display on items

---

## Files to modify
- `lib/state.js` — load itemTemplates, resolveItem helper
- `lib/helpers.js` — stat effect formulas, buff checking
- `routes/habits-inventory.js` — use/equip/unequip/discard endpoints
- `routes/game.js` — integrate passive item effects into quest completion
- `routes/gacha.js` or wherever gacha pull logic is — integrate passive gacha effects
- `public/data/itemTemplates.json` — NEW: all item definitions
- `public/data/lootTables.json` — refactor to reference template IDs
- `components/CharacterView.tsx` — inventory actions, equip from inventory
- `components/` — new ItemActionPopup component, consume feedback toast

## Important constraints
- Keep backward compat with existing inventory items (match by `itemId` field)
- Don't break the shop flow (gearTemplates + FULL_GEAR_ITEMS still work)
- All user data changes go through proper save functions
- Level requirement check on equip
- Exhaustive effect handlers — every effect type in lootTables AND gachaPool must work
