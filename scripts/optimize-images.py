import sys, pathlib
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ASSETS = pathlib.Path("src/assets")

RULES = [
    ("hero-hub-v2.jpg",      1920, 82),
    ("hero-banner.jpg",      1920, 82),
    ("innovation-bg.jpg",    1920, 82),
    ("hospital-interior.jpg",1200, 80),
    ("diagnostics.jpg",      1200, 80),
    ("team-photo.jpg",       1200, 80),
    ("iwosan_alaro.jpg",     1200, 80),
    ("iwosan_logo.jpg",       400, 85),
    ("adebiyi.jpg",           400, 82),
    ("mukoro.jpg",            400, 82),
    ("hub-logo.png",          400, 90),
    ("iwosan-logo.png",       400, 90),
    ("iwosan_icon.png",       128, 90),
    ("logos/lagoon-logo.png", 400, 90),
    ("logos/iaso-logo.png",   400, 90),
    ("logos/paelon-logo.png", 400, 90),
]

total_before = 0
total_after  = 0

for rel, max_w, quality in RULES:
    src = ASSETS / rel
    if not src.exists():
        print(f"  SKIP  {rel}")
        continue

    dst = src.with_suffix(".webp")
    before = src.stat().st_size

    with Image.open(src) as img:
        if img.mode in ("RGBA", "LA"):
            img = img.convert("RGBA")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)

        img.save(dst, "WEBP", quality=quality, method=6)

    after = dst.stat().st_size
    saving = (1 - after / before) * 100
    total_before += before
    total_after  += after
    print(f"  {src.name:<30}  {before/1024:>6.0f}KB -> {after/1024:>5.0f}KB  ({saving:.0f}% saved)")

print(f"\nTotal: {total_before/1024:.0f}KB -> {total_after/1024:.0f}KB  ({(1-total_after/total_before)*100:.0f}% saved)")
