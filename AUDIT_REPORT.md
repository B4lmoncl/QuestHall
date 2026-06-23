# Quest Hall — Codebase Audit Report

> Last updated: 2026-06-23 · v2.0.0 · Sessions 1–30

---

## 1. Architecture Overview

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (static export) | 16.1.6 |
| UI | React + TypeScript | 19 / 5 |
| Styling | Tailwind CSS 4 + custom utilities | 4 |
| Backend | Express.js (Node.js) | 4.18 / 20 |
| Desktop | Electron (Quest Forge) | 29 |
| Persistence | JSON files in `/data` volume | — |
| Deployment | Docker (Alpine), Docker Compose | — |

### Data Flow

```
React → fetch(/api/*) → Express Routes → lib/state.js (in-memory Maps)
                                                ↓
                                         debounced saveData() → /data/*.json
```

- **Batch endpoint**: `GET /api/dashboard?player=X` replaces 14 fetches
- **O(1) lookups**: `questsById`, `usersByName`, `usersByApiKey`, `questCatalogById`, `gearById`, `itemTemplates`
- **Templates** (read-only): `public/data/*.json` — 56 files
- **Runtime** (mutable): `data/*.json` — debounced writes (200ms)
- **Atomic writes**: Critical files (users, quests) use write-tmp-then-rename

### Folder Structure

```
app/                  # Next.js (page.tsx ~3640 lines, types ~725, utils ~350, config, context)
components/           # 58 React components (~23k lines)
hooks/                # useQuestActions
lib/                  # 9 backend files (~3950 lines) + frontend auth-client
routes/               # 32 Express route files (~11,400 lines)
public/data/          # 56 JSON template files
data/                 # Runtime JSON (Docker volume, git-ignored)
electron-quest-app/   # Electron desktop companion
scripts/              # Asset generation, data validation
server.js             # Express entry point (~322 lines)
```

---

## 2. Feature Catalog

| # | Feature | Key Files | Summary |
|---|---------|-----------|---------|
| 1 | **Quest System** | `routes/quests.js`, `lib/quest-catalog.js`, `lib/rotation.js`, `QuestCards.tsx` | ~10 open pool + ~25 in-progress cap, 5 types, rarity scaling, NPC chains, co-op |
| 2 | **Player System** | `routes/users.js`, `routes/players.js`, `lib/auth.js` | JWT + API key auth, 50 levels, 7 currencies, titles, achievements, equipment |
| 3 | **Companion System** | `routes/players.js`, `CompanionsWidget.tsx` | Real/virtual companions, bond levels 1-5, ultimates, companion expeditions (backend-only) |
| 4 | **Gacha** | `routes/gacha.js`, `GachaView.tsx` | Standard/featured banners, pity (soft 60, hard 75), pull lock, duplicate refund |
| 5 | **Crafting** | `routes/crafting.js`, `ForgeView.tsx`, `professions.json` | 4 NPCs, 2-profession limit, 10 levels, trainer/drop recipes, Schmiedekunst |
| 6 | **Weekly Challenges** | `routes/challenges-weekly.js`, `routes/expedition.js`, `ChallengesView.tsx` | Star Path (solo, 9 stars), Expedition (cooperative, shared progress) |
| 7 | **NPC System** | `routes/npcs-misc.js`, `lib/npc-engine.js`, `WandererRest.tsx` | 12+ NPCs, rotation, multi-chain quests |
| 8 | **Campaigns** | `routes/campaigns.js`, `CampaignHub.tsx` | Quest chains with boss quests |
| 9 | **Rituals & Vows** | `routes/habits-inventory.js`, `RitualChamber.tsx`, `QuestPanels.tsx` | Recurring tasks with streaks, anti-rituals, blood pact mode |
| 10 | **Shop (Bazaar)** | `routes/shop.js`, `ShopView.tsx` | Self-care rewards, gameplay boosts, workshop upgrades |
| 11 | **Leaderboard** | `routes/config-admin.js`, `LeaderboardView.tsx`, `HonorsView.tsx` | XP-ranked, 60+ achievements, point milestones, frame unlocks |
| 12 | **Character Screen** | `CharacterView.tsx` | Equipment, stats, gem sockets, collection log, inventory grid |
| 13 | **Social (The Breakaway)** | `routes/social.js`, `SocialView.tsx`, `PlayerProfileModal.tsx` | Friends, messages, trading, activity feed, player search/profiles |
| 14 | **Rift / Mythic+** | `routes/rift.js`, `RiftView.tsx` | Timed quest chains (3 tiers + endless Mythic+), escalating difficulty |
| 15 | **World Boss** | `routes/world-boss.js`, `WorldBossView.tsx` | Community bosses, contribution tracking, unique drops |
| 16 | **Dungeons** | `routes/dungeons.js`, `DungeonView.tsx` | Async co-op (2-4 players), gear/unique drops, group success |
| 17 | **Gem/Socket** | `routes/gems.js`, `CharacterView.tsx` | 6 types, 5 tiers, socket/unsocket/upgrade |
| 18 | **Battle Pass** | `routes/battlepass.js`, `BattlePassView.tsx` | 40-level reward track, 10 XP sources |
| 19 | **Factions** | `routes/factions.js`, `FactionsView.tsx` | 4 factions, 6 rep tiers, auto-rep from quests, shop discounts |
| 20 | **Tavern (The Hearth)** | `routes/players.js`, `TavernView.tsx` | Rest mode (1-7 days), freeze streaks/forge, 30-day cooldown |
| 21 | **Daily Missions** | `routes/config-admin.js`, `page.tsx` | 6 missions, 4 milestone tiers, HSR-inspired |
| 22 | **Navigation** | `app/config.ts` | 5 floors (Urithiru-inspired), floor banners with particles |
| 23 | **Tooltip System** | `GameTooltip.tsx` | 50+ registry entries, cross-references, heading/inline modes |
| 24 | **BoP/BoE Binding** | `lib/helpers.js`, gear templates | 1088 items tagged, trade-blocked, badges on tooltips |
| 25 | **Item Lock** | `routes/habits-inventory.js`, `ItemActionPopup.tsx` | Lock items from salvage/trade/discard, golden indicator |
| 26 | **Auto-Salvage** | `routes/crafting.js`, `ForgeView.tsx` | Preview grid + 2-step confirm bulk salvage by rarity |
| 27 | **Kanai's Cube** | `routes/kanais-cube.js`, `ForgeView.tsx` | D3-style legendary effect extraction, 3 category slots |
| 28 | **Mythic+ Affixes** | `routes/rift.js`, `RiftView.tsx` | 10 weekly rotating affixes, activate M+2+, reward/time mods |
| 29 | **Enchant Vellums** | `routes/crafting.js`, `professions.json` | Tradeable enchant scrolls, 3 tiers, BoE |
| 30 | **Material Storage** | `ForgeView.tsx` | GW2-style dedicated tab, search, unlimited, sorted by rarity |
| 31 | **Mail System** | `routes/mail.js`, `SocialView.tsx` | WoW-style async mailbox, gold+items, 5g postage, 30d expiry |

---

## 3. Current Status — All Systems Verified

### Frontend-Backend Consistency (Verified ✓)

| Area | Status |
|------|--------|
| XP multipliers (Kraft, forge temp, companion, gear, hoarding) | ✓ Match |
| Gold multipliers (Weisheit, streak, forge temp, legendary) | ✓ Match |
| Drop chance (Glück, luck buff, pity, workshop) | ✓ Match |
| Gacha pity (soft 60, hard 75, +2.5%/pull) | ✓ Match |
| Quest XP/Gold tables by rarity | ✓ Match |
| Streak bonus (+1.5%/day, soft cap ~20% via diminishing returns) | ✓ Match |
| Hoarding penalty (-10%/quest over 20, soft -50% at 25, hard -80% at 30) | ✓ Match |
| Forge temp XP/Gold tiers | ✓ Match |
| Vow difficulty multipliers | ✓ Match |
| Daily mission thresholds/rewards | ✓ Match |
| Rift difficulty scaling per tier | ✓ Match |
| All 8 stat effects | ✓ Match |
| Currency operations | ✓ Match |
| Crafting costs/cooldowns | ✓ Match |

### Modal Behavior (All Consistent ✓)

All modals use `useModalBehavior` hook: ESC key, body scroll lock, backdrop-click-to-close.

### Reward Celebration Coverage (All ✓)

Quest completion, daily bonus, rituals, vows, battle pass, factions, world boss, dungeons, companions, challenges (Star Path + Expedition), gacha (own animation).

---

## 4. Remaining Acknowledged Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Companion Expeditions have no frontend UI | MEDIUM | Backend complete; needs CompanionsWidget integration |
| Gem socket UI auto-picks first available gem | LOW | Should have picker modal |
| `var changelogInterval` in server.js | LOW | Cosmetic |
| Gold stored in both `u.gold` and `u.currencies.gold` | LOW | Historical, backend handles both |
| `selectDailyQuests` dead code in rotation.js | INFO | Exported but never called |
| Modal backdrop opacity varies by modal type | LOW | Visual hierarchy by importance |
| Some `@next/next/no-img-element` lint warnings | N/A | Intentional — static export |
| React compiler warnings | N/A | Pre-existing, no runtime impact |
| CORS `origin: true` | MEDIUM | By design for single-user/self-hosted |

---

## 5. Fix History (Sessions 1–24)

### Critical Fixes

| Commit | Date | Fix |
|--------|------|-----|
| `e9e40e9` | 03-22 | Battlepass + factions `req.playerName` → `req.auth.userId` (routes 404'd for all users) |
| `e9e40e9` | 03-22 | Factions `saveData()` → `saveUsers()` (rewards lost on restart) |
| `77c52c2` | 03-21 | Rift bypassed entire reward pipeline (no XP multipliers, no loot) |
| `c75889b` | 03-21 | Battle Pass claim called `saveData()` instead of `saveUsers()` |
| `c75889b` | 03-21 | `.find().value` without null safety in timezone helpers |
| `8471133` | 03-21 | 3 missing imports crashed daily mission + workshop upgrade endpoints |
| `03c5c3a` | 03-22 | Dungeon success calculated independently per player (should be group-wide) |
| `03c5c3a` | 03-22 | Dungeon gear drops not actually rolled |
| `03c5c3a` | 03-22 | Dungeon material IDs invalid (English instead of German) |
| `03c5c3a` | 03-22 | Companion expedition gem key format wrong (`_t1` → `_1`) |
| `03c5c3a` | 03-22 | World boss frames stored in wrong field (`frames` → `unlockedFrames`) |
| `123168a` | 03-22 | Gem socket/unsocket/upgrade sent wrong params (never worked) |
| `d214cd6` | 03-22 | World boss double-claim race condition |
| `d214cd6` | 03-22 | Dungeon uid not lowercased (friendship checks failed) |
| `e3e573c` | 03-22 | World boss claim race + Mythic rift level uncapped + dungeon collect race |
| `1ad69ef` | 03-22 | BattlePass material IDs English→German, 3 missing BP titles, 4 missing faction recipes |
| `0db9592` | 03-22 | Factions: legendaryEffect + recipe rewards not claimable, shop discount dead |
| `35d6370` | 03-22 | Collection log crash (API field name mismatch) |

### High Fixes

| Commit | Date | Fix |
|--------|------|-----|
| `c75889b` | 03-21 | Habit score/delete missing ownership check |
| `c63420a` | 03-22 | Quest approve/reject no admin check |
| `c63420a` | 03-22 | Dungeon loot rarity relabeled but stats unchanged |
| `c63420a` | 03-22 | Habit XP/loot farming unlimited daily |
| `f935bca` | 03-22 | JSON corruption risk (non-atomic writes → write-tmp-rename) |
| `f935bca` | 03-22 | Timing attack in master key comparison |
| `2e8a5b1` | 03-22 | InventoryTooltip level req always gray (`_playerLevel` never set) |
| `2e8a5b1` | 03-22 | Unequip button invisible for GearInstance objects |
| `71e28f4` | 03-22 | Tooltip z-index (9950) behind modals (10000+) → raised to 10100+ |

### Medium Fixes

| Commit | Date | Fix |
|--------|------|-----|
| Various | 03-20–22 | Trade field mapping, conversations sort, friend level shows XP, ForgeView modals missing useModalBehavior, NPC departures not processed, MASTER_KEY env never read, getBondLevel fallback wrong key, forge temp hardcoded decay, trade item dedup, gacha pity_minus_5 applied 10x in pull10, crafting reroll negative index |

### Session 30 Audit Fixes

| Severity | Fix |
|----------|-----|
| CRITICAL | `executeTrade()` in social.js: item lookup used only `i.id` but validated against `i.instanceId` — items with instanceId-only could fail to transfer |
| HIGH | Mail collect silently dropped items when inventory full — now rejects with error message instead |
| HIGH | Duplicate `salvage_bonus` key in kanais-cube.js EFFECT_CATEGORIES object |
| MEDIUM | Locked field lost when equipping item from inventory — `locked` not mapped in instance creation |
| MEDIUM | 8x `fontSize: 10` violations across CharacterView, ForgeView, SocialView — bumped to 12px minimum |
| MEDIUM | Lock emoji (🔒) in main UI — replaced with Unicode ⦿ per no-emoji guideline |

### QoL Improvements (Sessions 1–24)

| Category | Improvements |
|----------|-------------|
| **Visual** | Quest card emboss + grain, Diablo progress bars, stat card depth, atmospheric modal backdrops, reward burst animation, enhanced tab transitions |
| **Tooltips** | 50+ GameTooltip registry entries, cross-references, heading/inline modes, disabled button deficit tooltips |
| **Social** | Online status (3-tier), read receipts, activity feed, player profiles, player search, new message button, trade item grid |
| **Challenges** | Weekly reset timer, cumulative star rewards, expedition fair share bars, modifier banners |
| **Feedback** | Reward celebrations on all claim flows, claim error auto-dismiss, "Clear Search" buttons |
| **Translation** | 200+ German→English interactive UI strings across 30+ files |
| **Polish** | 12px min font size, skeleton loading states, smooth tab transitions, disabled button cursor:not-allowed |

---

## Appendix A: Known Non-Issues & Agent Traps

> **CRITICAL: Read this BEFORE any audit.** These have been verified multiple times.

### A.1 Features That Already Exist

| Feature | Location |
|---------|----------|
| Floating reward numbers | `FloatingRewards.tsx`, `globals.css @keyframes floatRewardUp` |
| Daily bonus claim | `routes/currency.js:113` |
| Ritual/Habit CRUD | `routes/game.js` (rituals), `routes/habits-inventory.js` (habits) |
| Hidden achievement placeholders | `HonorsView.tsx:137-156` |
| Item flavor text in tooltips | `CharacterView.tsx:456-457` |
| Material cost owned/needed | `ForgeView.tsx:879-889` |
| Salvage All by rarity | `ForgeView.tsx:980-987` |
| Weekly reset timer | `ChallengesView.tsx:53-78` |
| Star rating animations | `globals.css @keyframes star-earn` |
| Gacha pity display | `GachaView.tsx` |
| NPC rank glow | `ForgeView.tsx:482-487` |
| Batch crafting x1-x10 | `ForgeView.tsx:831-839` |
| Message auto-refresh 10s | `SocialView.tsx:273-279` |
| Friend auto-refresh 30s | `SocialView.tsx:97-101` |
| Craft cost batch preview | `ForgeView.tsx:874-889` |
| ESC close all modals | `ModalPortal.tsx useModalBehavior` |
| Player search | `SocialView.tsx` debounced `/api/players/search` |
| Player profile modal | `PlayerProfileModal.tsx` |
| Daily mission checklist | `routes/config-admin.js`, `page.tsx` |
| Workshop upgrades | `shopItems.json`, `routes/shop.js`, `lib/helpers.js` |
| Tavern/rest mode | `TavernView.tsx`, `routes/players.js` |
| Rift system | `RiftView.tsx`, `routes/rift.js` |
| Rift abandon confirmation | `RiftView.tsx` 2-step confirm |

### A.2 Verified Non-Bugs

| "Bug" | Why It's Not |
|-------|-------------|
| Gacha pull lock in-memory only | Single-process Node.js — distributed locks unnecessary |
| Hard pity off-by-one (74 vs 75) | Counter=74 means 75th pull, `>= HARD_PITY-1` correct |
| Trade execution race condition | Single-threaded + trade locks added |
| NPC quests skip forge temp | `onQuestCompletedByUser()` calls `updateUserForgeTemp()` for all paths |
| Crafting reroll missing poolEntry check | `if (poolEntry)` check exists |
| German stat names (Kraft etc.) | Intentional game-world proper nouns |
| Gold in both `u.gold` and `u.currencies.gold` | Historical migration, backend handles both |
| `var changelogInterval` | Cosmetic — hoisting needed for clearInterval |
| `selectDailyQuests` dead code | May be useful for future rotation changes |
| Hearth enter no confirmation | UI shows comprehensive consequences panel |
| `loadingAction` blocks all quest actions | Single-quest interaction pattern is typical |

### A.3 Architectural Decisions (Do NOT "Fix")

| Decision | Rationale |
|----------|-----------|
| JSON file persistence | Intentional for <50 user app |
| TutorialModal in German | Target audience is German-speaking |
| No CSRF protection | JWT/API key on all mutating endpoints |
| No test suite | Validation via `verify-items.js` + ESLint, plus edge-case test scripts in `scripts/` (`test-*.js`) |
| `@next/next/no-img-element` | Static export with pixel art |

### A.4 Translation Rules

| Context | Language |
|---------|----------|
| Interactive UI (buttons, labels, errors) | **English** |
| Backend API errors | **English** |
| TutorialModal / Guide | **German** (keep) |
| Gear descriptions / flavor text | **German** (keep) |
| Currency names (Runensplitter etc.) | **German** (game proper nouns) |
| Stat names (Kraft, Weisheit etc.) | **German** (game proper nouns) |

### A.5 Agent Mistakes to Avoid

1. Always search codebase before claiming a feature is missing
2. Routes span 32 files — check all before reporting missing endpoints
3. Don't report single-process race conditions as bugs
4. Don't translate German lore/flavor text
5. Don't suggest adding a database or `next/image`
6. Use `req.auth?.userId` — NOT `req.playerName` (doesn't exist)
7. Use `saveUsers()` for user data — NOT `saveData()` (agents only)
8. Check Appendix A before re-investigating

---

## 6. Session 24 — Visual Overhaul & UI Consistency (2026-03-22)

### Visual Changes Applied

| Change | Files | Description |
|--------|-------|-------------|
| Quest card emboss | `QuestCards.tsx`, `globals.css` | Inset shadows, grain overlay, 4px rarity accent with glow |
| Diablo progress bars | `globals.css`, `UserCard.tsx`, `FactionsView.tsx`, `BattlePassView.tsx`, `CampaignHub.tsx` | 7px, beveled, segment marks, pulse at >90% |
| Stat card depth | `StatBar.tsx`, `globals.css` | Radial gradient highlight + inset shadows |
| Atmospheric modal backdrops | `ModalPortal.tsx`, `globals.css` | Radial gradient vignette + blur (system-wide via ModalPortal) |
| Reward burst animation | `RewardCelebration.tsx`, `globals.css` | Scale bounce-in + atmospheric backdrop |
| Enhanced tab transitions | `globals.css` | 10px translateY, 0.3s cubic-bezier |

Also: 3 tooltip registry entries added, UI Design Guidelines added to CLAUDE.md.

---

## 7. Session 25 — Item System Expansion + Audit (2026-03-22)

### Item Content Batch

Massive item pool expansion inspired by WoW Classic (item budget, source exclusivity) and Diablo 3 (primary/secondary split, Loot 2.0):

| Batch | Items | Source |
|-------|-------|--------|
| Rebalance | 55 existing | New rules: Rarity=affix count, Level=stat values |
| General Pool | +65 | gen-* (quest drops, shop, world drops) |
| Dungeon + Rift | +53 | dun-*, rift-* (source-locked) |
| Faction + Challenge + BP | +55 | fac-*, ch-*, bp-* (rep/skill-gated) |
| Endgame + WB + Gacha | +23 | wb-*, gacha-*, end-* |
| Consumables | +18 | itemTemplates.json |
| Unique Items | +8 | uniqueItems.json (6 WB + 2 gacha) |
| Named Sets | +6 | gearTemplates.json namedSets |
| **Total** | **251 gear + 18 consumables + 14 uniques + 9 sets** | |

### Balancing Rules (documented in CLAUDE.md)

- Affix counts: Common [1,1]/[0,0] → Legendary [3,3]/[2,2]
- Stat ranges by level (identical for all rarities): Lv1-10 (1-3) → Lv41-50 (5-8)
- 12 new legendary effect types added
- BiS ceiling: Lv50 Legendary = 15-24 primary + 6-12 minor + effect

### Audit Fixes (Session 25)

| Commit | Severity | Fix |
|--------|----------|-----|
| `8887e64` | CRITICAL | 12 legendary effect types had no backend handlers in getLegendaryModifiers() |
| `8887e64` | CRITICAL | 6 world boss uniqueDrops IDs mismatched uniqueItems.json (items unobtainable) |
| `8887e64` | CRITICAL | world-boss.js:387 null crash when boss template missing |
| `fa83fde` | HIGH | Gacha unique items (astral-veil, wheel-of-fate-shield) not in gacha pool |
| `fa83fde` | HIGH | RiftView missing RewardCelebration on stage/rift completion |
| `fa83fde` | HIGH | RiftView checkmark fontSize: 8 → 10 (below 12px minimum) |
| `2dcffda` | MEDIUM | Missing cursor:not-allowed on WorldBoss, BattlePass, Factions disabled buttons |
| `2dcffda` | MEDIUM | 12 new consumable effect types had no handlers in habits-inventory.js |

## 8. Session 26 — Deep Audit: Modifier Wiring + Data Integrity (2026-03-22)

### Key Finding: "Wired but not applied" pattern

Session 25 added 12 legendary effect types to `getLegendaryModifiers()` and 12 consumable effect handlers — but the modifiers were only *extracted*, never *consumed* by game logic. Session 26 wired all of them into the correct routes.

### Audit Fixes (Session 26)

| Commit | Severity | Fix |
|--------|----------|-----|
| `156a477` | CRITICAL | Wire 6 legendary modifiers: critChance (double quest rewards), companionBondBoost (bond XP), factionRepBoost (faction rep), challengeScoreBonus (star calc), forgeTempFlat (forge temp), consumable buff `chargesRemaining` consumption |
| `156a477` | CRITICAL | Transmute filter used `g.tier === 4` (property doesn't exist on FULL_GEAR_ITEMS) — always returned empty |
| `156a477` | CRITICAL | Shop gear/buy deducted `u.gold` without syncing `u.currencies.gold` — inconsistent state |
| `156a477` | MEDIUM | Personal quest type missing from achievement evaluator (`_personalCount` never tracked) |
| `b519891` | CRITICAL | Wire remaining 6 legendary modifiers: dungeonLootBonus (dungeon rewards), pityReduction (gacha pity), gemPreserve (gem unsocket), salvageBonus (salvage materials), cooldownReduction (craft cooldowns), ritualStreakBonus (ritual XP) |
| `05b0fa9` | HIGH | Daily rotation ran on server restart (deploy caused unexpected NPC spawns) — now only runs at midnight Berlin |

### Systems Verified Clean

- JSON data file consistency (all template cross-references valid)
- State Map synchronization (questsById, usersByName, usersByApiKey all in sync)
- Level system (50 levels, XP thresholds match frontend/backend)
- Server boot sequence (proper initialization order)
- Campaign, currency, social, gacha, shop, integration routes

## 9. Session 27 — Full Codebase Audit + Today Drawer Overhaul (2026-03-22)

### Today Drawer Visual Overhaul

Complete redesign of TodayDrawer.tsx with 13 new visual features:
- 2-column mini-card grid layout (replacing flat list rows)
- Centered level ring with animated glow trail + mini companion avatar
- Streak flame SVG (CSS animated, color scales with streak days)
- Forge ember particles (rising from temp bar, intensity scales)
- Floating mote particles (time-of-day colored) + night stars
- Time-of-day ambient backgrounds (4 gradients)
- SVG progress arc with category segment dots (replacing flat bar)
- Staggered card entry animation + magic divider particles
- Reward badges with currency icons
- Custom SVG calendar icon (replacing 📅 emoji)

5 self-audit rounds cleaned: dead CSS, animation conflicts, gradient IDs, cursor guidelines, font size minimums.

### Full Codebase Audit Findings & Fixes

3 parallel agents scanned ~35k lines: frontend UI guidelines, backend routes, frontend-backend consistency.

| Commit | Severity | Fix |
|--------|----------|-----|
| `a383f8e` | CRITICAL | `factions.js:216` undefined `uid` → `user.id` (ReferenceError on every faction rep gain) |
| `a383f8e` | CRITICAL | `challenges-weekly.js:113` undefined `userId` → `u.id` (ReferenceError on star calculation) |
| `a383f8e` | HIGH | Gold desync in 5 routes: dungeons, rituals, shop-equip, crafting learn+craft — `u.gold` not synced with `u.currencies.gold` |
| `71e1bea` | CRITICAL | DungeonView Cancel Run: added 2-step confirmation (was single-click destructive action) |
| `71e1bea` | CRITICAL | ChallengesView Sternenpfad stage claim: added RewardCelebration (was silently refreshing) |
| `98a2689` | HIGH | Disabled button `cursor:not-allowed` + `title` tooltips in RiftView, TavernView, DungeonView, ChallengesView |
| `f4f8d55` | HIGH | Missing `<img>` onError handlers in CharacterView (11), GachaView, GachaPull, LeaderboardView, CompanionsWidget |
| `5d850b4` | MEDIUM | Rift tooltip difficulty values wrong (hardcoded "1x/2x/3.5x" → computed formula matching backend) |
| `5d850b4` | MEDIUM | Rift Mythic tooltip "+0.25x per level" → "+0.3x" (matches `mythicLevel * 0.3` in backend) |
| `5d850b4` | MEDIUM | Challenge 9-star milestone label missing 150 Gold from reward description |
| `5d850b4` | MEDIUM | Login error responses return 401 instead of 200 (3 auth paths) |
| `480deaf` | HIGH | Centralize gold dual-field sync: `awardUserGold` + `awardCurrency` + `addLootToInventory` now sync both `u.gold` and `u.currencies.gold` |
| `480deaf` | HIGH | Fix 3 remaining gold desync sites: consumable gold effect, multi_reward, transmute deduction |
| `480deaf` | LOW | DungeonView: reset confirmCancel state when activeRun changes |

### Known Remaining (Low/Cosmetic — Not Fixed)

| Item | Reason Not Fixed |
|------|-----------------|
| ForgeView hardcoded WORKSHOP_TIERS | Values match backend, would need API refactor to fetch |
| World Boss tooltip omits gear score multiplier | Simplified, not inaccurate |
| `npcs-misc.js` feedback endpoint no auth | Admin-only feature, 500-entry cap, text validation exists |
| `agents.js` NaN propagation on numeric inputs | Agent API is internal-only, not player-facing |
| `config-admin.js` uses UTC date instead of Berlin for daily bonus check | Edge case near midnight, dashboard is informational only |
| Small click targets in SocialView, ChallengesView star buttons | Would require layout redesign |

### Systems Verified Clean

- World Boss: all data from API, tooltips accurate
- Dungeons: success formula matches, data from API
- Battle Pass: all data from API, no mismatches
- Factions: all data from API (backend bug was the only issue, now fixed)
- Gacha: pity counters + rates from API, tooltips match
- Gems: all data from API, unsocket cost matches
- Crafting: all data from API (except workshop tiers — values match)

## 10. Session 28 — Deep Performance & Data Structure Audit (2026-03-23)

### Audit Scope

Full codebase audit focusing on:
- Backend data structure efficiency and persistence patterns
- API route performance (O(n) vs O(1) lookups)
- Frontend rendering efficiency and context patterns
- Security hardening

### Critical & High Fixes

| Severity | Fix | Files |
|----------|-----|-------|
| CRITICAL | `getActiveBuffs()` mutated user state without saving — expired buffs reappeared on restart | `lib/state.js` |
| CRITICAL | Gold desync in gem unsocket/upgrade — `u.gold` not synced after `u.currencies.gold` deduction | `routes/gems.js` |
| HIGH | GitHub webhook bypass — `verifyGitHubSignature()` returned `true` when secret not configured (fail-open → fail-closed) | `routes/integrations.js` |
| HIGH | Campaign PATCH/DELETE used `requireApiKey` — any user could modify/delete campaigns (→ `requireMasterKey`) | `routes/campaigns.js` |
| HIGH | Weekly challenge backfill (stars/stageStartedAt) never called `saveUsers()` — data lost on restart | `routes/challenges-weekly.js` |

### Performance Optimizations

| Severity | Optimization | Impact | Files |
|----------|-------------|--------|-------|
| MEDIUM | Friendship O(1) index — `areFriends()` now uses `Map<playerId, Set<friendId>>` instead of O(n) array scan | Every message, trade, friend request | `routes/social.js` |
| MEDIUM | Mythic leaderboard cache — `getMythicLeaderboard()` with 1min TTL replaces O(n) user scan on every GET /api/rift | Every rift status request | `routes/rift.js` |
| MEDIUM | `campaignsById` Map — O(1) campaign lookup replaces 6× `.find()` calls | Campaign CRUD operations | `lib/state.js`, `routes/campaigns.js` |
| MEDIUM | Dashboard sync FS I/O removed — `worldBossActive` and `dungeonActive` now use in-memory state via exported functions instead of `readFileSync()` on every `/api/dashboard` request | Every dashboard load | `routes/config-admin.js`, `routes/world-boss.js`, `routes/dungeons.js` |

### Architecture Analysis & Recommendations

#### Data Structure Assessment

| Structure | Current | Verdict |
|-----------|---------|---------|
| `state.questsById` (Map) | O(1) quest lookup | Good — correctly used |
| `state.usersByName` (Map) | O(1) user lookup | Good — correctly used |
| `state.gearById` (Map) | O(1) gear lookup | Good — correctly used |
| `state.campaignsById` (Map) | **NEW** — O(1) campaign lookup | Added this session |
| Friendship index (Map→Set) | **NEW** — O(1) friend check | Added this session |
| Mythic leaderboard (cached) | **NEW** — 1min TTL cache | Added this session |
| JSON file persistence | Debounced 200ms + atomic writes | Appropriate for <50 users |

#### Identified but NOT Fixed (Low Priority / Architectural)

| Issue | Severity | Reason Not Fixed |
|-------|----------|-----------------|
| `getLevelInfo()` linear search (50 levels) | LOW | 50 iterations is negligible; binary search gains <1ms |
| `questIdToNpc` map rebuilt per call | LOW | Small dataset (<20 NPCs); would need NPC engine refactor |
| `getStanding()` linear search (6 tiers) | LOW | 6 entries — O(1) gain negligible |
| No transactional writes across data files | MEDIUM | Architectural; would need WAL or DB migration |
| `state.users` Object vs Map | LOW | Object is fine for <10k users; Map migration is breaking |
| Activity log unbounded growth | LOW | Already capped at 500 entries |
| Boot sequence sequential loads | LOW | <2s total; parallelizing saves ~500ms but adds complexity |

#### Frontend Performance Assessment

| Pattern | Status | Notes |
|---------|--------|-------|
| Lazy-loaded views (17) | Good | Proper `React.lazy()` + `Suspense` |
| `React.memo` on QuestCards/AgentCard | Good | Correctly applied |
| `content-visibility: auto` on cards | Good | Reduces off-screen rendering |
| DashboardContext single provider | Acceptable | Splitting into 3 contexts would help at scale but adds complexity |
| 1s ticker re-renders | Known | Cosmetic "X seconds ago" — low impact |
| page.tsx monolith (2350 lines) | Known | Functional but hard to maintain; would benefit from splitting |

### Systems Verified Clean

- All O(1) Map lookups (questsById, usersByName, usersByApiKey, gearById, campaignsById) confirmed in sync
- Gold dual-field sync (`u.gold` ↔ `u.currencies.gold`) now consistent across all routes
- All mutating campaign endpoints now require admin auth
- Webhook signature verification fails closed
- Buff expiration persisted correctly

## 11. Session 29 — Item Lore, Unique Rarity Color, Full Audit + QoL Cross-Links (2026-03-23)

### Item Content

| Change | Files | Description |
|--------|-------|-------------|
| Flavor text for all gear | `gearTemplates.json` | 251 items now have `flavorText` (German, Kingkiller Chronicle tone) |
| Unique item rarity color | 10+ files | `#e6cc80` (WoW artifact gold) for `isUnique: true` items, distinct from legendary orange |

### Audit Fixes

| Commit | Severity | Fix |
|--------|----------|-----|
| `dbd5dca` | MEDIUM | GameTooltip Mythic+ scaling says +0.25× but backend uses +0.3× → fixed |
| `dbd5dca` | CRITICAL | `u.gold -= cost` without null check → NaN corruption risk (habits-inventory.js:596) |
| `dbd5dca` | HIGH | Unsafe `template.affixes.primary/minor.pool` access without null check (crafting.js:460,476) |

### QoL: Cross-Navigation Links (13 components)

WoW/Diablo/HSR-inspired cross-linking — feature cards, rewards, and stats link to their relevant views:

| Component | Links Added |
|-----------|-------------|
| TodayDrawer | Daily mission cards → Quest Board, Rituals, Character, Forge; Stat cards → detail views |
| UserCard | Forge→Forge, Quests→QuestBoard, Points→Honors, Streak→Rituals, Companion→Character |
| RewardCelebration | Currency rewards → "Spend →" links (Gold→Shop, Rune→Gacha, Essenz→Forge) |
| SocialView | Activity feed events clickable with → indicator and navigation |
| LeaderboardView | Player rows open PlayerProfileModal |
| BattlePassView | Title/frame rewards → Character, recipe rewards → Forge |
| FactionsView | Recipe/frame/effect rewards → Forge/Character links |
| WorldBossView | Unique drops → Collection Log, materials → Forge |
| DungeonView | Gear rewards → Character, materials → Forge |
| ShopView | Boost items explain where they apply (Quest Board, Rituals, Forge) |
| CompanionsWidget | Companion card clickable → Character view |
| GachaPull | Pull result → "View in Inventory →" → Character |

### Systems Verified Clean

- All 12 cross-link navigations use existing `onNavigate` / `setDashView` callback pattern
- No new props needed on page.tsx beyond wiring existing `onNavigate`
- Build passes with 0 TypeScript errors

---

## 12. Session 29 — UI/UX Consistency & Type Safety Audit (2026-03-23)

### Audit Scope

Full codebase audit: frontend-backend consistency, UI Design Guidelines compliance, code quality.

**Frontend-Backend Consistency: No issues found.** All API calls match endpoints, response fields consistent.

### Fixes

| Severity | Fix | Files |
|----------|-----|-------|
| CRITICAL | 17 font sizes below 12px minimum raised (decorative icons→10px, readable text→12px) | CharacterView, DailyLoginCalendar, QuestCards, QuestDetailModal, SocialView, TodayDrawer, RitualChamber |
| CRITICAL | 9 `as any` casts removed with proper TypeScript types | CharacterView, RitualChamber, WandererRest, GachaView, types.ts |
| HIGH | Shop gold deduction null-safety — validate `cost` is finite before arithmetic | habits-inventory.js |
| HIGH | 3 disabled buttons missing `cursor: not-allowed` + tooltip | CompanionsWidget, PlayerProfileModal, CampaignHub |
| MEDIUM | 7 silent error catches now log to console.error | RoadmapView, OnboardingWizard (2), ForgeView (4) |

Also fixed: Turbopack parse error in ForgeView (IIFE in JSX replaced with conditional render).

### Commits

| Commit | Severity | Description |
|--------|----------|-------------|
| `88dad38` | CRITICAL | Fix Turbopack parse error in ForgeView cost preview IIFE |
| `41df85a` | CRITICAL | 17 font size fixes, 9 `as any` removals, null safety, disabled buttons, silent catches |

## 13. Session 30 — Auth Self-Checks, Data Integrity, UI Polish (2026-03-24)

### Audit Scope

Full codebase audit (3 parallel agents): backend routes + lib, frontend components + app, data templates. Focus on auth gaps, UI guideline compliance, and data cross-reference integrity.

### Fixes

| Commit | Severity | Fix |
|--------|----------|-----|
| `046da30` | HIGH | `currency.js`: Self-check on spend/convert/daily-bonus — any authenticated user could spend/claim for other users |
| `046da30` | HIGH | `currency.js`: Earn auth uses `req.auth.isAdmin` instead of raw key comparison (JWT tokens never matched master key) |
| `046da30` | HIGH | `gacha.js`: Self-check on pull/pull10 — any authenticated user could pull for other users |
| `046da30` | HIGH | `config-admin.js`: Add `requireApiKey` to `GET /api/quests/pool` — was unauthenticated but triggers quest generation writes |
| `046da30` | HIGH | DungeonView: Create Run modal now uses `useModalBehavior` (ESC + scroll lock) |
| `046da30` | MEDIUM | SocialView: 6 disabled trade/message buttons now have `cursor:not-allowed` + `title` tooltips |
| `046da30` | MEDIUM | ShopModal: Buy buttons now have `cursor:not-allowed` + `title` deficit tooltips |
| `046da30` | MEDIUM | CampaignHub: Silent catches now log to `console.error` |
| `046da30` | MEDIUM | `battlePass.json`: Fix `bp_s1_40` rarity `epic` → `legendary` (mismatch with titles.json) |
| `046da30` | MEDIUM | `gachaPool.json`: Fix 4 items violating affix count rules (legendary `[3,4]`→`[3,3]`, rare `[2,3]`→`[2,2]`) |
| `046da30` | MEDIUM | `gearTemplates.json`: Fix t4-scholar primary pool — `fokus` (minor) swapped with `ausdauer` (primary) |
| `046da30` | MEDIUM | `professions.json`: Add 4 faction recipes (flask_of_embers, scholars_ink, artisans_whetstone, resonance_charm) — were referenced by factions but recipes array was empty, making them uncraftable |
| `92d4d1f` | LOW | `world-boss.js`: Admin force-spawn now strips contributions from archived boss (consistent with regular expiry) |
| `92d4d1f` | LOW | `config-admin.js`: Add POST handler for `/api/quests/reset-recurring` (state mutation should prefer POST) |

### Remaining Acknowledged Issues (Low/Cosmetic)

| Issue | Severity | Status |
|-------|----------|--------|
| 3 named sets reference non-existent NPC gear items (ilse-scarf, karim-compass etc.) | LOW | Planned content — sets are inert, no crash |
| ~30 cloth/heavy profession armor items use stat ranges from one bracket above their level | LOW | Marginal balance variance — pending WoW profession refactor |
| ~8 legendary effects slightly outside level-appropriate value ranges | LOW | Minor balance variance, no gameplay impact |
| Some decorative elements use fontSize: 10 (arrows, dots, badges) | LOW | Decorative only — 12px minimum applies to readable text |
| Achievement ID/name mismatches (ten_quests→25, fifty_quests→75) | LOW | Cosmetic — conditions and descriptions are correct |
| Spotify tokens stored in plaintext in user object | MEDIUM | Architectural — would need encryption layer |
| `battlepass.js` line 5 direct require without try/catch | LOW | Server crashes on malformed JSON — acceptable for template data |
| World boss/dungeon/expedition titles not in titles.json | N/A | By design — dynamically awarded via `earnedTitles.push()` |

### Systems Verified Clean

- Frontend-backend consistency: All API calls match endpoints
- All auth middleware correctly applied across 24 route files
- Gold dual-field sync consistent (awardUserGold/awardCurrency centralized)
- All O(1) Map lookups in sync
- Build passes with 0 TypeScript errors
- Data cross-references validated (gear IDs, title IDs, material IDs)

---

## Appendix B: Feature Ideas

> Consolidated from FEATURE_IDEAS.md (2026-06-23). Not implemented — discussion items only. Check REJECTED.md before proposing any listed item.

> Gesammelt waehrend des Autopilot Audits. Markiert mit Quelle (WoW/D3/HSR/Original) und geschaetztem Aufwand.
> **Stand 2026-04-05:** ~25 von 65 Items sind bereits implementiert (markiert mit ~~strikethrough~~).
> Triage: Session 2026-04-05 Autopilot Audit verifizierte alle Items gegen die aktuelle Codebase.
>
> **Implementiert:** FI-001 (DailyHub), FI-005/013 (Bolstering), FI-009 (47 Uniques), FI-011 (WandererRest guards),
> FI-014 (Agent auth), FI-020 (Variety bonus), FI-021 (ShopView gold-buy), FI-022 (Currency shop owned),
> FI-034 (Recipes), FI-037 (window.confirm), FI-038 (setTimeout cleanup), FI-040 (Achievement points),
> FI-041 (Ritual loading), FI-043 (Material sources), FI-047 (RoadmapView loading), FI-050 (Bond progress),
> FI-056 (Buff preview), FI-057 (Buff indicator), FI-061 (QuestDetail loading)

---

### Format

```
### [FEATURE_ID] Feature Name
- **Quelle:** WoW Classic / Diablo 3 / HSR / Original
- **Aufwand:** S (1h) / M (2-4h) / L (4-8h) / XL (8h+)
- **Bereich:** Backend / Frontend / Both / Data
- **Beschreibung:** Was genau
- **Warum:** Welches Problem loest es / welchen Spass bringt es
```

---

### [FI-001] Feature Unlock Roadmap
- **Quelle:** Original (inspiriert von HSR Trailblaze)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** Sichtbare Timeline im Dashboard die zeigt welche Features bei welchem Level freischalten. "Lv5: Gacha + Berufe, Lv8: Leaderboard, Lv10: Factions..."
- **Warum:** Player Journey Audit: Neue Spieler wissen nicht was kommt. Level-Gates sind silent.

### [FI-002] NPC Quest Decline Button
- **Quelle:** WoW Classic (NPC Quest Decline)
- **Aufwand:** S (1h)
- **Bereich:** Both
- **Beschreibung:** Expliziter "Ablehnen" Button fuer NPC-Quest-Ketten im WandererRest Modal.
- **Warum:** WoW hat immer Accept + Decline. Unclaim ist nicht das Gleiche wie Decline.

### [FI-003] Stardust Earn Path Tooltip
- **Quelle:** HSR (Stellar Jade sources)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Im Gacha-View wenn Stardust nicht reicht: Tooltip zeigt alle Quellen.
- **Warum:** Neue Spieler unlocken Gacha bei Lv5 mit 0 Stardust und keinem Hinweis.

### [FI-004] Daily Diminishing Returns Warning
- **Quelle:** Original
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Vorwarnung bei Quest 4/5 bevor Diminishing Returns einsetzen.
- **Warum:** Spieler erfahren erst bei Quest 6 von den Reduced Rewards.

### [FI-005] Bolstering Rift Affix Implementation
- **Quelle:** WoW Mythic+ (Bolstering)
- **Aufwand:** M (2-4h)
- **Bereich:** Backend
- **Beschreibung:** Bolstering-Affix mechanisch implementieren (Timer -1h pro Stage).
- **Warum:** Affix ist definiert und angezeigt aber hat keinen Effekt.

### [FI-006] Campaign Reward Tracking
- **Quelle:** WoW Classic
- **Aufwand:** M (2-4h)
- **Bereich:** Backend
- **Beschreibung:** campaigns.js braucht claimedRewards + Claim-Endpoint + Double-Claim-Guard.
- **Warum:** Kein Reward-Tracking existiert. Potentieller Double-Claim.

### [FI-007] Onboarding System Explanations
- **Quelle:** HSR (Pom-Pom Tutorial)
- **Aufwand:** L (4-8h)
- **Bereich:** Frontend
- **Beschreibung:** OnboardingWizard: Core Systems erklaeren (XP, Tower, Quests, Streaks).
- **Warum:** Neue Spieler bekommen null Erklaerung der Kern-Mechaniken.


### [FI-008] State Management Refactor (page.tsx)
- **Quelle:** Original (React Best Practices)
- **Aufwand:** XL (8h+)
- **Bereich:** Frontend
- **Beschreibung:** page.tsx hat 92 useState Calls. State in Context/Reducer aufteilen (Dashboard, Player, UI). Reduziert Re-Renders.
- **Warum:** Performance: Jeder State-Update rendert den gesamten Component Tree neu. Splitting wuerde nur betroffene Subtrees re-rendern.

### [FI-009] Unique Named Items Content
- **Quelle:** Diablo 3 (Set Items / Uniques)
- **Aufwand:** L (4-8h)
- **Bereich:** Data
- **Beschreibung:** uniqueItems.json ist leer. Braucht 15-30 handgefertigte Items mit fixen Stats, Lore, und Flavor-Text. Quellen: World Boss, Mythic Rift, Special Events.
- **Warum:** D3 Uniques sind der Endgame-Antrieb. Aktuell gibts keine — Collection Log ist leer.

### [FI-010] Companion Pet Limit UX Feedback
- **Quelle:** Original
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** CompanionsWidget: Wenn Pet-Limit (2x/Tag) erreicht, Button zeigt "Tomorrow!" statt nur disabled.
- **Warum:** Spieler klickt Pet-Button, passiert nichts, kein Feedback warum.

### [FI-011] NPC Quest Double-Click Protection
- **Quelle:** Original (UX Best Practice)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** WandererRest Accept/Complete Buttons haben kein disabled-State waehrend API-Call. Kann doppelt geklickt werden.
- **Warum:** Audit Fund: Buttons spammbar ohne Loading-Guard.

### [FI-012] Tavern Leave Countdown Display Fix
- **Quelle:** Original (UX)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** TavernView zeigt "3d left" UND "3d 2h remaining" gleichzeitig. Redundant. Nur timeLeft() behalten.
- **Warum:** Audit Fund: Doppelte Anzeige desselben Werts.

### [FI-013] Rift Bolstering Affix Implementation
- **Quelle:** WoW Mythic+ (Bolstering)
- **Aufwand:** S (1h)
- **Bereich:** Backend
- **Beschreibung:** rift.js hat Bolstering-Affix definiert aber nie implementiert. Timer sollte -1h pro Stage reduziert werden.
- **Warum:** Affix verspricht Mechanik die nicht existiert. Bricht Spielervertrauen.

### [FI-014] Agents Command Queue Auth
- **Quelle:** Original (Security)
- **Aufwand:** S (1h)
- **Bereich:** Backend
- **Beschreibung:** GET /api/agent/:name/commands hat kein requireApiKey. Command Queue ist public lesbar.
- **Warum:** Security Audit: Command-Inhalte koennten sensibel sein.

### [FI-015] Campaign Quest Ordering
- **Quelle:** WoW Classic (Campaign Quest Chains)
- **Aufwand:** M (2-4h)
- **Bereich:** Backend
- **Beschreibung:** campaigns.js erzwingt keine Quest-Reihenfolge. Quest N kann vor N-1 abgeschlossen werden.
- **Warum:** Campaigns sollen sequentiell sein. Ohne Ordering ist die Story-Reihenfolge beliebig.

### [FI-016] TodayDrawer Midnight Refresh
- **Quelle:** Original (UX)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** TodayDrawer.tsx: today-Variable und timeInfo sind einmal beim Mount berechnet und werden nie aktualisiert. Ritual/Pet-Resets, Tagesgruesse und Daily-Status gehen bei langen Sessions stale.
- **Warum:** Spieler die den Drawer ueber Mitternacht offen haben sehen veraltete Daten.

### [FI-019] World Boss in Active Content Section
- **Quelle:** Original (UX Completeness)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** TodayDrawer zeigt World Boss nur in "Urgent", nicht in "Active Content". Andere aktive Features (Rift, Dungeon, Expedition) erscheinen in beiden Sektionen.
- **Warum:** Inkonsistenz — Spieler koennten den World Boss verpassen wenn er nicht urgent ist.

### [FI-020] Variety Bonus Consistency
- **Quelle:** Original (Balance Fix)
- **Aufwand:** S (1h)
- **Bereich:** Backend
- **Beschreibung:** helpers.js: varietyBonus liest todayCompletions BEVOR recordUserCompletion laeuft. Der aktuelle Quest-Typ zaehlt nicht fuer den eigenen Variety-Bonus.
- **Warum:** Erste Quest eines neuen Typs bekommt 0 Stacks statt 1. Off-by-one.

### [FI-021] Shop Gold Buy Loading Guard
- **Quelle:** Original (UX)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** ShopView Gold-Buy Buttons haben keinen Loading-State. Double-Click feuert mehrere POSTs.
- **Warum:** Alle Currency-Shop Buttons haben Loading, nur Gold-Shop nicht.

### [FI-022] Currency Shop "Already Owned" State
- **Quelle:** Diablo 3 (Dye Shop)
- **Aufwand:** M (2-4h)
- **Bereich:** Both
- **Beschreibung:** Frames/Titles im Currency-Shop zeigen keinen "Owned" Status. Spieler muss kaufen um 409 zu bekommen.
- **Warum:** D3 zeigt "Already Learned" grau an. Spieler sollte vor dem Kauf wissen ob er das Item hat.

### [FI-023] NPC Chain Direct Links
- **Quelle:** WoW Classic (Quest Chain)
- **Aufwand:** M (2-4h)
- **Bereich:** Backend
- **Beschreibung:** NPC Quest Chains haben keine directen Links zwischen Steps (nextQuestId/prevQuestId). Chain Progression basiert auf chainIndex Arithmetik — fragil bei Quest-Deletion.
- **Warum:** WoW hat explizite Quest-Chain-Pointer. Robuster gegen Datenkorruption.

### [FI-024] Kanai Library Capacity Cap
- **Quelle:** Diablo 3 (Kanai's Cube)
- **Aufwand:** S (1h)
- **Bereich:** Backend
- **Beschreibung:** kanais-cube.js hat kein Library-Limit. Wächst unbegrenzt. D3 hat zwar auch kein Cap, aber ein UIUX-Display-Problem tritt auf bei 100+ Einträgen.
- **Warum:** Performance + UX. Irgendwann wird die Library-Anzeige unbrauchbar.

### [FI-025] Workshop Upgrades in UI
- **Quelle:** Diablo 3 (Artisan Upgrades)
- **Aufwand:** L (4-8h)
- **Bereich:** Frontend
- **Beschreibung:** Workshop Upgrades (Gold-Forged Tools, Loot Chance Amulet, etc.) sind im Backend komplett implementiert aber im Frontend nicht erreichbar. ShopView.tsx hat sie auskommentiert mit "moved to Artisan's Quarter" — aber es gibt keinen Artisan's Quarter View.
- **Warum:** Audit Fund: 4 permanente Upgrade-Trees komplett unerreichbar fuer Spieler.

### [FI-026] Image Alt Text Sweep
- **Quelle:** A11y (WCAG 2.1)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** 22 von 152 img-Tags haben kein alt-Attribut. CLAUDE.md: "Alt text: Required for meaningful images; empty alt='' for decorative icons."
- **Warum:** Accessibility + CLAUDE.md Compliance.

### [FI-028] Systematic Fetch Error Handling
- **Quelle:** Original (UX Robustness)
- **Aufwand:** L (4-8h)
- **Bereich:** Frontend
- **Beschreibung:** 15+ POST-Fetch-Calls in Frontend-Komponenten prüfen nicht r.ok und zeigen keinen Error-Toast bei Fehler. Betrifft: CampaignHub, CharacterView (inventory reorder), DashboardHeader (login/register/forgot-pw), FeedbackModal, ForgeView (craft/learn), OnboardingWizard (class/register), QuestModals (create/spawn). Pattern: fetch → .then(refresh) ohne Error-Check.
- **Warum:** Spieler-Aktionen die fehlschlagen geben kein Feedback. Sieht aus als wäre nichts passiert.

### [FI-029] Modal ESC Stack — Only Close Topmost
- **Quelle:** Original (UX Architecture)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** Alle useModalBehavior-Instanzen registrieren ESC auf document-Level. Bei gestapelten Modals (z.B. RewardCelebration über einem anderen Modal) schliessen alle gleichzeitig statt nur das oberste. Braucht globalen Modal-Stack oder Event-Flag.
- **Warum:** ESC sollte nur das oberste Modal schliessen. Aktuell schliesst es alle gestapelten Modals auf einmal.

### [FI-030] Level-Up Reward Type
- **Quelle:** Diablo 3 (Level-Up Celebration)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** RewardCelebration hat keinen "levelUp" Typ — Level-Ups fallen auf den Quest-Theme zurueck. Eigener Theme mit dediziertem Sound/Visual waere besser.
- **Warum:** Level-Ups sind der wichtigste Progressions-Moment. Sollte sich besonders anfuehlen.

### [FI-031] Electron Security Hardening
- **Quelle:** Electron Security Best Practices
- **Aufwand:** M (2-4h)
- **Bereich:** Electron
- **Beschreibung:** electron-quest-app hat nodeIntegration: true + contextIsolation: false. Sollte auf contextIsolation: true + preload script umgestellt werden.
- **Warum:** Electron Security Guideline. Aktuell nicht kritisch (lokale App), aber Best Practice.

### [FI-032] Dependency Security Updates
- **Quelle:** npm audit
- **Aufwand:** S (1h)
- **Bereich:** DevOps
- **Beschreibung:** 2 Vulnerabilities: Next.js (HTTP smuggling, CSRF bypass, disk cache DoS) + path-to-regexp (ReDoS). Fix via npm audit fix (--force fuer Next.js Update 16.1.6 → 16.2.2).
- **Warum:** 1 High severity (ReDoS), 4 Moderate (Next.js). Should be updated in a dedicated PR with full testing.

### [FI-033] Missing World Boss Portraits (6)
- **Quelle:** Content Scan
- **Aufwand:** M (2-4h) — Pixellab Asset Generation
- **Bereich:** Data/Assets
- **Beschreibung:** 6 von 15 World Bosses haben fehlende Portrait-PNGs: aufschub-kraken, routine-sphinx, vergleichs-spiegel, imposter-phantom, komfortzone, deadline-drache. Alle 256x256px.
- **Warum:** Content Scan: Bosses ohne Portrait zeigen Fallback/broken Image im WorldBossView.

### [FI-034] Gap Recipes Missing Descriptions (3)
- **Quelle:** Content Scan
- **Aufwand:** S (1h)
- **Bereich:** Data
- **Beschreibung:** recipe-koch-gap-130, recipe-koch-gap-140, recipe-vz-gap-135 haben keine description. Brauchen Skulduggery Pleasant Humor.
- **Warum:** Content Completeness: 863/866 Recipes haben Descriptions.

### [FI-035] Missing Image onError Handlers (6)
- **Quelle:** CLAUDE.md UI Guidelines
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** 6 von 152 img-Tags haben keinen onError Handler. CLAUDE.md: "Always add onError handler to hide broken images gracefully."
- **Warum:** Broken Images zeigen das Browser-Default-Broken-Icon statt graceful zu verschwinden.

### [FI-036] Loading Skeletons for 14 Components
- **Quelle:** CLAUDE.md UI Guidelines
- **Aufwand:** L (4-8h)
- **Bereich:** Frontend
- **Beschreibung:** 14 Komponenten fetchen Daten on mount aber zeigen kein Loading-Skeleton: GachaView (3 parallele Fetches!), LeaderboardView, QuestModals, TalentTreeView, AdventureTomeView, ShopView, CampaignHub, CompanionsWidget, RitualChamber, QuestPanels, HonorsView, DashboardHeader, FeedbackModal, CVBuilderPanel.
- **Warum:** CLAUDE.md: "Skeleton loading: skeleton-pulse animation for placeholder cards during data fetch." User sieht leeren Screen bis alle Daten da sind.

### [FI-037] Replace window.confirm with Styled Modals
- **Quelle:** UX Consistency
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** 3 destructive actions nutzen browser-native window.confirm statt styled Modals: TavernView (leave), TalentTreeView (sacrifice), CharacterView (gem unsocket). ForgeView hat bereits ein eigenes Confirm-Modal.
- **Warum:** Native Browser-Dialoge brechen das visuelle Design und sind nicht theme-bar.

### [FI-038] CompanionsWidget setTimeout Cleanup
- **Quelle:** React Best Practices
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** CompanionsWidget hat 15 setTimeout→setState Calls ohne clearTimeout. Kann "setState on unmounted" Warnings erzeugen wenn Component vor Timeout abgebaut wird.
- **Warum:** React 19 behandelt das graceful (kein Crash), aber cleanup ist Best Practice.

### [FI-039] Achievement Filter + Search in HonorsView
- **Quelle:** Diablo 3 (Achievement Browser)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** HonorsView hat keine Filter/Suche. 168 Achievements werden alle gleichzeitig gerendert. Braucht: Filter nach earned/unearned, Rarity-Filter, Category-Tabs, Suchfeld.
- **Warum:** D3 hat einen vollen Achievement-Browser mit Kategorie-Tabs + Fortschrittsbalken pro Kategorie. Aktuell ist alles ein langer Scroll.

### [FI-040] Achievement Points Display
- **Quelle:** CLAUDE.md (Achievement Points System)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** HonorsView rendert keine Achievement-Punkte obwohl achievementTemplates.json ein points-Feld hat und CLAUDE.md ein Punktesystem definiert (common=5, uncommon=10, rare=25, epic=50, legendary=100). Points sollten pro Achievement und als Gesamtsumme angezeigt werden.
- **Warum:** CLAUDE.md definiert cosmetic frame unlocks bei Punktemeilensteinen. Die Punkte werden nirgends angezeigt.

### [FI-041] Ritual Complete Loading State
- **Quelle:** UX Best Practice
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** RitualChamber "Check off" Button hat keinen Loading-State während des API-Calls. Double-Click möglich.
- **Warum:** Alle anderen Action-Buttons haben Loading-Guards. Rituals nicht.

### [FI-042] Quest Pool Size Display
- **Quelle:** WoW Classic (Available Quests Counter)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Die Quest-Pool-Größe (wie viele Quests zur Auswahl stehen) wird nirgends angezeigt. Der Talent "quest_pool_size" erhöht sie aber der Spieler sieht nicht wie viele Quests im Pool sind vs. Maximum.
- **Warum:** Transparenz: Spieler weiß nicht wie sein Talent die Questauswahl beeinflusst.

### [FI-043] Crafting Material Source Hints
- **Quelle:** WoW Classic (Material Tooltip Sources)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** Materials in der ForgeView Craft-Preview zeigen keinen Hinweis WO man sie bekommt (Quest-Drops, Vendor, Crafted). WoW zeigt "Drops from: X" auf jedem Material.
- **Warum:** Spieler weiß nicht wo er fehlende Materialien farmen soll.

### [FI-044] Tavern Rest Duration Preview
- **Quelle:** Original (UX)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** TavernView "Enter the Hearth" zeigt keine Preview wie lange Streak+Forge eingefroren werden. Der Spieler muss die Anzahl Tage erst eingeben bevor er sieht was passiert.
- **Warum:** Transparenz vor dem Commitment.

### [FI-045] Profession Synergy Display
- **Quelle:** WoW Classic (Profession Pairing)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** professions.json hat "synergies" Felder die Profession-Pairings beschreiben (z.B. Schmied+Lederverarbeiter). ForgeView zeigt diese Synergien nicht an wenn man eine zweite Profession wählt.
- **Warum:** WoW zeigt "Recommended pairing" bei der Professionswahl. Hilft Neulingen.

### [FI-046] Campaign Quest Chain Sorting
- **Quelle:** WoW Classic (Quest Chain Display)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** CampaignHub rendert Quests in API-Reihenfolge ohne Sort. Wenn Backend Quests in Insertion-Order liefert statt Chain-Order, ist die Anzeige falsch. Sollte nach chainIndex sortiert werden.
- **Warum:** Campaign Timeline zeigt Quests möglicherweise in falscher Reihenfolge.

### [FI-047] RoadmapView Loading State
- **Quelle:** UX
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** RoadmapView flasht "No roadmap items yet" bevor der Fetch auflöst. Braucht loading-State mit Skeleton.
- **Warum:** Jede View-Öffnung zeigt kurz den Empty-State bevor Daten erscheinen.

### [FI-048] Daily Diminishing Returns Proactive Warning
- **Quelle:** HSR (Trailblaze Power Warning)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Zeige nach Quest 4 ein subtiles Banner: "Noch 1 Quest mit voller Belohnung heute." Bei Quest 6+ zeige den aktuellen DR-Multiplikator (75%/50%/25%) neben der Quest-Belohnungs-Vorschau.
- **Warum:** Spieler wissen erst bei Quest 6 von Diminishing Returns. HSR zeigt Trailblaze Power immer prominent an.

### [FI-049] Gacha Banner Expiry Countdown
- **Quelle:** HSR / Genshin (Banner Timer)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** GachaView Banner-Cards zeigen keinen Countdown bis zum nächsten Banner-Wechsel. HSR zeigt immer "Ends in X days" prominent an.
- **Warum:** FOMO-Mechanik für Engagement. Spieler weiß nicht wann der Banner wechselt.

### [FI-050] Companion Bond Progress Bar
- **Quelle:** Diablo 3 (Follower Level)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** CompanionsWidget zeigt Bond-Level als Zahl aber keinen Fortschrittsbalken zum nächsten Level. D3 zeigt immer eine XP-Bar für den Follower.
- **Warum:** Spieler sieht nicht wie nah er am nächsten Bond-Level ist.

### [FI-051] Trade Round Item Names Display
- **Quelle:** Diablo 3 (Trade Window)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** SocialView Trade-Verhandlungsrunden zeigen nur "+N items" statt Item-Namen. D3 zeigt immer die exakten Items mit Rarity-Color im Trade-Window.
- **Warum:** Spieler kann nicht nachvollziehen was in welcher Runde angeboten wurde.

### [FI-052] Stale Trade Item Validation
- **Quelle:** WoW Classic (Trade Window)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** SocialView proposeTrade validiert nicht ob Items noch im Inventar sind wenn Submit gedrückt wird. Stale loggedInUser-Snapshot kann Items referenzieren die schon weg sind.
- **Warum:** WoW re-validiert Items bei Trade-Bestätigung. Aktuell schickt Frontend blinde Item-IDs.

### [FI-053] Quest Type Icons per Card
- **Quelle:** WoW Classic (Quest Type Icons)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** QuestCards zeigen den Quest-Typ als Text-Label. WoW zeigt ein kleines Icon pro Quest-Typ (Tägliche Quest = blaues !, Elite = Totenkopf, Gruppierung = Schwert+Schild). Eigene Icons pro Typ (development, learning, fitness, social, personal) wären besser als Text.
- **Warum:** Visuelle Differenzierung auf einen Blick. Text-Labels erfordern Lesen.

### [FI-054] Quest Time Estimate Display
- **Quelle:** Habitica (Task Duration)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Quest-Karten zeigen keine geschätzte Dauer. questCatalog.json hat ein "estimatedMinutes" Feld auf vielen Templates. Sollte als "~15 min" angezeigt werden.
- **Warum:** Habitica zeigt Task-Duration. Hilft bei der Planung welche Quest zuerst angegangen wird.

### [FI-055] Session Stats Summary
- **Quelle:** HSR (Session End Summary)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** HSR zeigt am Ende einer Session: "Du hast X Quests abgeschlossen, Y XP verdient, Z Gold erhalten, Level A→B." Sowas fehlt komplett. Ein TodayDrawer-Widget könnte das zeigen.
- **Warum:** Spieler bekommt kein Gesamtbild seiner Session-Leistung. Nur einzelne Quest-Rewards.

### [FI-056] Crafting Buff Effect Preview
- **Quelle:** WoW Classic (Potion Tooltip)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** ForgeView Craft-Preview zeigt für Buff-Rezepte nur "3 Quests remaining". Sollte den tatsächlichen Effekt zeigen: "+10% XP für 3 Quests" oder "+2 Kraft für 3 Quests".
- **Warum:** Spieler sieht nicht was der Buff tut bevor er craftet. WoW-Potions zeigen immer den exakten Effekt.

### [FI-057] Passive Buff Active Indicator
- **Quelle:** Diablo 3 (Active Buffs Bar)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** Aktive Buffs (aus Crafting, Shop, Companions) werden nirgends zentral angezeigt. D3 hat eine Buff-Bar am oberen Bildschirmrand die alle aktiven Effekte mit Timer zeigt.
- **Warum:** Spieler weiß nicht welche Buffs aktiv sind oder wie viele Quests noch übrig sind.

### [FI-058] Quest Difficulty Visual Scaling
- **Quelle:** Diablo 3 (Torment Difficulty)
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** Quest-Rarity bestimmt Schwierigkeit und Belohnung, aber die visuelle Darstellung ist nur ein kleines Farb-Dot. D3 zeigt Difficulty prominent mit Schädelicons und farbiger Umrandung. QuestCards sollten Rarity stärker visuell kommunizieren (größerer Accent, Glow-Border, etc).
- **Warum:** Common und Legendary Quests sehen fast gleich aus bis auf einen kleinen Farbakzent.

### [FI-059] Crafting Queue (Batch Progress)
- **Quelle:** WoW Classic (Craft Queue)
- **Aufwand:** L (4-8h)
- **Bereich:** Both
- **Beschreibung:** Beim Batch-Craften (x10) zeigt ForgeView nur das Endergebnis. WoW zeigt einen Fortschrittsbalken der jeden einzelnen Craft animiert mit Skill-Up-Chance pro Craft. Jeder erfolgreiche Skill-Up wird einzeln gefeiert.
- **Warum:** Batch-Craften fühlt sich wie ein Klick an statt wie 10 individuelle Crafts. Skill-Up-Celebrations gehen unter.

### [FI-060] Quick-Navigate from Celebration Popup
- **Quelle:** HSR (Quick Actions in Popups)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** RewardCelebration Popup zeigt nur "Nehmen" als Aktion. HSR zeigt nach Boss-Kill auch "Loot anzeigen" oder "Nochmal spielen". QH könnte "Inventar öffnen" (wenn Loot), "Nächste Quest" (wenn Chain), "Leaderboard" zeigen.
- **Warum:** Nach dem Reward-Popup muss der Spieler manuell navigieren. Quick-Actions sparen Klicks.

### [FI-061] QuestDetailModal Loading Guards
- **Quelle:** UX Best Practice
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** QuestDetailModal Claim/Complete/Coop Buttons rufen onClose() sofort auf und haben keinen Loading-State. Double-Click auf Claim feuert duplicate API-Calls.
- **Warum:** Pattern-Inkonsistenz: QuestCards haben Loading-Guards, QuestDetailModal nicht.

### [FI-062] Quest Requirements Display
- **Quelle:** WoW Classic (Quest Requirements Panel)
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** QuestDetailModal zeigt keine Quest-Requirements (Items, Level, Vorbedingungen). Nur minLevel wird als Badge angezeigt. WoW zeigt immer "Required Items: X" und "Required Level: Y".
- **Warum:** Spieler sieht nicht was er braucht um eine Quest abzuschliessen.

### [FI-064] Cache Version.json at Startup
- **Quelle:** Performance Best Practice
- **Aufwand:** S (30min)
- **Bereich:** Backend
- **Beschreibung:** players.js liest version.json synchron bei jedem /api/version Request. Sollte einmal beim Startup geladen und gecacht werden.
- **Warum:** Blocking fs.readFileSync in Request-Handler. Minimaler Impact (kleine Datei), aber Best Practice.

### [FI-065] Package.json Node Engine Spec
- **Quelle:** DevOps Best Practice
- **Aufwand:** S (5min)
- **Bereich:** Config
- **Beschreibung:** package.json hat kein "engines" Feld. Sollte "node": ">=20" spezifizieren da das Projekt Node 20 (Docker) und Node 22 (dev) verwendet.
- **Warum:** Verhindert versehentliches Deployment auf Node 16/18 wo Features fehlen.

### [FI-066] Logout View Transition
- **Quelle:** UX
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Wenn ein eingeloggter Spieler auf Codex/Talents/Tome/Character ist und ausloggt, verschwindet die View sofort (blank area). Sollte stattdessen zum Quest Board fallbacken oder einen Login-Prompt zeigen.
- **Warum:** Jarring UX — View verschwindet ohne Feedback.

### [FI-067] Login Player Card Skeleton
- **Quelle:** UX
- **Aufwand:** S (1h)
- **Bereich:** Frontend
- **Beschreibung:** Zwischen Login (playerName gesetzt) und erstem Refresh (loggedInUser populiert) verschwindet die Player Card. Sollte ein Skeleton zeigen.
- **Warum:** Flicker beim Login — Card blinkt kurz weg.

### [FI-068] Content-Security-Policy Header
- **Quelle:** OWASP Security Headers
- **Aufwand:** M (2-4h)
- **Bereich:** Backend
- **Beschreibung:** Kein CSP-Header konfiguriert. Sollte mindestens script-src, style-src, img-src, connect-src Policies setzen. Express helmet Paket oder manueller Header.
- **Warum:** CSP verhindert XSS auch wenn React-Escaping versagt (Defense in Depth).

### [FI-069] CSS Keyframe Cleanup
- **Quelle:** Code Quality
- **Aufwand:** M (2-4h)
- **Bereich:** Frontend
- **Beschreibung:** 41 von 132 @keyframes Animationen in globals.css scheinen unbenutzt. Manche werden dynamisch referenziert (Template-Strings), aber viele sind wahrscheinlich Dead CSS von entfernten Features.
- **Warum:** CSS-Datei ist 1813 Zeilen. Entfernung von ~200 Zeilen Dead Keyframes wuerde die Ladezeit marginal verbessern.

---

## Appendix C: AAA Polish Findings

> Consolidated from FLAVOR_AUDIT_FINDINGS.md (2026-06-23). See the "Bereits gefixt" section at the end for items already resolved.

### Fokus
UI/UX Improvements, AAA-Feinschliff, Polishing

---

### UI/UX Findings

#### QuestCards.tsx
1. **[Click Target]** :348 — Checkbox-Button nur 14px (`w-3.5 h-3.5`), unter 32px Minimum für Touch-Targets
2. **[Hover State]** :487 — Unclaim-Button hat keine Hover-Transition auf Background-Farbe
3. **[Disabled State]** :490 — Complete-Button nutzt nur `opacity: 0.5` wenn disabled, kein `cursor: not-allowed`

#### DashboardHeader.tsx
4. **[Accessibility]** :273 — Volume-Slider hat keinen `:focus-visible` Ring für Keyboard-Navigation
5. **[Hover Flash]** :324 & 342 — Settings-Popup-Items nutzen inline `onMouseEnter` für Background — flasht bei schnellem Hovern statt CSS transitions
6. **[Disabled State]** :383 — Login-Button nutzt nur opacity bei loading, kein `cursor: not-allowed`

#### TodayDrawer.tsx
7. **[Close Animation]** :446 — Drawer schließt auf ESC ohne Close-Transition (kein exit-animation, nur sofortiges Verschwinden)

#### UserCard.tsx
8. **[Inconsistency]** :277, 289, 300 — Mischt inline `fontSize: 12` mit Tailwind `text-xs` in verschiedenen Sections — inkonsistentes Pattern
9. **[Emoji Size]** :369 — Companion-Emoji `fontSize: 14` während andere Icons `size={16}` nutzen

#### CompanionsWidget.tsx
10. **[Disabled State]** :787 — Ultimate-Button: disabled-State nur Cursor, keine Opacity/Saturation-Anpassung
11. **[Disabled State]** :1029 & 1079 — Expedition-Buttons: `cursor: not-allowed` aber keine Opacity-Reduktion
12. **[Interactive Feedback]** :880 — Quest-Completion-Button nutzt scale(0.95) ohne Spring/Bounce, fühlt sich starr an

#### CharacterView.tsx
13. **[Hover State]** :2219 — ESC-Close-Button (w-8 h-8) hat kein Hover-/Active-Feedback
14. **[Click Target]** :357 — Online-Status-Indicator nur 16px (w-4 h-4), zu klein falls interaktiv

#### ForgeView.tsx
15. **[Transition]** :953 — Material-Storage-Toggle hat keine `transition-` Class, State wechselt hart
16. **[Click Target]** :2365 — Increment/Decrement Buttons nur 24px (w-6 h-6), unter 32px Touch-Minimum
17. **[Disabled State]** :2130 — Crafting-Button bei Loading: opacity-Wechsel aber kein `cursor: not-allowed`

#### GachaView.tsx
18. **[Affordance]** :820 — "Vault of Fate" Heading ist klickbar (`onClick`), aber optisch kein Hinweis darauf
19. **[Hover State]** :874 — History-Einträge haben keinen Hover-Background trotz Klickbarkeit

#### SocialView.tsx
20. **[Hover Transition]** :327 — Remove-Friend-Button erscheint sofort bei group-hover, keine `transition-opacity`
21. **[Hover State]** :639 — Trade-Items haben `cursor: pointer` aber kein Hover-Background

#### ShopView.tsx
22. **[Empty State]** :301 — "No items available" nutzt `text-w20`, zu subtil für wichtige Statusmeldung
23. **[Disabled State]** :338 — Currency-Buy-Buttons: opacity-Wechsel aber kein `cursor: not-allowed` bei `!canAfford`

#### Cross-Component
24. **[Disabled Inconsistency]** — Verschiedene Files handhaben disabled-States unterschiedlich: manche nur opacity, manche opacity+cursor, manche nur cursor. Sollte standardisiert werden.
25. **[Layout Shift]** — Kein Skeleton-Placeholder für Image-Fallbacks (Portraits, Companion-Portraits). `onError` blendet aus, zeigt aber keinen Placeholder.
26. **[Hover Transitions]** — Viele interaktive Elemente nutzen inline `onMouseEnter`/`onMouseLeave` statt CSS `hover:` mit Transitions. Erzeugt harte State-Wechsel.

#### RiftView.tsx
27. **[Click Target]** :615 — Level-Selector +/- Buttons nur 28px (w-7 h-7), unter 32px Minimum. Kritische Gameplay-Controls.
28. **[Empty State]** :650 — Mythic-Leaderboard zeigt nur "No entries" ohne Kontext. Besser: "Complete any Mythic+ to appear here."
29. **[Loading State]** :707 — Leaderboard hat keinen Skeleton beim ersten Laden. Sieht kaputt aus.

#### DungeonView.tsx
30. **[Click Target]** :506 — Teilnehmer-Avatare 32px mit 2px Border = effektiv 28px Click-Area
31. **[Layout Shift]** :639 — Confirm-Cancel-Buttons erscheinen ohne reservierte Höhe, erzeugt Layout-Sprung

#### WorldBossView.tsx
32. **[Disabled State]** :333 — Boost-Button: opacity 0.5 aber kein `cursor: not-allowed`

#### BattlePassView.tsx
33. **[Disabled State]** :368 — Claim-Button bei disabled: nur opacity, kein cursor-Feedback

#### ChallengesView.tsx
34. **[Disabled State]** :148 — Milestone-Buttons: `disabled=true` aber kein `cursor: not-allowed`
35. **[Missing Tooltip]** :281 — Speed-Bonus Badge "★" hat kein Tooltip/Help-Cursor

#### FactionsView.tsx
36. **[Hover State]** :350 — Standing-Roadmap-Dots haben kein Hover-Feedback
37. **[Disabled State]** :383 — Reward-Navigation zeigt nicht disabled-State wenn Reward unavailable

#### TalentTreeView.tsx
38. **[Layout Shift]** :286 — Retry-Button bei Error erscheint ohne reservierten Platz

#### CodexView.tsx
39. **[Empty State]** :287 — Undiscovered Entries zeigen nur "???" ohne Tooltip/Erklärung was man tun muss zum Freischalten
40. **[Affordance]** :317 — Collapsible-Sections ohne Chevron-Rotation-Animation, minimal visuell

#### AdventureTomeView.tsx
41. **[Layout Shift]** :163 — Progress-Ring SVG (80x80) ohne reservierten Container, erzeugt Shift beim Laden
42. **[Disabled State]** :516 — Unclaimed-Milestone "◇" ohne Tooltip und ohne Cursor-Style

#### TavernView.tsx
43. **[Hover Transition]** :249 — Duration-Selector-Buttons ohne Hover- und Transitions-Effekte

#### LeaderboardView.tsx
44. **[Hover State]** :162 — Podium-Cards klickbar aber ohne Hover-Styling (kein Background/Scale/Shadow)
45. **[Hover Transition]** :247 — Leaderboard-Rows haben `hover:bg` aber keine Transition-Duration

#### HonorsView.tsx
46. **[Click Target]** :234 — Filter-Buttons nur ~20px hoch (text-xs, px-2 py-0.5), weit unter 32px
47. **[Disabled State]** :303 — Locked-Hidden-Achievements opacity 0.5 aber kein `cursor: not-allowed`
48. **[Missing Tooltip]** :370 — Category-Headers ohne Tooltips, "Secret Achievements" Formatierung unklar

#### RitualChamber.tsx / WandererRest.tsx
*(Keine kritischen AAA-Issues gefunden)*

---

### Zusammenfassung nach Kategorie

| Kategorie | Anzahl | Priorität |
|-----------|--------|-----------|
| Missing Hover/Transition | 12 | Medium |
| Disabled State ohne Cursor/Tooltip | 10 | High |
| Click Targets < 32px | 5 | High |
| Missing Tooltips | 4 | Medium |
| Layout Shift | 3 | Medium |
| Empty State verbesserbar | 2 | Low |
| Missing Loading/Skeleton | 1 | Low |
| Inkonsistente Patterns | 2 | Low |

**Top-Priorität Fixes:**
1. Disabled-States standardisieren (alle: opacity + cursor + tooltip)
2. Click-Targets auf min 32px bringen
3. Hover-Transitions auf interaktive Elemente

---

### Flavor Text Findings

*(Keine neuen Text-Issues. 4400+ Texte geprüft, alles clean.)*

---

### Modals, Popups & Feedback-Systeme

#### Close-Button Sizing
49. **[Click Target]** PlayerProfileModal.tsx:152 — Close-Button nur 8x8px, weit unter 32px Minimum
50. **[Click Target]** QuestDetailModal.tsx:132 — btn-close 18px Font, Hit-Target zu klein

#### Z-Index Chaos
51. **[Z-Index]** DashboardModals.tsx:385,413,449 — Info-Overlays `zIndex: 9999` vs RewardCelebration `z-[200]`. Inkonsistente Strategie.
52. **[Z-Index]** DashboardModals.tsx:321 — Modifier-Modal-Backdrop `zIndex: 9999` während Parent-Currency-Modal nur `z-[90]`
53. **[Z-Index]** ToastStack.tsx:330 — ToastStack `z-[150]` liegt UNTER RewardCelebration `z-[200]`. Error-Toasts während Quest-Completion unsichtbar.

#### Async/Loading Feedback
54. **[Loading State]** ItemActionPopup.tsx:46 — Keine Loading-Animation bei Item-Actions, nur Opacity-Change. Auf langsamen Netzen unklar ob Button funktioniert.
55. **[Loading State]** QuestDetailModal.tsx:247 — "Claiming..." Text aber kein Spinner/Cursor-Feedback. Button sieht bei opacity 0.6 noch klickbar aus.

#### Backdrop/Close Verhalten
56. **[Close Animation]** DashboardModals.tsx:57 — ESC-Taste resettet mehrere States ohne Animation-Delay. Harter Unmount statt Fade-Out.
57. **[Scroll]** DashboardModals.tsx:156 — Kein `overscrollBehavior: contain` in Modals. Auf Mobile kann Scrollen Pull-to-Refresh triggern.
58. **[Backdrop]** QuestDetailModal.tsx:79 — Wenn Modal höher als Viewport (80vh), ist scrollender Backdrop-Bereich klickbar und schließt versehentlich.

#### Accessibility
59. **[Focus]** OnboardingWizard.tsx:250 — Kein initialer Focus-Set auf erstes interaktives Element. Keyboard-User haben keinen Focus-Indikator.
60. **[aria]** PlayerProfileModal.tsx:149 — Fehlt `aria-modal="true"` Attribut

### Animations & Game Feel

#### Performance (Layout Thrash)
61. **[Performance]** TodayDrawer.tsx:914,1037,1081 — Progress-Bars animieren `width` direkt statt `transform: scaleX()`. Erzeugt Reflow jeden Frame. Auf schwachen Geräten Jank.
62. **[Performance]** WorldBossView.tsx:757 — Damage-Leaderboard-Bar mit `transition: "width 0.3s"`, selbes Layout-Thrash-Problem

#### Timing & Feel
63. **[Timing]** globals.css:636 — `reward-title-glow` Animation 1.5s, zu langsam für Celebration. WoW/Diablo pulsieren bei 1.0-1.2s.
64. **[Timing]** GachaPull.tsx:287 — Gacha-Reveal-Card 0.5s ease-out nach 5.8s Charge ist zu langsam. Genshin-Impact-Standard: 0.25-0.3s für snappy Payoff.
65. **[Timing]** globals.css:649 — Reward-Pills cascadieren mit 0.15s Intervals — zu schnell, erzeugt visual noise bei vielen Rewards

#### Missing Animations
66. **[Missing Animation]** RewardCelebration.tsx:542 — "Nehmen"-Button erscheint ohne Animation (hard cut). Sollte 0.4s nach Modal-Entrance fade+scale rein.

#### Overuse
67. **[Overuse]** page.tsx:1242 — Streak-Warning nutzt `animate-pulse` (2s, sanft) — zu sanft für Urgency. Sollte 1.2s mit stärkerem Opacity-Shift sein.

### Responsive & Mobile

*Aktuell nicht relevant — Mobile ist noch nicht supported. Wird übersprungen.*

### Error Handling UX

#### Silent Failures (User sieht NICHTS bei Fehler)
68. **[Silent]** QuestModals.tsx:364 — Co-op Quest Creation Fehler wird nur in Console geloggt, User sieht nichts
69. **[Silent]** QuestPanels.tsx:543 — Vow-Abandonment: DELETE-Fehler komplett verschluckt mit `catch { /* ignore */ }`
70. **[Silent]** RitualChamber.tsx:543 — Vow/Habit-Deletion: `catch { /* ignore */ }` — komplett stumm bei Fehler
71. **[Silent]** CodexView.tsx:69 — Content-Loading-Fehler verschluckt: `.catch(() => {})` — kann endlose Loading-Animation erzeugen
72. **[Silent]** WorldBossView.tsx:225 — Endpoint-Fehler stumm ignoriert, kein Fallback-UI

#### Generische/Zu kurze Error Messages
73. **[Auto-Dismiss]** SocialView.tsx:1527 — Mail-Deletion Error verschwindet nach 4s, zu kurz zum Lesen
74. **[Auto-Dismiss]** DailyLoginCalendar.tsx:49 — Claim-Bonus Error nach 3-5s weg, nur "Network error"
75. **[Generic]** ForgeView.tsx:619 — Dismantle-Fehler zeigt nur "Network error" ohne Kontext was schiefging
76. **[Generic]** ForgeView.tsx:654 — Dismantle-All: "Something went wrong. Try again" — keinerlei Detail

#### Missing Response Validation
77. **[No .ok Check]** GachaView.tsx:735 — History-Fetch parst JSON ohne `r.ok`-Check. Bei 500er Error crasht JSON-Parse stumm.

#### Pattern-Zusammenfassung
- `catch { /* ignore */ }` kommt **8+ mal** vor
- `.catch(() => {})` kommt **7 mal** vor
- Auto-Dismiss Zeiten: 3-6 Sekunden, oft zu kurz für Fehlermeldungen

### Visuelle Konsistenz

#### Falsche Farben
78. **[Farbe]** ChallengesView.tsx:700 — Essenz wird als `#3b82f6` (blau) angezeigt statt `#ef4444` (orange). Falsche Currency-Farbe!

#### Inkonsistente Border-Radii
79. **[Radius]** ChallengesView.tsx:80,816 — Mischt `rounded-md` (6px) mit `rounded-lg` (8px) in derselben View für gleiche Element-Typen

#### Inkonsistente Section-Headers
80. **[Header]** ChallengesView.tsx:431 — Expedition-Header ist `text-lg` mit textShadow, Star-Path-Header nur `text-sm` ohne Shadow. Gleiches semantisches Level, unterschiedliches Gewicht.

#### Currency-Display Inkonsistenz
81. **[Currency]** DungeonView.tsx:753 — Gold/Essenz manchmal mit Icon + Background, manchmal nur als Text. Zwei verschiedene Styles für selbe Daten.

#### Button-Padding Inkonsistenz
82. **[Padding]** QuestCards.tsx:490 — Primary-Action-Buttons `px-3` während andere Views konsistent `px-4` nutzen. Quest-Buttons wirken gequetscht.

#### Currency-Bar Alignment (User-Reported)
83. **[Alignment]** page.tsx:1262 — Currency-Icons und Zahlen sind horizontal versetzt. Ursache: `<Tip>` rendert ein `<span>` (inline), darin liegen Icon + Zahl als Inline-Kinder. Kein Flex-Layout innerhalb von Tip → Baseline-Alignment statt Center. **Fix:** Entweder den span in Tip als `inline-flex items-center gap-1` stylen, oder Icon und Zahl jeweils in eigene `<Tip>` wrappen und mit dem äußeren Flex-Container (`gap-1`) ausrichten.

### Data Consistency (automatisierte Prüfung)

#### KRITISCH: World Boss Drops referenzieren nicht-existierende Items
84. **[Missing Items]** worldBosses.json — ALLE 35 uniqueDrops über alle 15 Bosse referenzieren Item-IDs die weder in gearTemplates.json noch uniqueItems.json existieren. Spieler die Bosse besiegen bekommen Referenzen auf Phantom-Items.

#### HOCH: 32 Crafting-Items mit falschem Slot
85. **[Wrong Slot]** gearTemplates.json — 16 Juwelier-Items namens "Ring/Reif/Band" haben `slot=amulet` statt `slot=ring`. 7 Schmied-Items "Kettenhemd/Kettenpanzer" haben `slot=amulet` statt `slot=armor`. 6 Schneider-Items "Gewand" haben `slot=weapon` statt `slot=armor`. 3 "Kapuze"-Items haben `slot=armor` statt `slot=helm`.

#### MITTEL: Tier/Level Mismatch bei 263 Crafted Items
86. **[Tier Mismatch]** gearTemplates.json — 263 Crafting-Items haben `tier` das nicht zum `reqLevel` passt (laut CLAUDE.md Regeln T1=1-8, T2=9-16, T3=17-24, T4=25-50). Systematisch 1 Tier zu niedrig. Möglicherweise Designentscheidung, widerspricht aber der Dokumentation.

### Fehlende Tooltips / Info-Lücken

87. **[Missing Tooltip]** ChallengesView.tsx:315 — Star-Thresholds (★1: 5 quests etc.) ohne Erklärung was die Zahlen bedeuten
88. **[Missing Tooltip]** ChallengesView.tsx:342 — Bonus-Multiplier "+15%", "+33%" ohne Tooltip was die Prozente betreffen (Star-Tier Reward Scaling)
89. **[Missing Tooltip]** ForgeView.tsx:1477 — Currency-Icon bei Gear-Kosten ohne Tooltip welche Währung
90. **[Missing Tooltip]** LeaderboardView.tsx:194 — Podium zeigt XP-Zahlen ohne lokalen Tooltip der erklärt was gemessen wird
91. **[Missing Tooltip]** UserCard.tsx:288 — "Quests"-Counter ohne GameTooltip, nur title-Attribut
92. **[Missing Tooltip]** CampaignHub.tsx:185 — Currency-Icon in Campaign-Rewards ohne Tip-Wrapper

### Backend API Edge Cases

#### Inkonsistente Cooldown-Kommunikation
93. **[Cooldown]** sworn-bonds.js:334 — Bond-Break-Cooldown zeigt nur Datum-Text, kein Countdown/Millisekunden für Frontend-Timer
94. **[Cooldown]** crafting.js:526 — Crafting-Cooldown nur terse Text "X minutes remaining", kein maschinenlesbarer Wert
95. **[Cooldown]** gacha.js:314 — Pull-Lock Error "Pull already in progress" ohne Timeout-Info. Bei Crash bleibt User stuck.

#### Destructive Actions ohne Confirmation
96. **[Destructive]** game.js:635 — DELETE /api/rituals/:id löscht sofort ohne `confirmed: true` Parameter
97. **[Destructive]** sworn-bonds.js:430 — Bond-Break feuert sofort. Fat-Finger = 7 Tage Cooldown-Strafe.
98. **[Destructive]** rift.js:332 — Rift-Abandon sofort ohne Confirmation. User kann 30+ Min Fortschritt verlieren.

#### Fehlende Response-Daten
99. **[Response]** quests.js:593 — Coop-Completion returned nur `ok: true`, nicht die individuellen Reward-Anteile

### Typos & Kleine Textfehler

100. **[Typo]** npcQuestGivers.json — Strategin Athena title: "Die Schlachtenkdenkerin" → sollte "Die Schlachtendenkerin" sein
101. **[Typo]** config.ts:148 — Navigation label "Wanderers Rest" fehlt Apostroph. Überall sonst "Wanderer's Rest" (mit ').
102. **[Kontrast]** TowerMap.tsx — Tower Map Navigation hat zu schlechten Kontrast. (User-reported)
    - :159 Floor-Subtitle/Flavor `rgba(255,255,255,0.15)` = 15% Opacity, quasi unsichtbar
    - :164 Room-Count `rgba(255,255,255,0.1)` = 10% Opacity, noch schlimmer
    - :218 Locked-Room-Labels `rgba(255,255,255,0.12)` = 12%, quasi unsichtbar
    - :225 Locked-Room-Icons `opacity: 0.3` = 30%, kaum sichtbar
    - Fix: Subtitle auf mindestens 0.3, Room-Count auf 0.2, Locked-Rooms auf 0.25, Room-Icons auf 0.5

#### Systemisches Kontrast-Problem: Inline-Styles umgehen Utility-Boost
103. **[Kontrast]** Die `text-w15` etc. Utility-Klassen wurden gebootsted, aber **50+ Stellen** in Components nutzen inline `style={{ color: "rgba(255,255,255,0.12-0.15)" }}` direkt. Diese umgehen den Boost komplett. Betroffen: ForgeView (20+ Stellen), ChallengesView (4), NotificationCenter (1), TowerMap (5), RoadmapView (1). Ein globaler Search-Replace von inline `0.12` → `0.22` und `0.15` → `0.25` für Text-Color-Contexts wäre nötig.

### CSS / Technisches

104. **[Dead Code]** globals.css:1470-1477 — `@keyframes today-card-enter` und `today-urgent-pulse` sind doppelt definiert. Die ersten (Zeile 1470/1474) werden von den zweiten (Zeile 1505/1510) überschrieben. Erste Definition ist toter Code.
105. **[Animation Count]** globals.css — 155 `@keyframes` Animationen. Beeindruckend, aber möglicherweise Performance-Impact auf schwächeren Geräten. Keine davon scheint überflüssig (außer die Duplicates).

### Game Balance Edge Cases

#### Crafting Material Access
106. **[Balance]** Neue Verzauberer-Spieler (Lv8) können kein erstes Rezept craften ohne magiestaub/runenstein Drops — die hängen von Quest-Rarity ab. Bei Common-Quests ~1-3% Dropchance pro Material. Kann 20+ Quests dauern bis 1 Material droppt. "Locked out" Gefühl.

#### Battle Pass Erreichbarkeit
107. **[Balance]** 90-Tage-Season braucht ~10.000 XP für Lv40. Casual-Spieler (2 Quests/Tag) = ~3.150 XP = Lv12. Man braucht 5-6 Quests/Tag für Lv40 — aber Daily Diminishing Returns strafen ab Quest 6. Battle Pass ist für Casuals quasi unmöglich komplett.

#### Diminishing Returns Cliff
108. **[Balance]** Quest 1-5 = 100%, Quest 6 = sofort 75%. Es gibt keinen Übergang. Die 5→6 Grenze fühlt sich künstlich an und erzeugt "hör bei 5 auf"-Incentive. Besser: sanfterer Curve (5 = 100%, 6-7 = 90%, 8-10 = 75%).

#### Gacha Soft-Pity Zone
109. **[Balance]** Soft Pity ab 60, Hard Pity bei 75. Das sind 15 Pulls "vielleicht" ohne Garantie (60→75). Genshin hat Soft ab 75, Hard bei 90 — ebenfalls 15 Pulls Unsicherheit. QuestHall's Soft-Zone ist damit vergleichbar mit Genshin, kein Ausreißer.

#### Pity-Display Verwirrung
110. **[UX]** GET /api/gacha/pity zeigt `maxPity` (höchster Wert über alle Banner) für Rückwärtskompatibilität. Spieler sieht 40 Pity, denkt er ist nah an 75, wechselt den Banner und hat dort nur 30. Irreführend.

#### Professions-Plateau
111. **[Balance]** Bei Skill 200+ sind Rezepte auf dem Level grau (0% Skillup). Spieler braucht neuen Rank (Artisan bei 200+), aber dann fehlen Rezepte die noch Orange/Yellow sind. "Proficiency Plateau" bis neuer Content kommt.

---

### Feature-Vorschläge (zur Diskussion)

Alles baut auf bestehender Infrastruktur auf, nichts kollidiert mit BACKLOG/REJECTED/Appendix B.

#### 1. Kopfgeldjagd (Bounty Board) — Effort: M
3 wöchentlich rotierende Bounties mit Risiko/Reward: Wähle 1, zahle ein Gold-Deposit, schaff es oder verlier den Einsatz. D3-Adventure-Mode-Bounties meets WoW-Wanted-Quests. Füllt die "pick one high-stakes objective"-Lücke die Sternenpfad/Expedition nicht bedienen.

#### 2. Echos der Vergangenheit (Quest Reflection Journal) — Effort: M
Nach Quest-Completion optional 1-3 Sätze Reflektion schreiben. Werden später als "Echos" angezeigt wenn ähnliche Quests auftauchen. Milestone-Titel bei 10/50/100 Reflektionen. Verwandelt mechanische Clicks in Micro-Journaling. Habit-Science-basiert.

#### 3. Schmiedefieber (Forge Fever) — Effort: S-M
Alle 48h bekommt eine zufällige Profession ein 4-Stunden-Fever-Window: 50% weniger Material, doppelte Skill-XP. 5+ Crafts im Window = Bonus-Cache. Erzeugt Login-Urgency wie HSR Double-Reward-Events.

#### 4. Schattenspiegel (Shadow Mirror) — Effort: M
System generiert einen "Schatten" — Phantom-Rivale basierend auf deinen eigenen Stats von vor 7 Tagen. Jede Woche: Schlägst du dein vergangenes Ich? 3 Wochen in Folge → Shadow wird härter + einzigartiger Frame. Solo-Selbstverbesserung ohne Social-Druck. D2-Personal-Bests-Konzept.

#### 5. Gildenchronik (Guild Chronicle) — Effort: M
Permanente scrollbare Community-Timeline: Erste Clears, World-Boss-Kills, Legendäre Drops, Rekorde. Erster Spieler der etwas schafft bekommt "First!"-Badge. Hall of Fame die dem Leaderboard fehlt. Nutzt bestehendes `logActivity()`-System.

#### 6. Zwielichtmarkt (Twilight Market) — Effort: M
Einmal pro Tag, zu zufälliger Stunde, erscheint ein mysteriöser Vendor für genau 2 Stunden. 3-5 exklusive Items, seltene Materialien, Mystery-Scrolls, gelegentlich vergünstigte Gacha-Tokens. Wer die 2h verpasst, verpasst den Deal. WoW-Rare-Vendors + HSR-Liben-Konzept.

#### 7. Runenworte (Runewords) — Effort: M
Spezifische Gem-Kombinationen in derselben Ausrüstung fusionieren zu "Runenworten" mit mächtigen Bonus-Effekten. 8-12 versteckte Rezepte, Entdeckung durch Experimentieren oder Runenstein-Hints als seltene Drops. Entdeckte Runenworte erscheinen im Codex. Diablo-2-Runewords auf bestehendem Gem-Socket-System.

---

### Bereits gefixt (diese Session)
- Companion Level-Up RewardCelebration
- Wanderer's Rest Tutorial hinzugefügt
- Challenges Tutorial Text gefixt
- Bazaar Tutorial Bug gefixt (nur im Loading-State)
- Material Storage Redundanz entfernt
- Companion Tutorial von Character→Companion verschoben
- Artisan's Quarter Button aus Character Screen entfernt
- Talent Tree Tutorial Text gefixt
- Codex Unlock Requirements erhöht (83→15 easy unlocks + Revalidierung)
- Sworn Bonds Proposal-Modal mit 3 Dauern
- Text-Opacity Boost (text-w10 bis text-w35)
- Flavor-Texte von text-xs auf text-sm in Modalen/Views

---

## Appendix D: Content Density & Balance

> Consolidated from BALANCE_CONTENT_AUDIT.md (2026-06-23). Counts re-verified against code on 2026-06-23.

### 1. Content Density Overview

#### Total Content Counts

| System | Count | Verdict |
|--------|-------|---------|
| **Gear Items** | 2,275 across 11 files | RICH |
| **Crafting Recipes** | 866 across 8 professions | RICH |
| **Crafting Materials** | 91 types | RICH |
| **Unique Named Items** | 14 handcrafted legendaries | GOOD |
| **Suffixes** | 10 types (WoW-style random suffix) | GOOD |
| **Achievements** | 168 with diverse unlock conditions | RICH |
| **Titles** | 145 across multiple categories | RICH |
| **Weekly Challenge Templates** | 32 unique challenges | RICH |
| **Weekly Modifiers** | 18 rotational modifiers | RICH |
| **Expedition Templates** | 20 cooperative missions | GOOD |
| **World Bosses** | 15 with unique lore + drops | RICH |
| **Mythic+ Affixes** | 10 weekly rotating | GOOD |
| **Battle Pass Seasons** | 3 x 40 levels | GOOD |
| **Factions** | 4 with 6 rep tiers each | ADEQUATE |
| **Gem Types/Tiers** | 6 types x 5 tiers = 30 variants | RICH |
| **Companion Types** | 5 companions | ADEQUATE |
| **Companion Expeditions** | 4 tiers | THIN |
| **Dungeons** | 3 (Normal/Hard/Legendary) | THIN |
| **Gacha Standard Pool** | 19 items | THIN |
| **Shop Items** | 19 items | ADEQUATE |
| **NPC Quest Givers** | 2 | THIN |
| **Campaign NPCs** | 5 | THIN |
| **Gacha Banners** | 2 templates | THIN |
| **Rift Tiers** | 4 (Normal/Hard/Legendary/Mythic) | GOOD |
| **Player Classes** | 1 | THIN |

---

#### Gear Distribution by Slot

> Note: the per-slot, per-rarity and per-source breakdowns below are a distribution snapshot from 2026-03-27; the gear pool has since grown to 2,275 items, so absolute counts are stale (proportions remain indicative).

| Slot | Items | % | Verdict |
|------|-------|---|---------|
| Armor | 185 | 17.2% | Balanced |
| Helm | 181 | 16.9% | Balanced |
| Boots | 179 | 16.7% | Balanced |
| Weapon | 177 | 16.5% | Balanced |
| Shield | 133 | 12.4% | Balanced |
| Amulet | 133 | 12.4% | Balanced |
| Ring | 86 | 8.0% | Slightly thin (newer slot) |

Rings were added recently — 86 items is fine for a newer slot. No critical imbalance.

#### Gear Distribution by Rarity

| Rarity | Items | % |
|--------|-------|---|
| Rare | 306 | 28.5% |
| Epic | 274 | 25.5% |
| Uncommon | 257 | 23.9% |
| Common | 126 | 11.7% |
| Legendary | 111 | 10.3% |

Good pyramid — most items are rare/epic (mid-game), fewest are legendary (aspirational).

#### Gear Distribution by Source

| Source | Items | Binding | Power Level |
|--------|-------|---------|-------------|
| General Pool | 257 | BoE | Low |
| Rift Drops | 150 | BoP | Mid-High |
| Schmied Crafted | 100 | BoE | Mid |
| Waffenschmied Crafted | 100 | BoE | Mid |
| Schneider Crafted | 100 | BoE | Mid |
| Lederverarbeiter Crafted | 100 | BoE | Mid |
| World Boss | 80 | BoP | High |
| Juwelier Crafted | 67 | BoE | Mid |
| Dungeon Core | 50 | BoP | High |
| Dungeon Spire | 40 | BoP | Mid-High |
| Dungeon Archive | 30 | BoP | Mid |

#### Recipe Distribution by Profession

| Profession | Recipes | Type |
|------------|---------|------|
| Schmied | 134 | Gear (heavy armor) |
| Lederverarbeiter | 134 | Gear (leather armor) |
| Schneider | 130 | Gear (cloth armor) |
| Waffenschmied | 116 | Gear (weapons/shields) |
| Juwelier | 116 | Gear (rings/amulets) |
| Alchemist | 76 | Consumables (potions/flasks) |
| Verzauberer | 71 | Enchants (temp buffs + vellums) |
| Koch | 62 | Consumables (meals) |

Good split: ~75/25 gear vs consumable recipes. (Per-profession counts are a 2026-03-27 snapshot; the recipe pool now totals 866.)

---

### 2. Content Density Analysis

#### Content-Rich Systems (Well-Populated)
1. **Gear/Loot** — 2,275 items, excellent source diversity, proper power hierarchy
2. **Crafting** — 866 recipes, 8 professions, WoW Classic 300-skill system
3. **Weekly Challenges** — 32 templates + 18 modifiers = months of variety
4. **World Bosses** — 15 unique bosses with lore, themed drops, tier progression
5. **Achievements** — 168 with diverse categories (milestones, streaks, speed, variety)
6. **Gems** — Complete 6x5 matrix with clear upgrade paths
7. **Titles** — 145 across level/streak/quest/season/dungeon categories

#### Adequately Populated
8. **Factions** — 4 factions, 6 tiers each, auto-rep from quests — functional but could expand
9. **Battle Pass** — 3 seasons x 40 levels — good for now
10. **Expeditions** — 20 templates with flavor text
11. **Companion System** — 5 companions, bond levels, ultimates
12. **Mythic+ Affixes** — 10 affixes, weekly rotation, 3 activation tiers

#### Content-Thin Systems (Need Expansion)
13. **Dungeons** — Only 3 tiers with 7-day cooldown. Players exhaust this in weeks.
14. **Gacha Pool** — 19 standard items, 0 featured. Banner rotation needs more items.
15. **NPC Quest Givers** — Only 2 in data. Dynamic generation compensates but variety is low.
16. **Campaign NPCs** — 5 NPCs, but no campaign template data found.
17. **Companion Expeditions** — Only 4 tiers (4h/8h/12h/24h). Needs more variety.
18. **Player Classes** — Only 1 class defined. System exists but is underpopulated.

---

### 3. Biggest Content Gaps (Player-Facing)

#### Priority 1: Dungeons (3 is too few)
Players hit all 3 dungeons in week 1, then wait 7 days per cooldown. WoW Classic has 20+ dungeons. Even 6-8 would dramatically improve weekly content rotation. Each dungeon already has unique loot tables (30/40/50 items), so the template works — just needs more entries.

#### Priority 2: Gacha Pool (19 items feels empty)
19 items in the standard pool means players see repeats fast. The gacha system infrastructure is solid (pity, banners, pull animations), but needs 50+ items to feel substantial. Featured banner pool is completely empty.

#### Priority 3: NPC Quest Variety
Only 2 quest giver NPCs in data. The quest system relies heavily on procedural generation from templates, but more named NPCs with unique quest chains would add narrative depth.

#### Priority 4: Campaign Content
Campaign system exists (routes/campaigns.js, CampaignHub.tsx) but no campaign template data was found. This is a complete feature with no content to drive it.

#### Priority 5: Player Classes
Only 1 class defined. The class system (routes/game.js, classes.json) is built but needs 4-6 classes with distinct playstyles to matter.

---

### 4. Balance Observations

#### Gold Economy
- Quest rewards: 5-60 gold per quest (rarity-scaled)
- Craft costs: 0 gold (material-gated)
- Shop prices: 50-5000 gold range
- Mail postage: 5 gold (minor sink)
- Transmute cost: 500 gold
- **Assessment**: Gold sinks are light. Main sinks are shop + transmute. Crafting being free removes a major sink that WoW Classic uses.

#### XP Progression
- Level 1->30: 130,000 XP total (main game)
- Level 31->50: 1,225,000 XP total (prestige, ~9.4x more than 1-30)
- Quest XP: 8-100 per quest (rarity-scaled, before multipliers)
- **Assessment**: Prestige levels (31-50) are appropriately grindy. The 9.4x multiplier ensures they take months.

#### Stat Caps
- BiS ceiling at Lv50 Legendary: 15-24 primary + 6-12 minor per item
- 7 equipment slots = theoretical max ~168 primary stats
- Kraft/Weisheit cap: 30
- **Assessment**: With 7 slots, hitting the cap of 30 is achievable but requires optimization. Good tension between "more slots = more stats" and hard cap.

#### Legendary Effects
- Effect values: 1-6% for normal items, 5-20% for uniques
- Same-category effects stack additively (correct D3 behavior)
- Kanai's Cube adds 3 more effect slots at minimum values
- **Assessment**: Values are deliberately small. Even with 7 legendary items + 3 cube slots, total bonuses stay manageable (e.g., max ~30% XP bonus from stacking 5x 6% items).

#### Rift Difficulty
- Normal: 3 quests / 72h (casual)
- Hard: 5 quests / 48h (moderate)
- Legendary: 7 quests / 36h (challenging)
- Mythic+1: 7 quests / 28.5h, 1.3x difficulty
- Mythic+10: 7 quests / 15h, 4.0x difficulty
- Mythic+20: 7 quests / max(18, 30-30)=18h, 7.0x difficulty
- **Assessment**: Good escalation. M+10 is realistic endgame, M+20 is aspirational.

---

### 5. Recommendations

#### Quick Wins (Data Only, No Code Changes)
1. Add 3-5 more dungeons to public/data/dungeons.json
2. Add 30+ gacha pool items to gachaPool.json
3. Add 4-5 more player classes to classes.json
4. Add campaign templates
5. Add more companion expedition templates (8-10 total)

#### Medium Effort
6. Add 2 more featured gacha banners with rotation
7. Add 5+ NPC quest givers with unique chains
8. Add 2 more factions (total 6) for broader rep gameplay

#### Already Strong — Don't Touch
- Gear system (2,275 items, well-distributed)
- Crafting (866 recipes, balanced across professions)
- Weekly challenges (32 templates, 18 modifiers)
- Achievement system (168 diverse achievements)
- World bosses (15 with excellent lore integration)

---

### 6. Technical Scalability Notes

> Consolidated from former SCALABILITY-AUDIT.md (deleted 2026-04-02)

- **state.quests** grows unbounded — no eviction/archiving of completed quests
- **Dashboard endpoint** optimized: expensive modifiers only computed for requesting player (not all users)
- **Debounced saves** have 2s max-delay ceiling to prevent indefinite deferral
- **All save functions** use atomicWriteSync (write-to-temp-then-rename)
- **Per-request caching** for getTalentEffects + getLegendaryModifiers
- **page.tsx** has 92 useState calls — potential state management refactor target
- **gearTemplates.json** is 1.7MB — largest data file, loaded once at boot

---

*End of Audit Report*
