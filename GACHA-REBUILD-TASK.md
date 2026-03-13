# Gacha Pull Modal & Animation Rebuild

## Context
The BannerPullModal and GachaPull animation were redesigned but lost in a git reset. 
The BannerPreviewCard (lines 91-285 in GachaView.tsx) already has floating runes + fog effects.
These need to be ported to the BannerPullModal + several other changes.

## Task 1: BannerPullModal Redesign (GachaView.tsx, function BannerPullModal ~line 286)

### 1a. Add Floating Runes (Standard Banner = Thalos)
- Copy the rune rendering from BannerPreviewCard (runeSymbols, runePositions)
- Runes should float BEYOND the modal edges (overflow: visible on parent)
- Use CSS animations: gacha-rune-up, gacha-rune-up-left, gacha-rune-up-right, gacha-rune-drift (already in globals.css or need to be added)
- Runes fade out as they drift away (opacity transition)
- Color: #818cf8 (blue, matching Thalos/standard)

### 1b. Add Fog/Nebula Shimmer on Pull Buttons  
- NOT a left-right sweep shimmer. Use SVG feTurbulence fog (like Nyxara banner preview)
- The fog animates organically, like mist
- On hover: fog animation speeds up (shorter animation-duration)
- Fog opacity: ~0.45 for layer 1, ~0.3 for layer 2
- Buttons need position: relative, overflow: hidden
- Button text needs position: relative, zIndex: 10 (above fog)
- Fog SVGs need zIndex: -1 or lower z-index

### 1c. Button Styling
- Standard banner buttons: BLUE (#818cf8), NOT purple
- Featured banner buttons: purple (#a78bfa) 
- 10× button slightly darker than 1×
- Button text layout:
  - Top line: "1× Arcane Pull" (bold, larger)
  - Bottom line: cost "160 Rune Shards" (smaller, not bold, slightly dimmer)
- Scale 1.05x on hover + stronger glow
- Scale 0.95x on click (spring press effect)
- Stronger box-shadow when user has enough currency

### 1d. Move Pity + Drop Rates to Info Popup
- Remove the inline pity counters, drop rate badges, and "X pulls until legendary" from the modal body
- Add a "?" button (like the one in the Vault header) that opens a click-toggle info panel
- The info panel shows: pity counter, epic pity, soft pity status, guaranteed featured, all drop rates, pulls until legendary
- Click to open, click to close (NOT hover)

### 1e. Modal overflow: visible
- The modal wrapper needs overflow: visible (not overflow-y-auto or max-h-[85vh])
- This allows runes to float beyond the edges

## Task 2: GachaPull.tsx Animation Rebuild

### 2a. Timing — ALL rarities same duration (no timing spoiler)
- ALL rarities: 7 seconds total (charge → flash → reveal)
- Charge phase: ~5.5 seconds
- Flash: ~0.3 seconds  
- Reveal: ~1.2 seconds

### 2b. Charge starts NEUTRAL (no rarity color spoiler)
- Charge animation starts white-blue (#e0e7ff → #818cf8)
- NO rarity color visible during charge
- Only at the FLASH moment does the rarity color appear
- 12 energy particles flowing inward during charge

### 2c. "Nehmen" button (not "Weiter")
- The button after item reveal says "Nehmen" not "Weiter"
- Both SinglePullReveal and MultiPullReveal
- Clicking "Nehmen" triggers a toast notification
- Button should have a gentle pulse animation (gacha-weiter-pulse keyframe)

### 2d. ModalPortal for centering
- GachaPull currently uses fixed inset-0 without portal
- Wrap in ModalPortal (createPortal to document.body) like other modals
- This ensures proper viewport centering

### 2e. useMemo for particles
- All Math.random() calls for particle positions must use useMemo
- No random values computed during render

### 2f. 10× Pull: Honkai Star Rail style
- Sequential single-item reveals (not all at once)
- Fisher-Yates shuffle for random order (not sort with Math.random)
- 8 second charge animation
- Flash reveals BEST rarity color from the batch
- Each "Nehmen" click shows next item
- After last item: show summary

### 2g. Item reveal window
- Bigger overall (the card, the text, the item icon)
- Rarity label prominently displayed on the card
- Rarity-colored border glow on the card

## Task 3: Vault Header Icon
- Line ~616 in GachaView.tsx: `<span style={{ fontSize: 24 }}>x</span> The Vault of Fate`
- Replace "x" with: `<img src="/images/icons/vault-of-fate.png" style={{ width: 28, height: 28, imageRendering: "auto" }} />`
- The icon file should already exist, if not use null/empty

## Task 4: Pull History & Item Pool Windows
- Make windows wider (max-w-lg → max-w-xl or max-w-2xl)  
- Add rounded boxes/cards around each item in the list
- Better spacing, not cramped

## Technical Notes
- globals.css already has: fogDrift1, fogDrift2, rune-drift-0/1/2, banner-glow-pulse keyframes
- May need to add: gacha-rune-up, gacha-rune-up-left, gacha-rune-up-right, gacha-rune-drift keyframes
- gacha-charge-neutral, gacha-flash, gacha-particle, gacha-energy-in, gacha-reveal-card, gacha-legendary-glow, gacha-weiter-pulse, gacha-card-flip keyframes needed in GachaPull
- ModalPortal component exists at components/ModalPortal.tsx
- getCurrencyInfo function exists in GachaView.tsx
- BANNER_PORTRAITS mapping exists at top of GachaView.tsx
- Cannot have duplicate style= attributes on JSX elements
- Button text needs position: relative; zIndex: 10; fog SVGs need zIndex lower
