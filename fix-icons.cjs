/**
 * Adds transparent rounded corners to PWA share icons.
 * Fixes white-corner bleed on WhatsApp Android.
 *
 * Run from the project root:
 *   node fix-icons.cjs
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'public', 'icons');

async function addRoundedCorners(filename, radiusRatio = 0.18) {
  const filePath = path.join(BASE, filename);
  const img = await loadImage(fs.readFileSync(filePath));

  const w = img.width;
  const h = img.height;
  const r = Math.round(Math.min(w, h) * radiusRatio);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Fully transparent canvas
  ctx.clearRect(0, 0, w, h);

  // Rounded-rectangle clip path
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.arcTo(w, 0,   w,     r,   r);
  ctx.lineTo(w, h - r);
  ctx.arcTo(w, h,   w - r, h,   r);
  ctx.lineTo(r, h);
  ctx.arcTo(0, h,   0,     h - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0,   r,     0,   r);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, 0, 0, w, h);

  fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
  console.log(`✓  ${filename}  (${w}×${h}, radius ${r}px)`);
}

(async () => {
  try {
    await addRoundedCorners('icon-512.png');
    await addRoundedCorners('icon-192.png');
    console.log('\nIcons updated. Now run:');
    console.log('  git add -A');
    console.log('  git commit -m "Fix: transparent rounded corners on icons; hide subscribe UI"');
    console.log('  git push');
  } catch (err) {
    console.error('\n✗ Script failed:', err.message);
    console.error('\nIf you see a canvas/module error, run:');
    console.error('  npm install canvas');
    console.error('Then retry: node fix-icons.cjs');
  }
})();
