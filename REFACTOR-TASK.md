# Refactor Task: Eliminate Redundant Data Sources

## Problem
Data duplicated across multiple files causes icon: "x" placeholders, stale data, and broken features.

## Task 1: Shop Items → Single Source (shopItems.json)
Shop items exist in 4 places. Make shopItems.json the ONLY source.

1. `routes/shop.js` lines ~10-25: Has hardcoded SHOP_ITEMS and GEAR_TIERS arrays with icon: 'x'. DELETE these arrays. Instead: `const { state } = require('../lib/state');` then use `state.shopData.items` and `state.shopData.gearTiers`.
2. `lib/state.js`: Has SHOP_ITEMS and GEAR_TIERS constants (~line 160-175). DELETE those. Add a loadShopData() that reads shopItems.json into state.shopData = { items: [...], gearTiers: [...] }. Call it during init.
3. `components/ShopModal.tsx` line ~20: Has hardcoded ITEMS array. DELETE. Fetch via API or import the JSON.
4. `public/data/shopItems.json`: Ensure icons are correct paths:
   - gaming_1h → /images/icons/shop-gaming.png
   - snack_break → /images/icons/shop-snack.png  
   - day_off → /images/icons/shop-dayoff.png
   - movie_night → /images/icons/shop-movie.png
   - sleep_in → /images/icons/shop-sleep.png
   - worn → /images/icons/tools-worn.png
   - sturdy → /images/icons/tools-sturdy.png
   - masterwork → /images/icons/tools-masterwork.png
   - legendary → /images/icons/tools-legendary.png
   - mythic → /images/icons/tools-mythic.png

Also update routes/shop.js PERSONAL_QUEST_TEMPLATES and CONSUMABLE_RECIPES - change their icon: 'x' to icon: null.

## Task 2: Achievements → Single Source (achievementTemplates.json)
1. `public/data/achievements.json` has 34 entries ALL with icon: "x". DELETE this file.
2. `public/data/achievementTemplates.json` is the primary source. Update ALL icons:
   first_quest→/images/icons/ach-first-quest.png, apprentice→/images/icons/ach-apprentice.png, knight→/images/icons/ach-knight.png, legend→/images/icons/ach-legend.png, week_warrior→/images/icons/ach-week-warrior.png, monthly_champ→/images/icons/ach-monthly-champ.png, lightning→/images/icons/ach-lightning.png, all_trades→/images/icons/ach-all-trades.png, boss_slayer→/images/icons/ach-boss-slayer.png, ember_sprite→/images/icons/ach-ember-sprite.png, lore_owl→/images/icons/ach-lore-owl.png, gear_golem→/images/icons/ach-gear-golem.png, challenge_coder→/images/icons/ach-code-sprinter.png, challenge_learner→/images/icons/ach-marathon-learner.png, night_owl→/images/icons/ach-night-owl.png, speed_runner→/images/icons/ach-speed-runner.png, social_butterfly→/images/icons/ach-social-butterfly.png, scholar→/images/icons/ach-scholar.png, gym_rat→/images/icons/ach-gym-rat.png, chain_master→/images/icons/ach-chain-master.png, campaign_victor→/images/icons/ach-campaign-victor.png, npc_whisperer→/images/icons/ach-npc-whisperer.png, forge_novice→/images/icons/ach-forge-novice.png, arena_first→/images/icons/ach-arena-debut.png, scholar_first→/images/icons/ach-first-scroll.png, ten_quests→/images/icons/ach-ten-quests.png, fifty_quests→/images/icons/ach-fifty-quests.png, coop_hero→/images/icons/ach-coop-hero.png, early_bird→/images/icons/ach-early-bird.png, forbidden_code→/images/icons/ach-forbidden-code.png. Others: null.
3. grep for "achievements.json" in all JS/TS files and redirect to achievementTemplates.json.

## Task 3: Merge QuestPanels.tsx + QuestNpcPanels.tsx
Nearly identical files. Merge into one component with props for differences.

## Task 4: Clean questCatalog.json
Remove all icon: "x" fields from templates (the field is unused).

## Task 5: Clean classes.json  
Replace icon: "xx"/"x" with null.

## Task 6: Delete templates/ directory
If nothing imports from templates/, delete the entire directory (it has stale copies of public/data/ files).

## Task 7: Full placeholder audit
grep -rn for icon.*"x"\|icon.*'x' in all .js/.ts/.tsx/.json files (excluding node_modules, .next).
Replace with correct icon path or null. Available icons are in public/images/icons/.

## Task 8: Verify flavor text pipeline
- questCatalog.json uses "flavor" field
- lib/rotation.js copies flavor to generated quests
- Frontend fallback: q.flavorText || (q as any).flavor

## CONSTRAINTS
- Do NOT change Docker/deployment setup
- Do NOT change API endpoint formats
- Do NOT touch auth logic
- Do NOT delete .png files
- Commit after each major task
- Run `npm run build` to verify after all changes
