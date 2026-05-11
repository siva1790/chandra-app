/**
 * Adds transparent rounded corners to the PWA share icons.
 * Fixes white-corner bleed when sharing on WhatsApp Android.
 *
 * Uses the `canvas` package that's already in your dependencies.
 *
 * Run once from the project root:
 *   node fix-icons.js
 *
 * Then commit:
 *   git add public/icons/icon-512.png public/icons/icon-192.png
 *   git commit -m "Fix: transparent rounded corners on share icons"
 *   git push
 */

import { createCanvas, loadImage } from 'canvas';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function addRoundedCorners(filename, radiusRatio = 0.18) {
  const filePath = path.join(__dirname, 'public', 'icons', filename);
  const img = await loadImage(readFileSync(filePath));

  const { width: w, height: h } = img;
  const r = Math.round(Math.min(w, h) * radiusRatio);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Clear to fully transparent
  ctx.clearRect(0, 0, w, h);

  // Clip to a rounded rectangle, then draw the image inside it
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0, w, r, r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h, w - r, h, r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h, 0, h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, 0, 0, w, h);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(filePath, buffer);
  console.log(`✓  ${filename}  (${w}×${h}, corner radius ${r}px)`);
}

await addRoundedCorners('icon-512.png');
await addRoundedCorners('icon-192.png');
console.log('\nDone! Run: git add public/icons && git commit -m "Fix: transparent rounded corners" && git push');
