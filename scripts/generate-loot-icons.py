#!/usr/bin/env python3
"""Generate loot item icons via PixelLab API v2 — RGBA bytes → PNG"""

import requests
import base64
import time
import os
import json
import struct
import zlib

API_KEY = "84b7f1aa-76f8-4f06-854c-9e8304e7a81b"
API_URL = "https://api.pixellab.ai/v2/generate-image-v2"
JOBS_URL = "https://api.pixellab.ai/v2/background-jobs"
OUT_DIR = "/data/agent-dashboard/public/images/icons"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
MAX_CONCURRENT = 6  # Conservative to avoid hitting 10 limit

os.makedirs(OUT_DIR, exist_ok=True)

def rgba_to_png(rgba_data, w, h):
    """Convert raw RGBA bytes to PNG"""
    def make_chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    raw_rows = b''
    for y in range(h):
        raw_rows += b'\x00' + rgba_data[y*w*4:(y+1)*w*4]
    idat = zlib.compress(raw_rows)
    png = b'\x89PNG\r\n\x1a\n'
    png += make_chunk(b'IHDR', ihdr)
    png += make_chunk(b'IDAT', idat)
    png += make_chunk(b'IEND', b'')
    return png

ITEMS = [
    ("gold-small", "16-bit JRPG pixel art, small leather pouch with gold coins spilling out, warm golden glow, fantasy RPG item icon"),
    ("xp-small", "16-bit JRPG pixel art, small glowing purple experience crystal, magical sparkles, fantasy RPG item icon"),
    ("companion-snack", "16-bit JRPG pixel art, small treat bone snack for a pet companion, wrapped in cloth, fantasy RPG item icon"),
    ("repair-kit-s", "16-bit JRPG pixel art, small repair kit with tiny hammer and nails, leather wrap, fantasy RPG item icon"),
    ("bandage", "16-bit JRPG pixel art, rolled white bandage with red cross mark, healing item, fantasy RPG item icon"),
    ("apple", "16-bit JRPG pixel art, fresh shiny red apple with green leaf, food item, fantasy RPG item icon"),
    ("gold-medium", "16-bit JRPG pixel art, wooden treasure chest half-open with gold coins visible, green uncommon glow, fantasy RPG item icon"),
    ("xp-scroll", "16-bit JRPG pixel art, glowing parchment scroll with purple magical runes, tied with ribbon, fantasy RPG item icon"),
    ("companion-toy", "16-bit JRPG pixel art, colorful plush toy ball for a pet companion, squeaky toy, fantasy RPG item icon"),
    ("streak-shield", "16-bit JRPG pixel art, small magical shield with flame emblem, protective barrier glow, blue-green aura, fantasy RPG item icon"),
    ("lucky-coin", "16-bit JRPG pixel art, shiny golden coin with four-leaf clover embossed, sparkle effect, fantasy RPG item icon"),
    ("training-manual", "16-bit JRPG pixel art, thick leather-bound training book with sword emblem on cover, fantasy RPG item icon"),
    ("gold-large", "16-bit JRPG pixel art, ornate treasure chest overflowing with gold and jewels, blue rare glow, fantasy RPG item icon"),
    ("gear-random", "16-bit JRPG pixel art, mysterious wrapped equipment bundle with question mark seal, blue magical aura, fantasy RPG item icon"),
    ("companion-egg", "16-bit JRPG pixel art, mysterious speckled egg with magical cracks glowing from inside, sitting on nest, fantasy RPG item icon"),
    ("streak-shield-x3", "16-bit JRPG pixel art, triple-layered magical shield barrier, golden legendary glow, powerful protection spell, fantasy RPG item icon"),
    ("sakura-petal", "16-bit JRPG pixel art, eternal cherry blossom petal glowing with soft pink magical light, floating, fantasy RPG item icon"),
    ("forge-ember", "16-bit JRPG pixel art, glowing orange-red ember from a magical forge, sparks and heat waves, fantasy RPG item icon"),
    ("gold-huge", "16-bit JRPG pixel art, massive dragon treasure hoard pile of gold and gems, purple epic glow, fantasy RPG item icon"),
    ("gear-upgrade", "16-bit JRPG pixel art, ornate blacksmith master hammer with glowing runes, anvil sparks, purple epic aura, fantasy RPG item icon"),
    ("second-chance", "16-bit JRPG pixel art, mystical stone with hourglass symbol, time reversal magic swirl, purple glow, fantasy RPG item icon"),
    ("xp-mega", "16-bit JRPG pixel art, large arcane focus crystal pulsing with concentrated purple energy, floating, fantasy RPG item icon"),
    ("dragon-scale", "16-bit JRPG pixel art, iridescent dragon scale armor piece, shimmering purple and green, epic quality, fantasy RPG item icon"),
    ("time-crystal", "16-bit JRPG pixel art, translucent crystal with frozen clock hands inside, time magic aura, blue-purple glow, fantasy RPG item icon"),
    ("named-weapon", "16-bit JRPG pixel art, legendary ornate sword with golden blade and dawn light rays, morning glow aura, fantasy RPG item icon"),
    ("guild-blessing", "16-bit JRPG pixel art, radiant golden guild seal with divine light beams, angelic blessing aura, fantasy RPG item icon"),
    ("legendary-title", "16-bit JRPG pixel art, ornate golden crown with four-leaf clover gem, lucky champion title, radiant glow, fantasy RPG item icon"),
    ("world-key", "16-bit JRPG pixel art, ancient ornate skeleton key with portal energy swirling, dimensional rift, legendary golden glow, fantasy RPG item icon"),
    ("phoenix-feather", "16-bit JRPG pixel art, magnificent burning phoenix feather with orange-red flames and rebirth energy, legendary golden aura, fantasy RPG item icon"),
]

def submit_job(item_id, description):
    outfile = os.path.join(OUT_DIR, f"loot-{item_id}.png")
    if os.path.exists(outfile) and os.path.getsize(outfile) > 500:
        return None, outfile
    resp = requests.post(API_URL, headers=HEADERS, json={
        "description": description,
        "image_size": {"width": 128, "height": 128},
        "no_background": True
    })
    data = resp.json()
    job_id = data.get("background_job_id")
    if job_id:
        return job_id, outfile
    else:
        print(f"  ERR submit {item_id}: {json.dumps(data)[:150]}")
        return None, outfile

def poll_and_save(job_id, item_id, outfile):
    resp = requests.get(f"{JOBS_URL}/{job_id}", headers=HEADERS)
    data = resp.json()
    status = data.get("status", "")
    if status == "completed":
        # Image data is in last_response.images[0]
        lr = data.get("last_response", {})
        images = lr.get("images", [])
        if images:
            img = images[0]
            raw = base64.b64decode(img["base64"])
            w = img.get("width", 128)
            h = img.get("height", 128)
            png = rgba_to_png(raw, w, h)
            with open(outfile, "wb") as f:
                f.write(png)
            return "done"
        print(f"  ❌ {item_id} — no images in last_response")
        return "failed"
    elif status == "failed":
        print(f"  ❌ {item_id} FAILED: {data.get('error','?')}")
        return "failed"
    return "pending"

# Filter already existing
todo = [(iid, desc) for iid, desc in ITEMS 
        if not (os.path.exists(os.path.join(OUT_DIR, f"loot-{iid}.png")) 
                and os.path.getsize(os.path.join(OUT_DIR, f"loot-{iid}.png")) > 500)]

skipped = len(ITEMS) - len(todo)
if skipped:
    print(f"Skipping {skipped} existing icons")

completed = 0
failed = 0

while todo:
    batch = todo[:MAX_CONCURRENT]
    todo = todo[MAX_CONCURRENT:]
    
    print(f"\nBatch {len(batch)} items ({len(todo)} remaining)...")
    active = []
    for item_id, desc in batch:
        job_id, outfile = submit_job(item_id, desc)
        if job_id:
            active.append((job_id, item_id, outfile))
            print(f"  → {item_id}")
        time.sleep(0.5)
    
    # Poll with longer timeout (60s per item should be plenty)
    start = time.time()
    while active and (time.time() - start) < 180:
        time.sleep(6)
        still_active = []
        for job_id, item_id, outfile in active:
            result = poll_and_save(job_id, item_id, outfile)
            if result == "done":
                completed += 1
                print(f"  ✅ {item_id} ({completed}/{len(ITEMS)-skipped})")
            elif result == "failed":
                failed += 1
            else:
                still_active.append((job_id, item_id, outfile))
        active = still_active
    
    if active:
        print(f"  ⚠️ {len(active)} timed out")
        failed += len(active)
    
    # Small pause between batches
    if todo:
        time.sleep(2)

print(f"\n{'='*40}")
print(f"DONE: {completed} new + {skipped} existing = {completed+skipped} total")
print(f"Failed: {failed}")
