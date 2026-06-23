# Architecture Guide

> For LLMs and developers working on QuestHall. This document explains how the system works, where things live, and what to watch out for.

## System Overview

QuestHall is a monolithic Node.js application: an Express API server that also serves a Next.js static frontend. All persistence is JSON files on disk — no database.

```
Browser → Express (port 3001) → lib/state.js (in-memory) → /data/*.json (disk)
                              → /out/ (static Next.js build)
```

## Directory Map

| Directory | Purpose | Language |
|-----------|---------|----------|
| `lib/` | Backend business logic (state, helpers, engines) — 9 files | JS (CommonJS) |
| `routes/` | Express route handlers (32 files, ~18,950 lines) | JS (CommonJS) |
| `app/` | Next.js app directory (page, types, utils, context) | TypeScript |
| `components/` | React UI components (58 files, ~37,100 lines) | TypeScript |
| `public/data/` | Read-only game templates (JSON) | JSON |
| `data/` | Runtime persistent data (Docker volume) | JSON |
| `server.js` | Express entry point, boot sequence | JS |

## Data Flow

### Two directories, two purposes

```
public/data/  (DATA_DIR)     → Read-only templates shipped with the image
data/         (RUNTIME_DIR)  → Mutable runtime state (Docker volume mount)
```

Files in `public/data/` are **templates** — they define what items, NPCs, quests etc. exist (56 JSON files including `worldBosses.json`, `gems.json`, `uniqueItems.json`, `talentTree.json`).
Files in `data/` are **runtime state** — they track what players have done, their inventory, quest progress, etc.

On first boot, `ensureRuntimeFiles()` seeds `data/` with empty defaults. `seedMutableFiles()` copies templates that need to be mutable (questCatalog, classes, roadmap) from `public/data/` to `data/`.

### State management (lib/state.js)

All runtime data lives in the `state` object, which is a global singleton imported by all route files.

#### Primary data

| Field | Type | Description |
|-------|------|-------------|
| `state.users` | Object (keyed by lowercase userId) | Player profiles |
| `state.quests` | Array | All quests (open, completed, etc.) |
| `state.campaigns` | Array | Campaign quest chains |
| `state.rituals` | Object `{active, completed, vows}` | Player rituals |
| `state.habits` | Array | Tracked habits |
| `state.npcState` | Object | Active NPCs, cooldowns, quest IDs |
| `state.gachaState` | Object (keyed by playerId) | Pity counters, pull history |

#### O(1) lookup Maps (IMPORTANT — always use these instead of array scans)

| Map | Keyed by | Description |
|-----|----------|-------------|
| `state.questsById` | quest ID | O(1) quest lookup — **always use instead of `state.quests.find()`** |
| `state.usersByName` | lowercase name | O(1) user lookup by name — **use for login/register** |
| `state.usersByApiKey` | API key string | O(1) user lookup by API key — **use for auth** |
| `state.questCatalogById` | template ID | O(1) quest template lookup |
| `state.gearById` | gear item ID | O(1) gear item lookup |
| `state.itemTemplates` | item ID | O(1) consumable item lookup |
| `state.validApiKeys` | (Set) | O(1) API key validation |

#### Keeping Maps in sync

When mutating `state.quests`:
```js
// After push:
state.quests.push(quest);
state.questsById.set(quest.id, quest);  // ← ALWAYS ADD THIS

// After reassignment (filter/replace):
state.quests = state.quests.filter(...);
rebuildQuestsById();  // ← ALWAYS CALL THIS

// After user creation:
state.usersByName.set(name.toLowerCase(), user);
state.usersByApiKey.set(apiKey, user);
```

### Save pattern

Saves use **debouncing** (200ms) to coalesce rapid writes:
```js
debouncedSave('users', () => writeFileSync(FILES.USERS, ...));
```
On shutdown, `flushPendingSaves()` executes all pending saves immediately (not just cancels timers).

**Important**: Saves are still synchronous (`writeFileSync`). The debounce prevents thrashing, but each write blocks the event loop briefly.

## Route Structure

All routes are mounted in `server.js` in order. The last route file (`npcs-misc.js`) contains the SPA catch-all `GET /*`.

| File | Key Endpoints | Auth |
|------|---------------|------|
| `agents.js` | Agent CRUD, heartbeat, commands, `/api/health` | API key |
| `quests.js` | Quest CRUD, claim, complete, bulk ops | API key |
| `config-admin.js` | Game config, leaderboard, **`/api/dashboard`** batch, quest pool, admin keys | Mixed |
| `users.js` | Registration, JWT auth, XP awards, streaks | Rate-limited login |
| `players.js` | Player profiles, companions, favorites | Mixed |
| `shop.js` | Gear purchase, shop items (self-care + boosts), forge challenges | API key |
| `currency.js` | Currency earn/spend/convert | API key |
| `gacha.js` | Banner pulls (1x, 10x), pity tracking | API key + pull lock |
| `game.js` | Classes, roadmap, rituals | Mixed |
| `habits-inventory.js` | Habits, inventory, equipment, item effects | API key |
| `integrations.js` | GitHub webhook (HMAC verified), catalog API | Webhook signature |
| `campaigns.js` | Campaign CRUD, quest chains | API key |
| `crafting.js` | Crafting professions, Schmiedekunst (dismantle/transmute) | API key |
| `challenges-weekly.js` | Sternenpfad: 3-stage solo weekly challenges with star ratings, modifiers, speed bonus | API key |
| `expedition.js` | Expedition: cooperative weekly challenge with shared checkpoints, scaling by player count | API key |
| `social.js` | Friends (online status), messages (read receipts), trades (item picker), activity feed | API key |
| `rift.js` | Rift/Dungeon: timed quest chains with 3 tiers (Normal/Hard/Legendary), full reward pipeline | API key |
| `battlepass.js` | Season Pass: 40-level reward track with XP from quests/rituals/missions | API key |
| `factions.js` | Die Vier Zirkel: 4 factions with 6 rep tiers, auto-rep from quests | API key |
| `world-boss.js` | World Boss: community bosses, contribution damage, unique drops, spawn cycle | API key |
| `gems.js` | Gem/Socket system: 6 gem types, 5 tiers, socket/unsocket/upgrade/salvage | API key |
| `dungeons.js` | Dungeon system: create/join runs, collect rewards, unique item drops | API key |
| `talent-tree.js` | Passive Talent Tree "Schicksalsbaum": allocate/deallocate/reset, effect aggregation | API key |
| `sworn-bonds.js` | Sworn Bonds: 1-on-1 pact, weekly objectives, chest claims, contribution tracking | API key |
| `adventure-tome.js` | Adventure Tome "Abenteuerbuch": per-floor completionist tracker, milestone claims | API key |
| `codex.js` | Codex: knowledge entries, unlockable lore | API key |
| `enchanting.js` | Enchanting (D3 Mystic): targeted stat reroll with escalating cost | API key |
| `kanais-cube.js` | Kanai's Cube: extract/equip legendary powers | API key |
| `mail.js` | In-game mail system | API key |
| `schmiedekunst.js` | Schmiedekunst: salvage (dismantle/Salvage All), transmute | API key |
| `npcs-misc.js` | NPC rotation, feedback (admin-only), SPA fallback | Master key (feedback) |
| `docs.js` | OpenAPI spec, HTML docs | Public |

### Batch Dashboard Endpoint

`GET /api/dashboard?player=X` returns everything the frontend needs in **one call** instead of 14 separate fetches:

```json
{
  "agents": [...],
  "quests": { "open": [...], "inProgress": [...], "completed": [...], "suggested": [...], "rejected": [...] },
  "users": [...],
  "achievements": [...],
  "campaigns": [...],
  "rituals": [...],
  "habits": [...],
  "favorites": [...],
  "activeNpcs": [...],
  "weeklyChallenge": { ... },
  "expedition": { ... },
  "dailyBonusAvailable": true,
  "socialSummary": { "pendingFriendRequests": 0, "unreadMessages": 0, "activeTrades": 0 },
  "dailyMissions": { "missions": [...], "earned": 0, "total": 750, "milestones": [...] },
  "apiLive": true
}
```

The frontend tries this first, falls back to individual fetches if unavailable.

### Authentication layers

1. **API Key** (`requireApiKey` / `requireAuth`): Header `X-API-Key` or JWT Bearer token
2. **Master Key** (`requireMasterKey`): For admin operations (key management, NPC rotation, feedback)
3. **JWT**: Login returns access + refresh tokens. Refresh cookie at `/api/auth`
4. **Pull Lock**: Per-player mutex prevents concurrent gacha pulls (in-memory Map)
5. **Rate Limit**: Global 2000 req/15min + 10 req/min on login/register endpoints
6. **Webhook**: GitHub webhook verified via HMAC-SHA256 (`GITHUB_WEBHOOK_SECRET` env var)

## Pagination

GET endpoints support optional pagination via query params:
```
?limit=50&offset=0
```
Returns: `{ items, total, limit, offset, hasMore }`

Without `?limit`, endpoints return all data (backward compatible).

Supported on: `/api/users`, `/api/feedback`, `/api/catalog`.

Use `paginate(array, req.query)` helper from `lib/helpers.js`.

## Gear & Equipment System

- **7 Slots**: weapon, shield, helm, armor, amulet, ring, boots
- **4 Tiers**: T1 Abenteurer (L1-8), T2 Veteranen (L9-16), T3 Meister (L17-24), T4 Legendär (L25-50). T5 is reserved exclusively for unique named items (not a generic gear tier).
- **Stats**: Primary — kraft, weisheit, ausdauer, glueck. Minor — fokus, vitalitaet, charisma, tempo. All summed from equipped items.
- **Affix rolling** (D3-style): rarity determines affix *count*, level determines stat *value ranges*. A level-30 common and a level-30 legendary roll from the same ranges — the legendary just has more affix slots.
- **Tier Set Bonuses**: auto-detected by tier (flat / small % stat bonuses)
- **Named Set Bonuses**: Defined in `gearTemplates.json → namedSets[]`. Support partial (2/3 threshold) and full bonuses.
- **Legendary Effects**: Items with `rarity: "legendary"` can have a `legendaryEffect` field. ~22 effect types now exist — the full list is documented in CLAUDE.md (`xp_bonus`, `gold_bonus`, `drop_bonus`, `decay_reduction`, `streak_protection`, `variety_bonus`, `material_double`, `night_double_gold`, `every_nth_bonus`, `auto_streak_shield`, `crit_chance`, `companion_bond_boost`, `cooldown_reduction`, `salvage_bonus`, `faction_rep_boost`, `challenge_score_bonus`, `dungeon_loot_bonus`, `forge_temp_flat`, `pity_reduction`, `expedition_speed`, `gem_preserve`, `ritual_streak_bonus`). Applied via `getLegendaryModifiers()` in `lib/helpers.js`.
- **Primary stat effects**: Kraft → +0.5% XP per point, Weisheit → +0.5% Gold per point, Ausdauer → -0.5% forge decay per point, Glück → +0.5% drop chance per point. Soft caps are managed by the D3-style bucket system (additive within a bucket, multiplicative between buckets), not a flat per-stat cap.
- **Minor stat effects**: Fokus → +1 flat XP per point, Vitalität → +1% streak protection per point, Charisma → +5% bond XP per point, Tempo → +1 forge temp recovery per point.

## Title System

- **Definitions**: `public/data/titles.json` — each title has `id`, `name`, `rarity`, `condition`
- **Conditions**: `level`, `quests_completed`, `streak`, `inventory_count`, `gold`, `npc_chains`, `forge_temp`, `gacha_legendary`, `full_equipment`
- **Award**: `checkAndAwardTitles(userId)` runs on quest completion. Earned titles stored in `user.earnedTitles[]`.
- **Equip**: `POST /api/player/:name/title/equip` with `{ titleId }` or `{ titleId: null }` to unequip
- **Display**: Equipped title shown in Player Card (page.tsx) and Leaderboard (LeaderboardView.tsx)

## Frontend Architecture

### Code splitting

View components are lazy-loaded with `React.lazy()` + `Suspense`:
- `LeaderboardView`, `HonorsView`, `ShopView`, `GachaView`
- `CharacterView`, `RitualChamber`, `ForgeView`, `ChallengesView`
- `DailyLoginCalendar`, `SocialView`, `TavernView`, `RiftView`
- `FactionsView`, `BattlePassView`, `WorldBossView`, `DungeonView`
- `PlayerProfileModal`

Only loaded when the tab is activated — reduces initial bundle by ~40%.

### Performance optimizations

- **React.memo**: `QuestCard`, `CompletedQuestRow`, `EpicQuestCard`, `AgentCard` wrapped to prevent unnecessary re-renders
- **content-visibility**: `.cv-auto` CSS class on quest cards — browser skips rendering offscreen cards
- **GPU scrolling**: `will-change: scroll-position` on body
- **useMemo/useCallback**: Filter and sort functions memoized
- **Batch fetch**: `fetchDashboard()` replaces 14 individual API calls with 1

### Quest pool constraints

The quest system limits what players see:
- **~10 open quests** in the daily pool (rotated)
- **Max ~25 in-progress** before XP malus makes it pointless (80% penalty at 30+)
- **Total visible:** ~35 quest cards maximum — no virtual scrolling needed

## Game Systems

### Quest lifecycle
```
suggested → open → claimed (in_progress) → completed
                 → unclaimed (released back to open)
```

Quests can be: player-created, NPC-generated, GitHub webhook-generated, daily rotation, or template-spawned.

### NPC system
- NPCs rotate via `npc-engine.js` — spawn with cooldowns, stay for X days, then depart
- Each NPC has quest chains defined in `npcQuestGivers.json`
- Permanent NPCs (Dobbie, Lyra) never depart

### Gacha system
- Two banner types: Standard, Featured
- Pity system: soft pity at 60 pulls (+2.5% legendary rate per pull thereafter), hard pity at 75 (legendary guaranteed)
- Epic pity: guaranteed every 10 pulls
- Duplicate items refund currency (Runensplitter)
- Per-player pull lock prevents race conditions

### XP & Leveling
- 50 levels defined in `levels.json` (levels 31-50 are prestige levels with unique titles)
- XP/Gold use D3-style **buckets** (additive within a bucket, multiplicative between buckets) — see CLAUDE.md "Multiplier Stacking Rules" for the canonical formula
- XP buckets include: forge (forge temp + kraft), gear, companion + bond, equipment effects, buffs, situational, procs (crit/double-quest), penalties (hoarding malus × daily diminishing returns); plus a flat rested-XP bonus
- Gold buckets include: forge (forge temp + weisheit + workshop), streak gold, legendary gold bonuses

### Currency system

7 currencies: gold, stardust, essenz, runensplitter, gildentaler, mondstaub, sternentaler.

- **Gold**: Primary currency (quest rewards, shop purchases, crafting costs)
- **Stardust**: Premium currency (level-up rewards, season rewards)
- **Essenz**: Crafting currency
- **Runensplitter**: Gacha currency
- **Gildentaler**: Guild/cooperative currency
- **Mondstaub**: Special/event currency
- **Sternentaler**: Sternenpfad weekly challenge currency
- Conversion between currencies with 20% tax

### Bazaar Shop System
- **Two categories**: Self-care rewards (real-world treats) + Boosts (temporary gameplay buffs)
- **Boosts**: Items with an `effect` field in `shopItems.json` — applied server-side via `applyShopEffect()` in `routes/shop.js`
- **Buff types**: `xp_boost_10`, `gold_boost_10`, `luck_boost_20`, `streak_shield`, `material_double` (quest-counted buffs added to `user.activeBuffs[]`)
- **Instant effects**: `instant_stardust`, `instant_essenz` (directly modify `user.currencies`)
- **Buff consumption**: Handled in `lib/helpers.js → onQuestCompletedByUser()` — `questsRemaining` decremented per quest, removed when 0
- **Frontend**: `ShopView.tsx` renders boosts (purple accent) above self-care (amber accent)

### Companion Ultimates
- **Unlock**: Bond Level 5 ("Best Friend")
- **Cooldown**: 7 days per use
- **3 Abilities**: Instant quest complete, double next reward, +3 streak days
- **Visual**: Golden glow + breathing animation on widget (4s)
- **Buff system**: `double_reward` buff integrates with `onQuestCompletedByUser` via `activeBuffs`
- **Endpoint**: `POST /api/player/:name/companion/ultimate`

### Achievement Points System
- Each achievement awards points based on rarity: common=5, uncommon=10, rare=25, epic=50, legendary=100
- Points accumulate in `user.achievementPoints`
- **Cosmetic frame milestones**: At 50/100/200/350/500/750/1000/1500/2000/3000 pts, players unlock decorative frames for their UserCard
- **Title milestones**: At certain thresholds, exclusive titles are awarded
- Frames equipped via `POST /api/player/:name/frame`
- Frame renders as colored border + optional glow on UserCard

### Artisan's Quarter (Crafting System)
- **8 Professions** (2-slot limit per player; Koch + Verzauberer are secondary and don't consume a slot): Schmied/Grimvar, Schneider/Selina, Lederverarbeiter/Roderic, Waffenschmied/Varn, Juwelier/Selindra, Alchemist/Ysolde, Verzauberer/Eldric, Koch/Bruna
- **300 max skill** (WoW Classic 1:1 model), **4 ranks**: Apprentice → Journeyman → Expert → Artisan
- **~866 recipes** total, each tied to a unique named item template, with recipe-specific XP
- **Recipe discovery**: Higher-skill recipes hidden until the required skill is reached
- **Batch crafting**: Recipes support `count` param (1-10), costs multiplied accordingly
- **Daily crafting bonus**: First craft each day grants 2x profession XP, tracked via `u.lastCraftDate`
- **Skill-up colors** (WoW-style): Orange (guaranteed skill-up), Yellow (likely), Green (rare), Gray (no skill-up) based on diff between current skill and recipe requirement
- **Per-recipe cooldowns**: Tracked in `u.professions[id].recipeCooldowns[recipeId]`, independent per recipe
- **91 materials** (common→legendary, includes intermediate mats like bars/bolts/cured leather): Drop from quest completion, rates defined in `professions.json → materialDropRates`
- **Schmiedefieber / Forge Fever**: Every 48h a random profession enters a 4h fever (-50% material cost, 2x skill XP); 5+ crafts during the window earns a bonus material cache — see dedicated section below
- **Schmiedekunst** (salvage tab, `routes/schmiedekunst.js`): Dismantle items → essenz + material drops; D3-style Salvage All per rarity (legendary excluded); Transmute 3 same-slot epics + 500g → random legendary
- **Workshop Tools**: 4-tier permanent XP upgrades (Sturdy 2% → Mythic 10%), sequential unlock via gold/essenz
- **Profession synergy hints**: paired professions surface detailed synergy explanations
- **Cross-navigation**: Character ↔ Artisan's Quarter links via `onNavigate` prop
- **NPC evolution**: Card border glow/opacity intensifies with rank; portrait border evolves with skill
- **Pre-validation**: Cost/eligibility checks run BEFORE cost deduction to prevent resource loss on failure
- **Frontend**: `ForgeView.tsx` — Artisan's Quarter tab with 2-panel WoW-style crafting modal (left = recipe list color-coded by skill-up, right = detail with materials + create), Workshop Tools, NPC popout modals (createPortal)
- **Endpoints**: `GET /api/professions?player=X` (with dailyBonus), `POST /api/professions/craft` (with count), `POST /api/professions/choose`, `POST /api/professions/switch`, `POST /api/schmiedekunst/dismantle`, `POST /api/schmiedekunst/dismantle-all`, `POST /api/schmiedekunst/transmute`
- **Data**: `public/data/professions.json` (8 professions, 91 materials, ~866 recipes, drop rates)

### Challenges System

Two weekly challenge types, accessible under a single "Challenges" tab with toggle buttons:

**Sternenpfad (Solo)**
- 3-stage weekly challenge with star ratings (1-3 per stage, max 9 stars)
- Template rotation: deterministic via ISO week seed (`weekSeed % templates.length`)
- **Star thresholds**: Each stage defines 3 overachievement thresholds. 1★ at threshold[0], 2★ at threshold[1], 3★ at threshold[2]
- **Speed bonus**: Complete a stage within `speedBonusDays` (default 2) for +1★ (capped at 3)
- **Weekly modifiers**: Rotate per week, apply bonus/malus multipliers to specific quest types. Effective progress stored as `progress.effective` alongside raw counts
- **Star-scaled rewards**: Base rewards + bonus (2★: +15%, 3★: +33%)
- **Endpoints**: `GET /api/weekly-challenge?player=X`, `POST /api/weekly-challenge/progress`, `POST /api/weekly-challenge/claim`
- **Data**: `public/data/weeklyChallenges.json` (8 templates, 6 modifiers)

**Expedition (Cooperative)**
- Guild-wide cooperative challenge with shared checkpoint progress
- 4 checkpoints (3 regular + 1 bonus): required quest count scales with registered player count (`questsPerPlayer × playerCount`)
- **Nachholmechanik**: No per-player contribution cap — active players compensate for inactive ones
- **Bonus checkpoint**: Awards a rotating title from `bonusTitles` pool
- Auto-contribution: `contributeQuest(userId)` called from `onQuestCompletedByUser()` in helpers.js
- **Endpoints**: `GET /api/expedition?player=X`, `POST /api/expedition/claim`
- **Data**: `public/data/expeditions.json` (8 narrative templates, 6 bonus titles)
- **State**: `data/runtime/expedition.json` (debounced writes, separate from user data)

### Social System ("The Breakaway")

Player-to-player social features accessible via the "Social" tab in the Trading District.

**Friends**
- Friend request system (send/accept/decline) with 2-way confirmation
- Friends list as card grid (2-3 columns) with 3-tier online status:
  - `online` (green dot + glow) = agent online OR active within 5 min
  - `idle` (yellow dot) = active within 30 min
  - `offline` (gray dot) = inactive > 30 min
- `lastActiveAt` tracking via `requireAuth` middleware on every authenticated request
- **Endpoints**: `GET /api/social/:playerId/friends`, `POST /api/social/friend-request`, `DELETE /api/social/friend/:friendId`

**Messages**
- Direct messaging between friends, 500 char limit per message
- Conversations with unread count, auto-read on fetch (marks `read: true` + `readAt` timestamp)
- Double-checkmark read receipts in UI (✓ sent, ✓✓ blue read)
- Auto-refresh every 10s when conversation is active
- **Endpoints**: `GET /api/social/:playerId/conversations`, `GET /api/social/:playerId/messages/:otherId`, `POST /api/social/message`

**Trading**
- Item + gold trading with negotiation rounds (back-and-forth counter-offers)
- Both players must accept current terms for execution — atomic gold + item transfer
- Item validation (ownership, not equipped), gold validation
- D3-style rarity-colored item display with left border accent
- **Endpoints**: `POST /api/social/trade/propose`, `POST /api/social/trade/:id/counter`, `POST /api/social/trade/:id/accept`, `POST /api/social/trade/:id/decline`

**Activity Feed**
- WoW Guild News-style feed showing events from friends + own activity
- Event types: `quest_complete`, `level_up`, `achievement`, `gacha_pull` (epic+), `rare_drop`, `trade_complete`
- Capped at 500 events, enriched with player name/avatar/color
- Auto-refresh every 30s in frontend
- **Endpoint**: `GET /api/social/:playerId/activity-feed?limit=30`
- **State**: `socialData.activityLog` array in `data/social.json`

### The Rift (Dungeon System)

Timed quest chains with escalating difficulty, accessible from "The Great Halls" floor.

- **3 Tiers**: Normal (3 quests/72h), Hard (5/48h), Legendary (7/36h)
- **Difficulty scaling**: 1x → 1.5x → 2x → 2.5x → 3x → 3.25x → 3.5x per stage
- **Fail cooldown**: 3/5/7 days per tier (cleared on success)
- **Min level gates**: Normal=1, Hard=5, Legendary=10
- **Endpoints**: `GET /api/rift`, `POST /api/rift/enter`, `POST /api/rift/complete-stage`, `POST /api/rift/abandon`
- **State**: Per-user `riftState` in users data (activeRift, cooldowns, history)
- **Files**: `routes/rift.js`, `components/RiftView.tsx`

### The Hearth (Tavern/Rest Mode)

Rest area within "The Breakaway" floor, inspired by Urithiru's gathering halls.

- **Rest mode**: Freeze streaks + forge temp for 1-7 days
- **Auto-expire**: Ends after selected duration
- **30-day cooldown** between rest periods
- **Leave early**: Restores frozen values
- **History**: Last 5 rest entries tracked
- **Endpoints**: `GET /api/tavern/status`, `POST /api/tavern/enter`, `POST /api/tavern/leave`
- **Files**: `routes/players.js`, `components/TavernView.tsx`

### Season Pass (Battle Pass)

40-level reward track with XP earned from quests, rituals, daily missions.

- **XP sources**: quest completion (10-50 XP by rarity), ritual (8), vow clean day (5), daily mission milestones
- **Rewards**: Gold, essenz, runensplitter, stardust, exclusive titles, cosmetic frames
- **Endpoints**: `GET /api/battlepass`, `POST /api/battlepass/claim/:level`
- **Files**: `routes/battlepass.js`, `components/BattlePassView.tsx`, `public/data/battlePass.json`

### Faction System (Die Vier Zirkel)

4 factions with reputation tiers, auto-gained from quest completion.

- **Factions**: Zirkel der Glut (`glut`, fitness), Zirkel der Tinte (`tinte`, learning), Zirkel des Amboss (`amboss`, development + personal), Zirkel des Echos (`echo`, social)
- **6 rep tiers**: Neutral → Friendly → Honored → Revered → Exalted → Paragon
- **Auto-rep**: Quest completions grant +10-30 rep to matching faction based on quest type
- **Tier rewards**: Titles, recipes, frames, shop discounts, legendary effects
- **Endpoints**: `GET /api/factions`, `POST /api/factions/claim-reward`
- **Files**: `routes/factions.js`, `components/FactionsView.tsx`, `public/data/factions.json`

### World Boss System

Community-wide boss encounters where all players contribute damage via quest completions.

- **3 Boss Tiers**: Champion, Titan, Colossus (escalating HP and rewards)
- **Contribution tracking**: Per-player damage, multiplied by level and gear score
- **Unique drops**: Boss-only items including Unique Named Items (handcrafted legendaries with fixed stats)
- **Spawn cycle**: Bosses appear on a schedule with downtime between encounters
- **Enrage timer**: Boss must be defeated before timer expires
- **Ranked rewards**: Top contributors earn bonus loot and exclusive titles
- **Endpoints**: `GET /api/world-boss`, `POST /api/world-boss/contribute`, `POST /api/world-boss/claim`
- **Data**: `public/data/worldBosses.json` (boss templates, HP pools, drop tables)
- **Files**: `routes/world-boss.js`, `components/WorldBossView.tsx`

### Gem & Socket System

Diablo-style gem socketing for gear enhancement.

- **6 Gem Types**: Ruby (kraft), Sapphire (weisheit), Emerald (glueck), Topaz (ausdauer), Amethyst (vitalitaet), Diamond (fokus)
- **5 Tiers**: Chipped → Flawed → [Name] → Flawless → Royal (stat bonuses: +2/+4/+7/+11/+16)
- **Socketing**: Insert gems into gear with sockets; one gem per socket
- **Upgrading**: Combine 3 same-tier gems → 1 next-tier gem
- **Salvage**: Recover a lower-tier gem from a socketed item
- **Endpoints**: `GET /api/gems`, `POST /api/gems/socket`, `POST /api/gems/unsocket`, `POST /api/gems/upgrade`
- **Data**: `public/data/gems.json` (gem definitions, tier stats, upgrade paths)
- **Files**: `routes/gems.js`

### Mythic+ Endless Rift

Infinite scaling rift levels beyond Legendary tier, for endgame players.

- **Entry**: Unlocked after completing a Legendary Rift
- **Scaling**: Starts at Mythic+1, each level adds +0.25x difficulty multiplier
- **No fail cooldown**: Retry immediately on failure (unlike standard Rift tiers)
- **Leaderboard**: Tracks highest Mythic+ level per player
- **Bonus loot tiers**: Enhanced rewards at M+5, M+10, M+15, M+20
- **Unique rewards**: Exclusive titles and items at milestone levels
- **Files**: `routes/rift.js` (extended with Mythic+ logic)

### Dungeon System ("The Undercroft")

Async cooperative group dungeons (2-4 players) with idle timers and gear-score-based outcomes.

- **Room**: The Great Halls → The Undercroft
- **3 tiers**: Sunken Archive (Normal Lv10, GS 100), Shattered Spire (Hard Lv20, GS 250), Hollow Core (Legendary Lv35, GS 500)
- **Flow**: Create run → invite friends → auto-start at minPlayers → 8h idle timer → collect individual rewards
- **Success**: Determined once per run (first collector calculates); based on combined gear score + bond bonus vs scaled threshold
- **Rewards**: Gold, essenz, runensplitter, sternentaler, crafting materials, gem drops, actual gear items, unique named items
- **Cooldown**: 7 days per dungeon after collecting
- **Persistence**: `data/dungeonState.json` (activeRuns, cooldowns, history)
- **Files**: `routes/dungeons.js`, `components/DungeonView.tsx`, `public/data/dungeons.json`

### Companion Expeditions

Idle mechanic for companions — send your companion on timed expeditions for rewards.

- **4 expeditions**: Quick Forage (4h), Deep Woods (8h), Mountain Pass (12h), Ancient Ruins (24h)
- **Bond multiplier**: 1 + bondLevel × 0.1 (scales gold rewards)
- **Rewards**: Gold, essenz, runensplitter, crafting materials, gems, rare item drops (highest tier)
- **Cooldown**: 1 hour between expeditions
- **No bond XP while on expedition** (petting still allowed, just no XP)
- **Files**: `routes/players.js` (endpoints), `public/data/companionExpeditions.json` (templates)
- **Frontend**: `components/CompanionsWidget.tsx` — tier selection, countdown timer, reward collection

### Unique Named Items

Handcrafted legendary items with fixed stats, unique flavor text, and lore.

- **Not randomly rolled**: Unlike standard gear, stats are predetermined
- **Collection log**: Per-player tracking of discovered unique items (`user.collectionLog` + `user.collectionLogDates`)
- **Sources**: World boss drops (`source: "world_boss:{bossId}"`), dungeon drops (`source: "dungeon:{dungeonId}"`), Mythic+ Rift rewards, special events
- **Instance creation**: `createUniqueInstance()` rolls from affix pools, applies legendary effect
- **Data**: `public/data/uniqueItems.json` (item definitions, stats, lore, source info)

### Enchanting Overhaul (D3 Mystic Style)

Targeted stat rerolling at the Enchanter (Eldric), replacing the old blanket reroll.

- **Targeted reroll**: Pick one stat on an item to reroll from its affix pool
- **Other stats preserved**: Only the selected stat changes
- **Escalating cost**: Each successive reroll on the same item costs more
- **Locked stat**: Visually marked — once you pick a stat to reroll, that slot is locked for future rerolls
- **Files**: `routes/enchanting.js`

### Kanai's Cube

D3-style power extraction — store and equip legendary effects independently of the item.

- **Extract**: Destroy a legendary item to permanently learn its legendary power
- **Equip**: Slot an extracted power so its effect applies without wearing the source item
- **Files**: `routes/kanais-cube.js`

### Schmiedekunst (Salvage & Transmute)

Standalone salvage/transmute system surfaced in the Artisan's Quarter.

- **Dismantle**: Break items down → essenz + material drops; slot-locked selection UI
- **Salvage All**: D3-style bulk dismantle per rarity (legendary excluded)
- **Transmute**: 3 same-slot epics + 500g → one random legendary
- **Files**: `routes/schmiedekunst.js`

### Passive Talent Tree (Schicksalsbaum)

Wolcen Gate-of-Fates-inspired circular passive tree.

- **44 nodes** across **3 concentric rings**: Inner/Grundstein (12 foundational), Middle/Zwielicht (18 specialization with tradeoffs), Outer/Aszension (14 capstone)
- **Unlock**: Level 5; 1 point per 2 levels; max 23 points
- **Mutually exclusive choice groups** (e.g. Blutzoll vs Gierige Flamme); multi-rank nodes; 5 build archetypes
- **Respec**: 500g + 50 essenz
- **Effects**: forge decay reduction, streak grace period, quest pool expansion, companion bond boost, variety chain bonus, rift stage skip, friend XP echo, tavern passive gold, codex permanent XP — aggregated via `getUserTalentEffects()`
- **Files**: `routes/talent-tree.js`, `components/TalentTreeView.tsx`, `public/data/talentTree.json`

### Adventure Tome (Abenteuerbuch)

Lost Ark-inspired per-floor completionist tracker.

- **5 floors**, each with 8-12 objectives tracking quests, rifts, dungeons, crafts, companions, streaks, factions
- **Milestone rewards** at 25% / 50% / 75% / 100% per floor — gold, currencies, exclusive titles, cosmetic frames
- **Total completion percentage** aggregated across all floors
- **Files**: `routes/adventure-tome.js`, `components/AdventureTomeView.tsx`

### Sworn Bonds

1-on-1 friendship pact with shared weekly objectives.

- **Flow**: propose → accept → shared weekly objectives
- **4 objective types**: combined quests, combined XP, individual quests, type variety
- **Bond Level 1-10** (Bekannte → Ewiger Bund) with scaling Bond Chest rewards (gold + essenz + 5-15% Duo Frame chance)
- **Duo Streak** for consecutive completed weeks; 7-day break cooldown; auto-break on unfriend
- **Integrations**: per-banner gacha pity, 3 achievements, codex entry, Adventure Tome objective, activity feed events, Battle Pass XP on claim
- **Files**: `routes/sworn-bonds.js`

### Codex

Unlockable in-world knowledge/lore.

- **Knowledge entries** unlock as players progress; some grant small permanent bonuses (e.g. permanent XP from talent-tree synergy)
- **Files**: `routes/codex.js`

### In-game Mail

Asynchronous in-game mail system.

- **Send/receive** messages and (where applicable) attachments between players/systems
- **Files**: `routes/mail.js`

### Schmiedefieber (Forge Fever)

Time-limited profession buff event, rotated at midnight (Berlin time).

- **Rotation**: Every 48h a random profession enters Fever for exactly 4h (cannot repeat the same profession consecutively)
- **Buffs during Fever**: -50% material cost (gold cost unchanged), 2x skill XP (stacks with daily first-craft bonus)
- **Bonus cache**: 5+ crafts during the window → cache of 2-4 random uncommon-rare materials for that profession, claimable once per event
- **Per-player tracking**: craft count tracked per player per fever event
- **Files**: `routes/crafting.js`, `components/ForgeView.tsx`, state in `state.forgeFever`, rotation in `lib/rotation.js`

### Rested XP Pool

WoW Classic-style offline XP accumulation.

- **Accumulation**: +5% of level XP per 8h offline, capped at 150% of the current level's XP
- **Effect**: Doubles XP gains until the pool is depleted
- **Display**: Shown as a blue zone in the XP bar

### Daily Diminishing Returns

Smooth 6-tier curve that discourages mass-completing quests for full value.

- **Curve** (quests completed today → multiplier): 1-5 = 100%, 6-7 = 90%, 8-10 = 75%, 11-15 = 60%, 16-20 = 50%, 21+ = 25%
- Applied as a multiplicative penalty in the XP/Gold formulas (see CLAUDE.md "Multiplier Stacking Rules")

## Security measures

- GitHub webhook HMAC-SHA256 signature verification (`GITHUB_WEBHOOK_SECRET`)
- Auth rate limiting (10 attempts/min/IP on login/register)
- Feedback endpoints require master key (admin only)
- JWT with refresh token rotation
- API key validation via Set (O(1) lookup)
- User lookup via Map (O(1) — no array scan)
- Trade execution lock (prevents concurrent double-spend)
- Crafting material lock (prevents concurrent material drain)
- Habit ownership validation on score/delete endpoints

## Memory management

- `todayCompletions`: Pruned hourly — only today's entries kept
- `departureNotifications`: Capped at 50 most recent
- `revokedRefreshTokens`: Pruned hourly (tokens older than 1h removed)
- Debounced saves prevent disk thrashing
- `flushPendingSaves()` executes (not just cancels) pending writes on shutdown

## Known limitations

- **No database**: JSON file persistence limits concurrent writes and scalability
- **Synchronous saves**: `writeFileSync` blocks event loop briefly (debounced to 200ms)
- **No clustering**: Single-process, single-thread
- **Effect handler**: Large switch statement in `habits-inventory.js` (25+ cases) — not data-driven yet
- **No schema validation**: JSON files parsed without schema enforcement

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `API_KEY` / `API_KEYS` | Yes | API authentication (comma-separated) |
| `MASTER_KEY` | No | Admin operations |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `production` or `development` |
| `GITHUB_WEBHOOK_SECRET` | No | Webhook HMAC verification |
