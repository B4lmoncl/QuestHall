# Quest Hall Bug Fix Batch — 2026-03-14

## IMPORTANT: Work in THIS repo. All changes here, then we push to GitHub.

## Reference Screenshots
The user provided screenshots showing the issues. Key reference images for the DESIRED state are saved at:
- Pull screen reference: The old pull screen had large emoji icons in cards with rarity-colored glow borders, NEU badges, DUP counters, and a rarity summary. We want the same layout but with pixel art icons instead of emojis.

---

## Block 1: Code Fixes (Placeholders, Rendering, Layout)

### 1. Streak Milestone Badges — `lib/state.js`
Replace all `badge: 'x'` in STREAK_MILESTONES with real text:
```js
{ days: 7,   badge: '🥉', label: 'Bronze', ... }
{ days: 14,  badge: '📅', label: '2-Wochen', ... }
{ days: 21,  badge: '🥈', label: 'Silber', ... }
{ days: 30,  badge: '🗓️', label: 'Monat', ... }
{ days: 60,  badge: '🥇', label: 'Gold', ... }
{ days: 90,  badge: '💪', label: 'Unerschütterlich', ... }
{ days: 180, badge: '💎', label: 'Diamond', ... }
{ days: 365, badge: '⭐', label: 'Legendary', ... }
```
WAIT — we are replacing emojis with pixel art everywhere. So use TEXT labels instead:
```js
{ days: 7,   badge: 'Bronze', ... }
{ days: 14,  badge: '2W', ... }
{ days: 21,  badge: 'Silber', ... }
{ days: 30,  badge: '1M', ... }
{ days: 60,  badge: 'Gold', ... }
{ days: 90,  badge: 'Titan', ... }
{ days: 180, badge: 'Diamond', ... }
{ days: 365, badge: 'Legend', ... }
```

### 2. Equipment Slot Emojis — `lib/state.js`
Replace `SLOT_EMOJI` values from `'x'` to text labels:
```js
const SLOT_EMOJI = { weapon: 'Weapon', shield: 'Shield', helm: 'Helm', armor: 'Armor', amulet: 'Amulet', boots: 'Boots' };
```

### 3. Ritual Modal — Double Icon
In `app/page.tsx`, find the ritual detail/popout modal. There's a duplicated icon in the header. Remove the duplicate.

### 4. Vow Modal Icons — Bigger + Not Pixelated  
In the Vow modal section, find icon `<img>` tags and:
- Double their width/height (e.g. 16→32, 24→48)
- Change `imageRendering: "pixelated"` to `imageRendering: "auto"`

### 5. Proving Grounds — Achievement Icon Paths Shown as Text
The achievements section is rendering the file PATH string (like `/images/icons/ach-first-quest.png`) as text instead of rendering it as an `<img>` tag. Find where achievement icons are rendered and fix: if the value looks like a path (starts with `/`), render as `<img src={value}>` instead of text.

### 6. Proving Grounds — "L" Fallback + "x Dobbie"
- The character portrait shows "L" (first letter fallback) — check if portrait URL is being passed correctly
- "x Dobbie" — find "x" placeholder near Dobbie companion display and remove or replace with proper label

### 7. Character Portrait — Not Pixelated
Find the main player portrait `<img>` at the top of the page and change `imageRendering: "pixelated"` to `imageRendering: "auto"` or `"crisp-edges"`. Portraits should look smooth, not blocky.

### 8. Nav Bar — Restore Pixel Art Icons
The navigation bar tabs used to have pixel art icons. Check if `nav-*.png` files exist in `public/images/icons/` (they should: nav-honors.png etc.). Find the nav rendering and ensure icons are displayed via `<img>` tags. Also fix "x Season" placeholder.

### 9. Bazaar — Gold Icons
- Make gold icons on shop buttons bigger (at least 20x20, preferably 24x24)
- Change `imageRendering: "pixelated"` to `imageRendering: "auto"` for gold icons everywhere

### 10. Bazaar — Shop Item Images Not Loading
Check if shop items reference icon paths that don't exist. The files `shop-dayoff.png`, `shop-gaming.png`, `shop-movie.png`, `shop-sleep.png`, `shop-snack.png` exist in `public/images/icons/`. Make sure the frontend references the correct paths.

### 11. Gacha Item Pool — "?" Placeholders
In the Vault of Fate item pool popup, items show "?" instead of icons. Find where gacha pool items are rendered and use the item's `icon` or `emoji` field to render an image if available, otherwise show the item name.

### 12. Gacha Pull Screen — Restore Card Layout
The pull result screen should show:
- Cards with large item icons (centered, big)
- Rarity-colored border glow on each card
- "NEU" badge for new items
- DUP counter for duplicates  
- Rarity summary at bottom
- CSS glow/breathing animation on Epic and Legendary cards (pulse effect)
Currently it's just a plain list. Restore the card-based layout.

### 13. Gacha Pull Toasts — Show File Paths as Text
Same bug as proving grounds: toast notifications after gacha pulls show raw file paths instead of rendering icons. Fix to show item name + small icon image.

### 14. Glow + Breathing CSS for Premium Items
Add CSS animation for premium currencies (stardust, rune shards) and rare+ gacha items:
```css
@keyframes premium-breathe {
  0%, 100% { filter: drop-shadow(0 0 4px var(--glow-color)); opacity: 1; }
  50% { filter: drop-shadow(0 0 8px var(--glow-color)); opacity: 0.9; }
}
```
Apply to stardust (purple glow) and rune shards (blue glow) icons everywhere they appear.
Apply stronger version to Epic/Legendary gacha cards.

### 15. Quest Flavor Text Fallbacks
8 quests have NULL flavorText and show a generic fallback. In the quest catalog (`data/questCatalog.json` or wherever templates are), add unique flavorText to templates that are missing it. The quests missing flavor: Frostprüfung, Morgenlauf, Wandergefährte, Kein Aufschub, Digitale Stille, Der Alchemistenkessel, Drei Sterne, Gedächtnispalast.

---

## AFTER completing all fixes:
1. Run `npm run build` to verify no build errors
2. Do NOT deploy — just commit and we'll push to GitHub
