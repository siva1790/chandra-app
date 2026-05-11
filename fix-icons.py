"""
Run this once to add transparent rounded corners to the share icons.
Fixes the white-corner bleed when sharing on WhatsApp.

  pip install Pillow
  python fix-icons.py

Safe to re-run — overwrites the same files in place.
"""

from PIL import Image, ImageDraw
import pathlib

BASE = pathlib.Path(__file__).parent / "public" / "icons"

def add_rounded_corners(filename, radius_ratio=0.18):
    path = BASE / filename
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    radius = int(min(w, h) * radius_ratio)

    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (w - 1, h - 1)], radius=radius, fill=255)

    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    result.paste(img, mask=mask)
    result.save(path, "PNG")
    print(f"✓  {filename}  ({w}×{h}, corner radius {radius}px)")

add_rounded_corners("icon-512.png")
add_rounded_corners("icon-192.png")
print("\nDone! Commit and push to deploy.")
