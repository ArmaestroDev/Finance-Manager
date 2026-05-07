"""
One-shot helper: convert the gear+dollar logo JPG to a transparent-background
PNG and a square favicon. Run from the project root once; outputs land in
assets/images/.
"""
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\marma\Downloads\logo.jpg")
OUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "images"
LOGO_OUT = OUT_DIR / "logo.png"
FAVICON_OUT = OUT_DIR / "favicon.png"

# Pixels brighter than this in all channels become transparent. The source is
# a clean white background, so a generous threshold is safe and preserves the
# dark navy ink without halos.
WHITE_THRESHOLD = 240

img = Image.open(SRC).convert("RGBA")
pixels = img.load()
w, h = img.size
for y in range(h):
    for x in range(w):
        r, g, b, _ = pixels[x, y]
        if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
            pixels[x, y] = (0, 0, 0, 0)

# Tight crop around opaque pixels.
bbox = img.getbbox()
cropped = img.crop(bbox)

# Pad to square so the favicon renders without distortion.
side = max(cropped.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(cropped, ((side - cropped.size[0]) // 2, (side - cropped.size[1]) // 2))

# Logo: keep generous resolution for sharp display at any UI size.
logo = square.resize((512, 512), Image.LANCZOS)
logo.save(LOGO_OUT, "PNG")

# Favicon: 64x64 is plenty for browser tabs. Recolor opaque pixels to white so
# the icon stays legible in dark-mode browser tabs.
favicon = square.resize((64, 64), Image.LANCZOS)
fpx = favicon.load()
fw, fh = favicon.size
for y in range(fh):
    for x in range(fw):
        r, g, b, a = fpx[x, y]
        if a > 0:
            fpx[x, y] = (255, 255, 255, a)
favicon.save(FAVICON_OUT, "PNG")

print(f"Wrote {LOGO_OUT} ({logo.size})")
print(f"Wrote {FAVICON_OUT} ({favicon.size})")
