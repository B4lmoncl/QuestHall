# Quest Hall — Backlog
<!-- Last updated: 2026-04-02 — cleaned up after Autopilot Audit -->

## Open Bugs

### Quest Board readability + tiles (2026-07-13)
- **[FIXED]** Quest detail modal was see-through/unreadable. `.panel-ornate` used the `background` shorthand, which also resets `background-color` to transparent, wiping the `.bg-surface-alt` fill the modal relied on (same specificity, defined later in the sheet). Now uses `background-image`. The three other `panel-ornate` users set an inline background and were never affected.
- **[FIXED]** Grid quest cards had uneven heights (variable title/subtitle wrapping). Title + subtitle clamped to 2 lines with reserved subtitle height.
- **[FIXED]** Cards showed one of six generic board flavours picked by id hash, ignoring `quest.description` — the board was a wall of repeating text and the actual task was only visible after opening each quest. Cards now show the description, falling back to the quest's own flavour, then the generic line.
- **[FIXED]** First load after the daily rotation rendered an empty Quest Board: the pool was only built by `/api/quests/pool`, which runs *after* the dashboard responded. `/api/dashboard` now calls a shared `ensurePlayerPool()` before building quest data.
- **[FIXED]** Broken legacy starter quests with a stray `"x "` title prefix ("x Welcome to the Guild!", "x Read for 30 Minutes") — leftovers from a removed seeding routine, no `templateId`, unregenerable. Boot cleanup removes them (only untouched, unclaimed, non-companion/NPC/campaign ones).

### Deferred (user: "lass die erstmal so")
- Replace the removed English starter quests with German equivalents in the quest catalog (stretch / read / tidy desk / guild intro), matching the existing tone.
- Review concrete quest "todos" (task wording) across the catalog for usefulness — the user's actual gripe was task content, not titles. `"Burpee Bestrafung"` deliberately kept as-is.

### Quest Board flooded with hundreds of open quests (2026-07-13)
- **[FIXED]** Even after companion quests were excluded, the Quest Board still showed hundreds of open quests. Root cause in the backend per-player quest builder (`routes/quests.js`): when a player's visible pool was momentarily empty (e.g. right after the daily reset, before `GET /api/quests/pool` regenerates it), the fallback returned **every** open player quest (`visibleIds.size > 0 ? filtered : openPlayer`). Combined with accumulated untracked generated quests, this dumped the whole backlog onto the board and defeated the ~11-quest pool cap. **Fix:** the empty-pool fallback now caps to ~11 templated quests (non-templated starter/hand-created quests are always shown); the pool filter is applied unconditionally. Added a one-time boot cleanup (`server.js` `purgeOrphanGeneratedQuests`) that removes open, templated, system-generated quests no player's pool still references (never touches hand-created/NPC/campaign/completed quests).

### Companion quest flood — Quest Board (2026-07-13)
- **[FIXED]** Quest Board OPEN list flooded with dozens of duplicate companion quests ("Im Rudel ruhen", "Auf der Jagd", …). Multi-part root cause + fix:
  - Companion quests are created (`components/QuestPanels.tsx` `createDobbieQuest`) with `type: "personal"`, `rarity: "companion"`, `createdBy: "companion"`. The Quest Board OPEN filter (`app/page.tsx`) only filtered by `type`, so `"personal"` passed — and the level filter even force-included `q.rarity === "companion"`. **Fix:** OPEN filter now excludes `isCompanionQuest(q)` (mirrors the in-progress filter); removed the companion force-include.
  - Backend player-quest builder (`routes/quests.js`) pushed companion quests into `openPlayer`; since they lack a `templateId` they bypassed the per-player pool cap via `|| !q.templateId`. **Fix:** companion quests are skipped in the open branch.
  - `POST /api/quest` deduped only `createdBy === 'dobbie'` (and only "today"), but the widget sends `createdBy: 'companion'` → every accept/daily-reset created a new duplicate. **Fix:** dedup now covers all companion quests (by title + active status + claimant), no day restriction.
  - Existing accumulated duplicates are collapsed by a one-time boot cleanup (`server.js` `dedupeCompanionQuests`) — one instance per (owner + title), preferring in-progress; never merges across players.
  - Invariant documented in `CLAUDE.md` (Code Style & Conventions) to stop this recurring.

### UI/UX visual pass (2026-06-23)
- **[FIXED]** Views had inconsistent widths. Root cause: hard internal width caps — `TavernView` rest history (`maxWidth:600`) and `WandererRest` (5× `maxWidth:1000`). Removed so all views fill the `<main>` `max-w-7xl` (1280px) width. Audited all 18 views; only these two had hard caps (others use full-width grids/flex).
- **[FIXED]** Inconsistent root vertical rhythm (`space-y-4/5/6` mixed) and two views (`SocialView`, `ChallengesView`) missing the mandatory `tab-content-enter` view-transition animation. Standardized roots to `space-y-5` + added the entrance animation.
- **[FIXED]** Character view crashed with `t.startsWith is not a function`. `CharacterView.getTier()` called `.startsWith()` directly on equipment slot values, which at runtime can be `GearInstance` objects (`{ templateId, ... }`), not plain id strings. Now resolves the template id from string-or-object before tier checks.
- **[FIXED]** Currency bar glow rendered as a ring around the square icon box (`box-shadow` + `border-radius:50%`). Switched `.currency-infused` to alpha-aware `drop-shadow` so the glow traces the icon silhouette (`app/globals.css`).
- **[FIXED]** Currency numbers vertically offset / "below-right" of icons — icon + number sat inside one inline `gt-ref` span (baseline-aligned). Wrapped them in an `inline-flex items-center` group (`app/page.tsx` currency bar).
- **[FIXED]** Footer barely legible over the bright Guild Hall background — added a translucent blurred backdrop pill; anchored footer to the bottom via flex-column + `mt-auto` so it no longer floats mid-screen.
- **[NEEDS LIVE REPRO]** "Can scroll ~a mile below the page." Not reproducible by static analysis: root is `min-h-screen`, post-`<main>` overlays are `position:fixed`/conditional, GuildHallBackground + FloorAmbientParticles are `fixed inset-0`, Quest Journal list is conditionally mounted. Suspect: a specific `dashView` rendering a tall element, or `content-visibility:auto` (`.cv-auto`, `contain-intrinsic-size: auto 140px`) over-reserving placeholder height on a long quest list. **Next step:** in DevTools find the element extending `document.body.scrollHeight`, then bound it. The flex-column + `mt-auto` change already anchors the footer regardless.

## Open Features

### Near-Term
- ForgeView: BoE badge, gem-cut/gem-merge recipe display
- ~~Mail system: decide keep or remove~~ → Kept. Mail tab added to Social navigation (was hidden/unreachable). Full UI already existed.

### Resolved (from previous backlog)
- ~~Character Screen: Background image clipped at top~~ → Fixed (backgroundSize: cover)
- ~~CharacterView: Ring slot~~ → Already exists in EQUIP_SLOT_LABELS
- ~~Profession synergy hints~~ → professions.json has synergies field, ForgeView shows them

### Medium-Term (Phase 2)
- Season System v2 — Battle Pass expanded rewards
- Campaign v2 — The Observatory quest chains
- Starweaver Special Quests — LLM Chat integration
- The Arcanum — Class system expansion
- Custom Character Avatar
- Coop-Rituals with invitation system
- User-Generated Quests (suggest system exists, full UGC pending)

## Tech Debt

- [x] **REMOVE PRIORITY SYSTEM** — Completed 2026-04-02. ~139 refs in 30+ files replaced with rarity.
- [ ] page.tsx monolith (~3640 lines) — extract into feature modules
- [ ] Missing JSON Schema validation for template files

## Completed (archived)

> 20 bugs, 7 quick wins, 34 features, 8 tech debt items completed in Sessions 1-40+.
> See AUDIT_REPORT.md for full fix history.
