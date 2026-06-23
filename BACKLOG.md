# Quest Hall — Backlog
<!-- Last updated: 2026-04-02 — cleaned up after Autopilot Audit -->

## Open Bugs

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
