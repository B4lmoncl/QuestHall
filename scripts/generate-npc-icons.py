#!/usr/bin/env python3
"""Generate NPC reward item icons via PixelLab API v2"""

import requests, base64, time, os, json, struct, zlib

API_KEY = "84b7f1aa-76f8-4f06-854c-9e8304e7a81b"
API_URL = "https://api.pixellab.ai/v2/generate-image-v2"
JOBS_URL = "https://api.pixellab.ai/v2/background-jobs"
OUT_DIR = "/data/agent-dashboard/public/images/icons"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

os.makedirs(OUT_DIR, exist_ok=True)

def rgba_to_png(rgba_data, w, h):
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
    ("npc-ilse-scarf", "16-bit JRPG pixel art, cozy hand-knitted scarf with warm colors red and orange, grandmother style, magical warmth aura, fantasy RPG equipment icon"),
    ("npc-karim-compass", "16-bit JRPG pixel art, ornate golden compass with jeweled cardinal points, merchant treasure, warm golden glow, fantasy RPG equipment icon"),
    ("npc-tanaka-headband", "16-bit JRPG pixel art, martial arts master headband with kanji symbols, white cloth with red sun emblem, discipline aura, fantasy RPG equipment icon"),
    ("npc-mirael-pendant", "16-bit JRPG pixel art, forest witch nature stone pendant with green vines and leaf, druidic magic glow, fantasy RPG equipment icon"),
    ("npc-finnegan-lute", "16-bit JRPG pixel art, ornate silver lute with musical notes floating around it, bard instrument, magical melody glow, fantasy RPG equipment icon"),
    ("npc-tomas-rosary", "16-bit JRPG pixel art, monk prayer beads rosary with soft golden holy light, wooden beads, serene aura, fantasy RPG equipment icon"),
    ("npc-zara-flask", "16-bit JRPG pixel art, alchemist experiment flask with bubbling colorful potion inside, sparks and smoke, magical science, fantasy RPG equipment icon"),
    ("npc-henrik-staff", "16-bit JRPG pixel art, old wanderer walking staff with carved runes and crystal tip, weathered wood, wisdom glow, fantasy RPG equipment icon"),
    ("npc-lumi-lantern", "16-bit JRPG pixel art, magical firefly lantern with glowing green-yellow light inside, delicate glass, whimsical fairy glow, fantasy RPG equipment icon"),
    ("npc-rogar-hammer", "16-bit JRPG pixel art, master blacksmith war hammer with glowing forge runes, heavy iron head, ember sparks, powerful epic weapon, fantasy RPG equipment icon"),
]

def submit_job(item_id, description):
    outfile = os.path.join(OUT_DIR, f"{item_id}.png")
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
    print(f"  ERR: {item_id}: {json.dumps(data)[:150]}")
    return None, outfile

def poll_and_save(job_id, item_id, outfile):
    resp = requests.get(f"{JOBS_URL}/{job_id}", headers=HEADERS)
    data = resp.json()
    status = data.get("status", "")
    if status == "completed":
        lr = data.get("last_response", {})
        images = lr.get("images", [])
        if images:
            img = images[0]
            raw = base64.b64decode(img["base64"])
            w, h = img.get("width", 128), img.get("height", 128)
            with open(outfile, "wb") as f:
                f.write(rgba_to_png(raw, w, h))
            return "done"
        return "failed"
    elif status == "failed":
        return "failed"
    return "pending"

todo = [(iid, desc) for iid, desc in ITEMS 
        if not (os.path.exists(os.path.join(OUT_DIR, f"{iid}.png")) 
                and os.path.getsize(os.path.join(OUT_DIR, f"{iid}.png")) > 500)]
print(f"Generating {len(todo)} NPC item icons...\n")

completed = 0
batch = todo[:8]
active = []
for item_id, desc in batch:
    job_id, outfile = submit_job(item_id, desc)
    if job_id:
        active.append((job_id, item_id, outfile))
        print(f"  → {item_id}")
    time.sleep(0.5)

# Remaining
remaining = todo[8:]

start = time.time()
while active and (time.time() - start) < 180:
    time.sleep(6)
    still = []
    for job_id, item_id, outfile in active:
        r = poll_and_save(job_id, item_id, outfile)
        if r == "done":
            completed += 1
            print(f"  ✅ {item_id} ({completed}/{len(todo)})")
            # Submit next from remaining
            if remaining:
                next_id, next_desc = remaining.pop(0)
                jid, of = submit_job(next_id, next_desc)
                if jid:
                    still.append((jid, next_id, of))
                    print(f"  → {next_id}")
        elif r == "failed":
            print(f"  ❌ {item_id}")
        else:
            still.append((job_id, item_id, outfile))
    active = still

print(f"\nDONE: {completed}/{len(todo)} NPC icons generated")
