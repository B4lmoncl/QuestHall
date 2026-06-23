# HANDOFF — Add Core Tests to QuestHall

**Datum:** 2026-06-23
**Branch:** `claude/add-core-tests-mMcAl`
**Status:** Branch existiert, ist ausgecheckt, clean (keine uncommitted changes), 0 eigene Commits bisher.
**Repo:** `b4lmoncl/questhall`

---

## 1. AUFTRAG

Das Projekt hat **keinerlei Test-Suite**. Kein Jest, kein Vitest, kein Mocha. `package.json` hat keinen `test`-Script und keine Test-Dependencies. Der Branch-Name `claude/add-core-tests-mMcAl` sagt: **Core Tests hinzufügen.**

Aktuell gibt es nur:
- `scripts/verify-items.js` — prüft ob alle Consumable-Effect-Types Handler haben
- `scripts/test-*.js` (5 Dateien, ~490 Zeilen) — **Integration-Tests die einen laufenden Server brauchen** (HTTP-Requests gegen localhost:3001). Kein Test-Framework, nur manuelles `assert()` mit PASS/FAIL Counter.

**Was fehlt:** Echte Unit-Tests mit einem Framework, die ohne laufenden Server funktionieren und die Kernlogik direkt testen.

---

## 2. TECH STACK & CONSTRAINTS

- **Backend:** Node.js 20, Express 4.18, CommonJS (`require`/`module.exports`), JavaScript
- **Frontend:** Next.js 16.1.6, React 19, TypeScript 5
- **Keine DB** — alles JSON-Files in `/data`
- **Kein Test-Framework installiert** — muss hinzugefügt werden
- **package.json scripts:** `dev`, `build`, `start`, `server`, `lint` — kein `test`
- **devDependencies aktuell:** eslint, eslint-config-next, tailwindcss, typescript, @types/*

**Empfehlung Framework:** Vitest (kompatibel mit dem bestehenden Next.js/TS-Stack, schnell, kein Babel nötig) ODER Jest (etablierter, aber braucht mehr Config für CJS+ESM Mix). Beides geht — der User hat keine Präferenz geäußert.

---

## 3. WAS GETESTET WERDEN SOLL

### 3a. `lib/helpers.js` (~2347 Zeilen) — HAUPTZIEL

Die zentrale Utility-Datei. Exportiert ~65 Funktionen. Die **reinen/nahezu-reinen Funktionen** die sich gut unit-testen lassen:

**Pure Functions (kein State nötig):**
| Funktion | Signatur | Was sie tut |
|---|---|---|
| `paginate(array, query, defaultLimit=100)` | `→ {items, total, limit, offset, hasMore}` | Pagination mit limit/offset aus Query-Params. Clamp: limit 1-500, offset ≥0 |
| `getTodayBerlin()` | `→ "YYYY-MM-DD"` | Heutiges Datum in Berlin-Timezone |
| `getMsUntilNextMidnightBerlin()` | `→ number` | Millisekunden bis Mitternacht Berlin |
| `getLevelInfo(xp)` | `→ {level, title, xpRequired, nextXp, progress}` | Level-Lookup aus XP. Iteriert über `LEVELS` Array |
| `diminishing(stat, maxBonus, softCap)` | `→ number` | Diminishing Returns: `maxBonus * stat / (stat + softCap)`. Bei stat=0 → 0, bei softCap → 50% |
| `getMaxRarity(playerLevel)` | `→ string` | Level→max Rarity: ≥25=legendary, ≥17=epic, ≥9=rare, sonst uncommon |
| `getItemLevel(item)` | `→ number` | Item Level = sum(stats) + rarity bonus + legendary bonus + socket bonus + unique bonus |
| `getStreakMilestone(streak)` | `→ object\|null` | Höchster Milestone ≤ streak aus STREAK_MILESTONES |
| `getStreakXpBonus(streak)` | `→ number` | Milestone xpBonus / 100, oder 0 |
| `shuffle(arr)` | `→ array` | Fisher-Yates shuffle, gibt neues Array zurück |
| `rollAffixStats(template, moonlightBonus=0)` | `→ {stats, legendaryEffect}` | Würfelt Stats aus Affix-Template. Primary+Minor pools, Moonlight-Bonus hebt min an |
| `createGearInstance(template, opts)` | `→ object` | Erstellt Gear-Instanz mit gerollten Stats, Sockets, instanceId |
| `createUniqueInstance(uniqueTemplate)` | `→ object` | Wie createGearInstance aber für Unique Items (fixedStats oder affix-roll) |
| `rollSuffix(gearInstance)` | `→ gearInstance` | 30% Chance einen WoW-Suffix anzuhängen, addiert Bonus-Stats |
| `createPlayerLock(name)` | `→ {acquire(id), release(id)}` | Mutex per Player-ID |
| `now()` | `→ ISO string` | `new Date().toISOString()` |
| `randGold(rarity)` | `→ number` | Random Gold aus GOLD_BY_RARITY Range |

**Funktionen die State brauchen (mockbar):**
| Funktion | State-Dependency | Was sie tut |
|---|---|---|
| `getBondLevel(bondXp)` | `state.BOND_LEVELS` | Bond-Level aus XP, wie getLevelInfo |
| `getAgent(name)` | `state.store.agents` | Agent by name lookup |
| `sanitizeAgent(agent)` | keiner | Entfernt commands, zählt pending |
| `getQuestHoardingMalus(userId)` | `state.questsById`, `state.playerProgress`, `state.npcState` | Malus für zu viele In-Progress Quests (>20 = -10%/Quest, cap -80%) |
| `calcDynamicForgeTemp(userId)` | `state.users[id]` | Forge-Temperatur mit Decay (2%/h, Ausdauer reduziert) |
| `getKraftBonus(userId)` | via getUserStats | +0.5% XP pro Kraft-Punkt |
| `getWeisheitBonus(userId)` | via getUserStats | +0.4% Gold pro Weisheit-Punkt |
| `getXpMultiplier(userId)` | via getForgeXpBase * getKraftBonus | Kombinierter XP-Multiplikator |
| `getGoldMultiplier(userId)` | via getForgeGoldBase * getWeisheitBonus * workshop | Kombinierter Gold-Multiplikator |
| `getLegendaryEffects(userId)` | `state.users[id].equipment` | Sammelt alle Legendary Effects von Equipment |
| `getLegendaryModifiers(userId)` | via getLegendaryEffects | Aggregiert Effects zu Modifier-Objekt (xpBonus, goldBonus, etc.) |
| `getGearScore(userId)` | `state.users[id].equipment` | Summe aller Item Levels |
| `getUserStats(userId)` | `state.users[id].equipment`, `state.gearById`, Sets | Aggregierte Stats inkl. Set-Boni, Gem-Boni |
| `awardCurrency(userId, currency, amount)` | `state.users[id]` | Addiert Currency, returned neuen Wert |
| `spendCurrency(userId, currency, amount)` | `state.users[id]` | Subtrahiert Currency, returned `{success, newBalance}` |
| `addLootToInventory(userId, lootItem)` | `state.users[id]` | Loot → Inventory mit Auto-Consume für gold/xp/shields/bond/forge_temp |
| `checkLootPity(userId)` | `state.users[id]._lootPity` | Pity Counter: nach 12 Misses → true |
| `updateUserStreak(userId)` | `state.users[id]`, Talents, Workshop | Streak-Logik: gestern=+1, sonst Shield/Vitalität/Reset |

### 3b. `lib/state.js` (~1427 Zeilen) — SEKUNDÄR

Testbare Funktionen:
| Funktion | Was sie tut |
|---|---|
| `evaluateAchievementCondition(condition, u)` | Großer Switch über ~30 Condition-Types. Pure bis auf `state.store.agents` und `state.socialData` Referenzen. SEHR gut testbar mit Mock-User-Objekten |
| `ensureUserCurrencies(u)` | Stellt sicher dass User alle Currency-Felder hat. Mutiert `u` in-place |
| `resolveItem(itemId)` | Lookup: erst `state.itemTemplates`, dann `state.gearById` |
| `getActiveBuffs(userId)` | Filtert abgelaufene Buffs raus, gibt aktive zurück |

### 3c. `lib/auth.js` (~243 Zeilen) — SEKUNDÄR

| Funktion | Was sie tut |
|---|---|
| `generateAccessToken(user)` | JWT mit sub/name/isAdmin, 15min Expiry |
| `generateRefreshToken(user)` | JWT mit sub/jti, 7d Expiry |
| `generateTokenPair(user)` | Beide zusammen |
| `verifyAccessToken(token)` | Verify + type=access Check |
| `verifyRefreshToken(token)` | Verify + type=refresh + jti + revocation Check |
| `revokeRefreshToken(token)` | Adds jti to revoked Map |
| `extractBearerToken(req)` | `Authorization: Bearer X` → `X` |
| `getRefreshTokenFromRequest(req)` | Cookie oder Body |
| `resolveAuth(req)` | JWT oder API-Key → `{userId, userName, isAdmin}` |
| `getMasterKeyFromEnv()` | MASTER_KEY env oder erster API_KEY |

**Achtung:** Auth-Modul importiert `state` und `saveAppState`. Braucht Mocking von `state.appState` für JWT-Secret-Generierung.

### 3d. `app/utils.ts` (~350 Zeilen) — TERTIÄR (Frontend)

Pure Functions die sich ohne DOM/React testen lassen:
| Funktion | Was sie tut |
|---|---|
| `timeAgo(iso)` | ISO-String → "just now" / "5m ago" / "2h ago" / "3d ago" |
| `getSeason()` | Monat → {name, icon, color, bg, particle} |
| `getUserLevel(xp)` | Wie backend getLevelInfo, iteriert GUILD_LEVELS |
| `getUserXpProgress(xp)` | XP-Progress als 0-1 Float |
| `getForgeTempInfo(temp)` | Temp-Stufe → {statusMessage, actionSuggestion, tooltipText} |
| `getQuestRarity(quest)` | Quest → Rarity-String basierend auf XP |
| `getAntiRitualMood(days)` | Tage → {msg, color} |
| `GUILD_LEVELS` | Exportiertes Array mit 50 Level-Definitionen |

---

## 4. WICHTIGE STATE-KONSTANTEN FÜR TESTS

Diese werden aus `lib/state.js` exportiert und von `helpers.js` benutzt:

```js
// Rarity system
RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
RARITY_WEIGHTS = { common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1 }
RARITY_COLORS = { common: '#9ca3af', uncommon: '#22c55e', rare: '#3b82f6', epic: '#a855f7', legendary: '#f97316' }

// Economy
GOLD_BY_RARITY = { common: [6,12], uncommon: [10,18], rare: [15,25], epic: [22,35], legendary: [30,50] }
XP_BY_RARITY = { common: [5,8], uncommon: [10,15], rare: [18,25], epic: [28,40], legendary: [40,60] }
RUNENSPLITTER_BY_RARITY = { common: 0, uncommon: 1, rare: 2, epic: 4, legendary: 8 }

// Gear
EQUIPMENT_SLOTS = ['weapon', 'shield', 'helm', 'armor', 'amulet', 'ring', 'boots']
GEAR_TIERS = [1, 2, 3, 4]
SET_BONUSES = { adventurer: {...}, veteran: {...}, master: {...}, legendary: {...} }

// Item Level Bonuses (in helpers.js, nicht exportiert)
RARITY_ILVL_BONUS = { common: 0, uncommon: 5, rare: 15, epic: 30, legendary: 50 }
LEGENDARY_ILVL_BONUS = 20
SOCKET_ILVL_BONUS = 5

// LEVELS = Array aus levels.json: [{level:1, xpRequired:0, title:"..."}, ...]
// STREAK_MILESTONES = [{days:3, xpBonus:5, badge:"...", label:"..."}, ...]
// TIMEZONE = "Europe/Berlin"
```

---

## 5. MOCK-STRATEGIEN

### Minimaler State-Mock für helpers.js Tests:
```js
// Vor dem Import von helpers.js den State mocken:
const state = require('../lib/state').state;

// Minimal user
state.users['testuser'] = {
  id: 'testuser', name: 'TestUser',
  xp: 500, gold: 100,
  currencies: { gold: 100, stardust: 0, essenz: 0, runensplitter: 0, sternentaler: 0 },
  streakDays: 5, streakLastDate: '2026-04-14',
  forgeTemp: 80, forgeTempAt: new Date().toISOString(),
  equipment: {}, inventory: [],
  questsCompleted: 10,
  companion: { id: 'cat', name: 'Dobbie', bondXp: 50, bondLevel: 3 },
};

// Minimal quest
state.quests = [{ id: 'q1', title: 'Test', status: 'open', rarity: 'common' }];
state.questsById = new Map([['q1', state.quests[0]]]);

// Player progress
state.playerProgress = { testuser: { completedQuests: {}, claimedQuests: [], npcQuests: {} } };
```

### Auth-Module Mock:
```js
// state.appState muss existieren für JWT secret generation
state.appState = state.appState || {};
// Für resolveAuth tests:
state.validApiKeys = new Set(['test-key-123']);
state.usersByApiKey = new Map([['test-key-123', { id: 'testuser', name: 'TestUser' }]]);
```

---

## 6. PROJEKT-STRUKTUR (relevante Dateien)

```
lib/
  helpers.js        # ~2347 Zeilen, 65+ exportierte Funktionen — HAUPTZIEL
  state.js          # ~1427 Zeilen, State + Persistence + evaluateAchievementCondition
  auth.js           # ~243 Zeilen, JWT + API Key Auth
  middleware.js      # Express middleware (requireAuth, requireApiKey)
  rotation.js        # Daily rotation logic
  npc-engine.js      # NPC spawning
  quest-catalog.js   # Quest template seeding
  quest-templates.js # Quest interpolation
  email.js           # Email (unused?)

app/
  utils.ts           # ~350 Zeilen, Frontend utilities — getUserLevel, timeAgo, etc.
  types.ts           # TypeScript interfaces
  config.ts          # UI config constants

scripts/
  test-quest-lifecycle.js      # Integration test (needs server)
  test-auth-security.js        # Integration test (needs server)
  test-currency-edge-cases.js  # Integration test (needs server)
  test-gacha-edge-cases.js     # Integration test (needs server)
  test-inventory-edge-cases.js # Integration test (needs server)
  verify-items.js              # Standalone validation script

public/data/
  levels.json              # Level definitions (LEVELS array)
  gearTemplates.json       # All gear items
  achievementTemplates.json # Achievement definitions
  gems.json                # Gem system data
  lootTables.json          # Loot tables by rarity
  companions.json          # Companion data
  suffixes.json            # WoW-style gear suffixes
  # ... 43 JSON files total
```

---

## 7. CODE-STIL & KONVENTIONEN

- **Backend:** CommonJS, 2 spaces, camelCase, keine Semicolons-Pflicht (Projekt nutzt sie aber)
- **Frontend:** TypeScript, arrow functions, PascalCase components
- **Comments:** `// --- Section ---` pattern
- **Lookups:** `state.questsById.get(id)` (nie `.find()`), `state.usersByName.get(name)` (nie `Object.values().find()`)
- **Nach state.quests.push(q):** Immer `state.questsById.set(q.id, q)`

---

## 8. EXISTIERENDE INTEGRATION-TESTS (Referenz)

Die 5 Scripts in `scripts/test-*.js` sind **keine Unit-Tests** — sie brauchen einen laufenden Server. Pattern:

```js
// Eigener assert wrapper
let PASS = 0, FAIL = 0, SKIP = 0;
function assert(name, condition, detail) {
  if (condition) { PASS++; console.log(`  ok ${name}`); }
  else { FAIL++; console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); }
}

// HTTP helper
async function api(method, path, body, headers) { ... }

// Am Ende
console.log(`\nResults: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped\n`);
if (FAIL > 0) process.exit(1);
```

Diese Tests **nicht aendern** — sie sind eine separate Kategorie. Die neuen Unit-Tests kommen als eigene Dateien mit echtem Framework.

---

## 9. VORGESCHLAGENER PLAN

1. **Framework installieren** — `npm install --save-dev vitest` (oder jest)
2. **Config erstellen** — `vitest.config.ts` oder `jest.config.js`
3. **`test`-Script in package.json** — `"test": "vitest run"` oder `"test": "jest"`
4. **Test-Dateien erstellen** in `__tests__/` oder `tests/`:
   - `tests/helpers.test.js` — Pure functions: paginate, getLevelInfo, diminishing, getMaxRarity, getItemLevel, getStreakMilestone, rollAffixStats, createGearInstance, createPlayerLock
   - `tests/helpers-state.test.js` — State-abhaengige functions mit Mocks: awardCurrency, spendCurrency, calcDynamicForgeTemp, getGearScore, getLegendaryModifiers, addLootToInventory, checkLootPity
   - `tests/auth.test.js` — Token generation/verification, extractBearerToken, resolveAuth
   - `tests/state.test.js` — evaluateAchievementCondition, ensureUserCurrencies
   - `tests/utils.test.ts` — Frontend: timeAgo, getUserLevel, getUserXpProgress, getForgeTempInfo, getQuestRarity, getAntiRitualMood, getSeason
5. **Commit & Push** auf `claude/add-core-tests-mMcAl`

---

## 10. EDGE CASES & FALLEN

- **Circular Dependencies:** `helpers.js` lazy-loads `talent-tree.js` via `getTalentEffects()`. In Tests wird das fehlschlagen -> muss gemockt oder der lazy-load muss graceful fallen (tut er: returns `{}` bei Fehler)
- **`state.gemsData`:** Wird in `createGearInstance` gebraucht fuer Socket-Ranges. Entweder `public/data/gems.json` laden oder mocken.
- **`rollSuffix`:** Laedt `public/data/suffixes.json` via `require()`. In Tests ggf. mocken.
- **`LEVELS` Array:** Kommt aus `public/data/levels.json`, geladen bei State-Init. Fuer `getLevelInfo` Tests muss dieses Array populated sein.
- **Timestamps/Randomness:** Funktionen wie `now()`, `shuffle()`, `randGold()` nutzen `Date.now()` und `Math.random()`. Fuer deterministische Tests: `vi.spyOn(Math, 'random')` oder `vi.useFakeTimers()`.
- **`state.BOND_LEVELS`:** Geladen aus companions.json. Fuer `getBondLevel` Tests mocken.
- **INVENTORY_CAP:** Hardcoded `100` in helpers.js — ist exportiert.
- **CJS + ESM Mix:** Backend ist CJS, Frontend ist ESM/TS. Test-Config muss beides koennen oder separate Configs haben.
- **`_getRawStats(userId)`:** Interne Funktion (nicht exportiert), wird von `calcDynamicForgeTemp` und `updateUserStreak` genutzt. Kann nicht direkt getestet werden, aber indirekt ueber die aufrufenden Funktionen.

---

## 11. GIT-WORKFLOW

```bash
# Branch ist schon da und ausgecheckt
git branch --show-current  # -> claude/add-core-tests-mMcAl

# Nach Aenderungen:
git add <specific files>
git commit -m "Add core test suite with vitest for helpers, auth, state, and utils"
git push -u origin claude/add-core-tests-mMcAl

# Bei Push-Fehler: retry mit exponential backoff (2s, 4s, 8s, 16s)
# KEIN PR erstellen ausser der User fragt explizit
```

---

## 12. NICHT VERGESSEN

- **CLAUDE.md lesen** — enthaelt alle Projektregeln, Game Design Refs, Item Balancing Rules, UI Guidelines
- **Keine neuen Features** — nur Tests. Keinen bestehenden Code aendern ausser `package.json` fuer Test-Dependencies.
- **Keine Emojis** in Code/Dateien (Projektregel)
- **2 Spaces** Indentation
- **Push auf den richtigen Branch** — `claude/add-core-tests-mMcAl`, niemals main
