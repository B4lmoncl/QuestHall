#!/bin/bash
# Generate loot item icons via PixelLab API
# 128x128, no_background, 16-bit JRPG pixel art style

API_KEY="84b7f1aa-76f8-4f06-854c-9e8304e7a81b"
API_URL="https://api.pixellab.ai/v2/generate-image-v2"
OUT_DIR="/data/agent-dashboard/public/images/icons"
mkdir -p "$OUT_DIR"

generate_icon() {
  local id="$1"
  local desc="$2"
  local outfile="$OUT_DIR/loot-${id}.png"
  
  if [ -f "$outfile" ]; then
    echo "SKIP $id (exists)"
    return
  fi
  
  echo "Generating: $id..."
  
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"description\": \"$desc\",
      \"image_size\": { \"width\": 128, \"height\": 128 },
      \"no_background\": true,
      \"seed\": null
    }")
  
  # Check if it's a background job
  JOB_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('job_id',''))" 2>/dev/null)
  
  if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "" ]; then
    echo "  Job $JOB_ID — polling..."
    for i in $(seq 1 30); do
      sleep 3
      RESULT=$(curl -s -H "Authorization: Bearer $API_KEY" "https://api.pixellab.ai/v2/background-jobs/$JOB_ID")
      STATUS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status',''))" 2>/dev/null)
      if [ "$STATUS" = "completed" ]; then
        echo "$RESULT" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
img = d.get('result',{}).get('images',[{}])[0].get('base64','')
if not img:
    img = d.get('result',{}).get('image',{}).get('base64','')
if img:
    with open('$outfile','wb') as f: f.write(base64.b64decode(img))
    print('  SAVED: $outfile')
else:
    print('  ERROR: no image in result')
    print(json.dumps(d, indent=2)[:500])
"
        break
      elif [ "$STATUS" = "failed" ]; then
        echo "  FAILED: $id"
        echo "$RESULT" | head -c 300
        break
      fi
    done
  else
    # Direct response with image
    echo "$RESPONSE" | python3 -c "
import sys, json, base64
d = json.load(sys.stdin)
img = d.get('data',{}).get('images',[{}])[0].get('base64','')
if not img:
    img = d.get('images',[{}])[0].get('base64','')
if img:
    with open('$outfile','wb') as f: f.write(base64.b64decode(img))
    print('  SAVED: $outfile')
else:
    print('  ERROR: no image data')
    print(json.dumps(d, indent=2)[:500])
" 2>/dev/null
  fi
  
  # Rate limit safety
  sleep 2
}

# === COMMON ===
generate_icon "gold-small" "16-bit JRPG pixel art, small leather pouch with gold coins spilling out, warm golden glow, fantasy RPG item icon"
generate_icon "xp-small" "16-bit JRPG pixel art, small glowing purple experience crystal, magical sparkles, fantasy RPG item icon"
generate_icon "companion-snack" "16-bit JRPG pixel art, small treat bone snack for a pet companion, wrapped in cloth, fantasy RPG item icon"
generate_icon "repair-kit-s" "16-bit JRPG pixel art, small repair kit with tiny hammer and nails, leather wrap, fantasy RPG item icon"
generate_icon "bandage" "16-bit JRPG pixel art, rolled white bandage with red cross mark, healing item, fantasy RPG item icon"
generate_icon "apple" "16-bit JRPG pixel art, fresh shiny red apple with green leaf, food item, fantasy RPG item icon"

# === UNCOMMON ===
generate_icon "gold-medium" "16-bit JRPG pixel art, wooden treasure chest half-open with gold coins visible, green uncommon glow, fantasy RPG item icon"
generate_icon "xp-scroll" "16-bit JRPG pixel art, glowing parchment scroll with purple magical runes, tied with ribbon, fantasy RPG item icon"
generate_icon "companion-toy" "16-bit JRPG pixel art, colorful plush toy ball for a pet companion, squeaky toy, fantasy RPG item icon"
generate_icon "streak-shield" "16-bit JRPG pixel art, small magical shield with flame emblem, protective barrier glow, blue-green aura, fantasy RPG item icon"
generate_icon "lucky-coin" "16-bit JRPG pixel art, shiny golden coin with four-leaf clover embossed, sparkle effect, fantasy RPG item icon"
generate_icon "training-manual" "16-bit JRPG pixel art, thick leather-bound training book with sword emblem on cover, fantasy RPG item icon"

# === RARE ===
generate_icon "gold-large" "16-bit JRPG pixel art, ornate treasure chest overflowing with gold and jewels, blue rare glow, fantasy RPG item icon"
generate_icon "gear-random" "16-bit JRPG pixel art, mysterious wrapped equipment bundle with question mark seal, blue magical aura, fantasy RPG item icon"
generate_icon "companion-egg" "16-bit JRPG pixel art, mysterious speckled egg with magical cracks glowing from inside, sitting on nest, fantasy RPG item icon"
generate_icon "streak-shield-x3" "16-bit JRPG pixel art, triple-layered magical shield barrier, golden legendary glow, powerful protection spell, fantasy RPG item icon"
generate_icon "sakura-petal" "16-bit JRPG pixel art, eternal cherry blossom petal glowing with soft pink magical light, floating, fantasy RPG item icon"
generate_icon "forge-ember" "16-bit JRPG pixel art, glowing orange-red ember from a magical forge, sparks and heat waves, fantasy RPG item icon"

# === EPIC ===
generate_icon "gold-huge" "16-bit JRPG pixel art, massive dragon treasure hoard pile of gold and gems, purple epic glow, fantasy RPG item icon"
generate_icon "gear-upgrade" "16-bit JRPG pixel art, ornate blacksmith master hammer with glowing runes, anvil sparks, purple epic aura, fantasy RPG item icon"
generate_icon "second-chance" "16-bit JRPG pixel art, mystical stone with hourglass symbol, time reversal magic swirl, purple glow, fantasy RPG item icon"
generate_icon "xp-mega" "16-bit JRPG pixel art, large arcane focus crystal pulsing with concentrated purple energy, floating, fantasy RPG item icon"
generate_icon "dragon-scale" "16-bit JRPG pixel art, iridescent dragon scale armor piece, shimmering purple and green, epic quality, fantasy RPG item icon"
generate_icon "time-crystal" "16-bit JRPG pixel art, translucent crystal with frozen clock hands inside, time magic aura, blue-purple glow, fantasy RPG item icon"

# === LEGENDARY ===
generate_icon "named-weapon" "16-bit JRPG pixel art, legendary ornate sword with golden blade and dawn light rays, morning glow aura, fantasy RPG item icon"
generate_icon "guild-blessing" "16-bit JRPG pixel art, radiant golden guild seal with divine light beams, angelic blessing aura, fantasy RPG item icon"
generate_icon "legendary-title" "16-bit JRPG pixel art, ornate golden crown with four-leaf clover gem, lucky champion title, radiant glow, fantasy RPG item icon"
generate_icon "world-key" "16-bit JRPG pixel art, ancient ornate skeleton key with portal energy swirling, dimensional rift, legendary golden glow, fantasy RPG item icon"
generate_icon "phoenix-feather" "16-bit JRPG pixel art, magnificent burning phoenix feather with orange-red flames and rebirth energy, legendary golden aura, fantasy RPG item icon"

echo ""
echo "=== DONE ==="
ls -la "$OUT_DIR"/loot-*.png 2>/dev/null | wc -l
echo "loot icons generated"
