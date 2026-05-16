import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas, loadImage } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const sourcePath = process.argv[2] || 'C:/Users/Shiv/Downloads/file_000000001cf472089dbd2737a357738c.png'
const brandDir = path.join(root, 'public', 'brand')

const dirs = {
  source: path.join(brandDir, 'source'),
  master: path.join(brandDir, 'master'),
  icons: path.join(brandDir, 'icons'),
  ui: path.join(brandDir, 'ui'),
  social: path.join(brandDir, 'social'),
  preview: path.join(brandDir, 'preview'),
}

const colors = {
  navy: '#071C35',
  navyDeep: '#031226',
  navySurface: '#0B1020',
  gold: '#DDBB6A',
  goldLight: '#F2D483',
  indigo: '#8EA8FF',
  text: '#F5F7FA',
  textSecondary: '#B5BDD1',
}

const ensureDirs = async () => {
  await Promise.all(Object.values(dirs).map((dir) => fs.mkdir(dir, { recursive: true })))
}

const savePng = async (canvas, outputPath) => {
  await fs.writeFile(outputPath, canvas.toBuffer('image/png'))
}

const roundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

const fillBrandBackground = (ctx, w, h) => {
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, colors.navy)
  bg.addColorStop(1, colors.navyDeep)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.58)
  glow.addColorStop(0, 'rgba(221,187,106,0.12)')
  glow.addColorStop(0.45, 'rgba(91,108,255,0.08)')
  glow.addColorStop(1, 'rgba(3,18,38,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
}

const drawSourceContained = (ctx, img, x, y, size, paddingRatio = 0) => {
  const pad = size * paddingRatio
  const drawSize = size - pad * 2
  ctx.drawImage(img, x + pad, y + pad, drawSize, drawSize)
}

const drawCircularSource = (ctx, img, cx, cy, size) => {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size)
  ctx.restore()
}

const drawSimplifiedMark = (ctx, cx, cy, size, options = {}) => {
  const scale = size / 512
  const line = (v) => v * scale
  const dot = options.dot !== false

  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(scale, scale)

  ctx.strokeStyle = colors.goldLight
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.arc(256, 256, 178, -Math.PI * 0.05, Math.PI * 1.5, false)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(221,187,106,0.52)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(256, 256, 106, Math.PI * 0.5, Math.PI * 1.5)
  ctx.stroke()

  const moonGrad = ctx.createRadialGradient(322, 180, 8, 302, 256, 150)
  moonGrad.addColorStop(0, colors.goldLight)
  moonGrad.addColorStop(0.58, colors.gold)
  moonGrad.addColorStop(1, '#A97922')
  ctx.fillStyle = moonGrad
  ctx.beginPath()
  ctx.arc(256, 256, 110, -Math.PI / 2, Math.PI / 2)
  ctx.bezierCurveTo(362, 352, 362, 160, 256, 146)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = colors.goldLight
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(256, 86)
  ctx.lineTo(256, 146)
  ctx.moveTo(256, 366)
  ctx.lineTo(256, 426)
  ctx.stroke()

  if (dot) {
    ctx.fillStyle = colors.goldLight
    ctx.beginPath()
    ctx.arc(426, 212, 23, 0, Math.PI * 2)
    ctx.fill()
  }

  if (options.ticks !== false) {
    ctx.strokeStyle = colors.goldLight
    ctx.lineCap = 'round'
    for (let i = 0; i < 18; i += 1) {
      const angle = (142 + i * 9) * Math.PI / 180
      const inner = i % 5 === 0 ? 139 : 149
      const outer = 166
      ctx.lineWidth = i % 5 === 0 ? 6 : 4
      ctx.beginPath()
      ctx.moveTo(256 + Math.cos(angle) * inner, 256 + Math.sin(angle) * inner)
      ctx.lineTo(256 + Math.cos(angle) * outer, 256 + Math.sin(angle) * outer)
      ctx.stroke()
    }
  }

  ctx.restore()
}

const makeIcon = async (img, outputPath, size, paddingRatio, { simplified = false, radiusRatio = 0 } = {}) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  fillBrandBackground(ctx, size, size)
  if (radiusRatio > 0) {
    ctx.save()
    roundedRect(ctx, 0, 0, size, size, size * radiusRatio)
    ctx.clip()
  }
  if (simplified) {
    drawSimplifiedMark(ctx, size / 2, size / 2, size * (1 - paddingRatio * 2), { ticks: size >= 96 })
  } else {
    drawSourceContained(ctx, img, 0, 0, size, paddingRatio)
  }
  if (radiusRatio > 0) ctx.restore()
  await savePng(canvas, outputPath)
}

const makeLockup = async (img) => {
  const w = 960
  const h = 240
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  fillBrandBackground(ctx, w, h)

  drawCircularSource(ctx, img, 132, 120, 156)
  ctx.fillStyle = colors.text
  ctx.font = '700 76px Inter, Segoe UI, Arial, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText('Chandra', 242, 96)
  ctx.fillStyle = colors.textSecondary
  ctx.font = '500 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Indian Moon Tracker', 246, 152)

  await savePng(canvas, path.join(dirs.ui, 'chandra-lockup-horizontal.png'))
}

const makeTopbarMark = async (img) => {
  await makeIcon(img, path.join(dirs.ui, 'chandra-mark-topbar-96.png'), 96, 0.07, { radiusRatio: 0.22 })
}

const makeSplash = async (img) => {
  const w = 1080
  const h = 1920
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  fillBrandBackground(ctx, w, h)
  drawCircularSource(ctx, img, w / 2, 760, 420)
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 86px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Chandra', w / 2, 1044)
  ctx.fillStyle = colors.textSecondary
  ctx.font = '500 34px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Indian Moon Tracker', w / 2, 1110)
  await savePng(canvas, path.join(dirs.ui, 'chandra-splash-1080x1920.png'))
}

const makeSocial = async (img) => {
  {
    const size = 1200
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    fillBrandBackground(ctx, size, size)
    drawCircularSource(ctx, img, size / 2, 460, 520)
    ctx.fillStyle = colors.text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 92px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('Chandra', size / 2, 820)
    ctx.fillStyle = colors.textSecondary
    ctx.font = '500 40px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('Daily Panchang, Tithi and Moon Calendar', size / 2, 900)
    ctx.fillStyle = colors.gold
    ctx.font = '600 30px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('chandrapanchang.app', size / 2, 972)
    await savePng(canvas, path.join(dirs.social, 'chandra-og-square-1200.png'))
  }

  {
    const w = 1200
    const h = 630
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    fillBrandBackground(ctx, w, h)
    drawCircularSource(ctx, img, 292, h / 2, 360)
    ctx.fillStyle = colors.text
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = '700 90px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('Chandra', 540, 258)
    ctx.fillStyle = colors.textSecondary
    ctx.font = '500 38px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('Daily Panchang, Tithi', 544, 342)
    ctx.fillText('and Hindu Moon Calendar', 544, 392)
    ctx.fillStyle = colors.gold
    ctx.font = '600 28px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText('Personalised for Indian cities', 548, 468)
    await savePng(canvas, path.join(dirs.social, 'chandra-og-wide-1200x630.png'))
  }
}

const makePreview = async (img) => {
  const w = 1600
  const h = 1900
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')
  fillBrandBackground(ctx, w, h)

  ctx.fillStyle = colors.text
  ctx.font = '700 58px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Chandra Logo System Preview', 80, 92)
  ctx.fillStyle = colors.textSecondary
  ctx.font = '500 27px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Review sheet before wiring the assets into the app.', 82, 142)

  ctx.fillStyle = 'rgba(21,27,47,0.92)'
  roundedRect(ctx, 70, 210, 1460, 330, 20)
  ctx.fill()
  ctx.fillStyle = colors.gold
  ctx.font = '700 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Icon scale check', 110, 260)

  const sizes = [
    { size: 16, display: 16 },
    { size: 32, display: 32 },
    { size: 72, display: 72 },
    { size: 192, display: 150 },
    { size: 512, display: 210 },
  ]
  let x = 110
  for (const { size: s, display } of sizes) {
    const y = 470 - display
    if (s <= 32) {
      drawSimplifiedMark(ctx, x + display / 2, y + display / 2, display, { ticks: false, dot: false })
    } else {
      drawSourceContained(ctx, img, x, y, display, 0)
    }
    ctx.fillStyle = colors.textSecondary
    ctx.font = '500 22px Inter, Segoe UI, Arial, sans-serif'
    ctx.fillText(`${s}px`, x, 505)
    x += display + 78
  }

  ctx.fillStyle = 'rgba(21,27,47,0.92)'
  roundedRect(ctx, 70, 590, 700, 430, 20)
  ctx.fill()
  ctx.fillStyle = colors.gold
  ctx.font = '700 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Android mask simulation', 110, 642)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 4
  roundedRect(ctx, 180, 705, 260, 260, 72)
  ctx.stroke()
  drawSimplifiedMark(ctx, 310, 835, 196, { ticks: true })
  ctx.beginPath()
  ctx.arc(590, 835, 130, 0, Math.PI * 2)
  ctx.stroke()
  drawSimplifiedMark(ctx, 590, 835, 196, { ticks: true })

  ctx.fillStyle = 'rgba(21,27,47,0.92)'
  roundedRect(ctx, 830, 590, 700, 430, 20)
  ctx.fill()
  ctx.fillStyle = colors.gold
  ctx.font = '700 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Top bar usage', 870, 642)
  ctx.fillStyle = '#030712'
  roundedRect(ctx, 890, 735, 560, 96, 16)
  ctx.fill()
  drawSourceContained(ctx, img, 918, 751, 64, 0.06)
  ctx.fillStyle = colors.gold
  ctx.font = '700 34px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Chandra', 1002, 793)

  ctx.fillStyle = 'rgba(21,27,47,0.92)'
  roundedRect(ctx, 70, 1070, 700, 640, 20)
  ctx.fill()
  ctx.fillStyle = colors.gold
  ctx.font = '700 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Loading screen', 110, 1122)
  drawCircularSource(ctx, img, 420, 1356, 300)
  ctx.fillStyle = colors.text
  ctx.textAlign = 'center'
  ctx.font = '700 54px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Chandra', 420, 1548)
  ctx.fillStyle = colors.textSecondary
  ctx.font = '500 24px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Indian Moon Tracker', 420, 1598)
  ctx.textAlign = 'left'

  ctx.fillStyle = 'rgba(21,27,47,0.92)'
  roundedRect(ctx, 830, 1070, 700, 640, 20)
  ctx.fill()
  ctx.fillStyle = colors.gold
  ctx.font = '700 28px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Social share wide crop', 870, 1122)
  ctx.save()
  roundedRect(ctx, 890, 1200, 560, 294, 16)
  ctx.clip()
  fillBrandBackground(ctx, 560, 294)
  ctx.translate(890, 1200)
  drawCircularSource(ctx, img, 138, 147, 170)
  ctx.fillStyle = colors.text
  ctx.font = '700 42px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Chandra', 260, 114)
  ctx.fillStyle = colors.textSecondary
  ctx.font = '500 20px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Daily Panchang, Tithi', 262, 160)
  ctx.fillText('and Hindu Moon Calendar', 262, 188)
  ctx.fillStyle = colors.gold
  ctx.font = '600 16px Inter, Segoe UI, Arial, sans-serif'
  ctx.fillText('Personalised for Indian cities', 264, 232)
  ctx.restore()

  await savePng(canvas, path.join(dirs.preview, 'chandra-logo-system-preview.png'))
}

const makePreviewHtml = async () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chandra Logo System Preview</title>
  <style>
    :root { color-scheme: dark; --bg:#0B1020; --surface:#151B2F; --gold:#DDBB6A; --text:#F5F7FA; --muted:#B5BDD1; --border:rgba(255,255,255,.12); }
    body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, "Segoe UI", Arial, sans-serif; }
    main { width:min(1120px, calc(100% - 32px)); margin:0 auto; padding:36px 0 64px; }
    h1 { margin:0 0 8px; font-size:34px; letter-spacing:0; }
    p { color:var(--muted); line-height:1.55; }
    .grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:16px; margin-top:24px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:18px; }
    .card h2 { margin:0 0 14px; color:var(--gold); font-size:18px; }
    .sizes { display:flex; align-items:end; gap:18px; min-height:190px; flex-wrap:wrap; }
    .sample { display:grid; gap:8px; justify-items:center; color:var(--muted); font-size:12px; }
    img { max-width:100%; height:auto; }
    .topbar { display:flex; align-items:center; gap:10px; height:56px; padding:0 16px; border-radius:8px; background:#030712; }
    .topbar img { width:34px; height:34px; border-radius:8px; }
    .topbar span { color:var(--gold); font-weight:750; font-size:18px; }
    .mask-row { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
    .mask { width:180px; height:180px; padding:28px; background:#061A31; border:1px solid var(--border); display:grid; place-items:center; overflow:hidden; }
    .mask.rounded { border-radius:42px; }
    .mask.circle { border-radius:50%; }
    .mask img { width:100%; height:100%; }
    .wide { grid-column:1 / -1; }
    @media (max-width:760px) { .grid { grid-template-columns:1fr; } .wide { grid-column:auto; } }
  </style>
</head>
<body>
  <main>
    <h1>Chandra Logo System Preview</h1>
    <p>Generated from the selected logo image. These assets are staged for review only and are not wired into the live app yet.</p>

    <section class="grid">
      <article class="card">
        <h2>Icon Scale Check</h2>
        <div class="sizes">
          ${[16, 32, 72, 192].map((s) => `<div class="sample"><img src="../icons/app-icon-${s}.png" width="${s}" height="${s}" alt="" /><span>${s}px</span></div>`).join('')}
          <div class="sample"><img src="../icons/google-play-icon-512.png" width="220" height="220" alt="" /><span>512px</span></div>
        </div>
      </article>

      <article class="card">
        <h2>Maskable / Adaptive Check</h2>
        <div class="mask-row">
          <div class="mask rounded"><img src="../icons/maskable-icon-512.png" alt="Rounded mask preview" /></div>
          <div class="mask circle"><img src="../icons/maskable-icon-512.png" alt="Circle mask preview" /></div>
        </div>
      </article>

      <article class="card">
        <h2>Top Bar Mark</h2>
        <div class="topbar"><img src="../ui/chandra-mark-topbar-96.png" alt="" /><span>Chandra</span></div>
      </article>

      <article class="card">
        <h2>Horizontal Lockup</h2>
        <img src="../ui/chandra-lockup-horizontal.png" alt="Chandra horizontal lockup" />
      </article>

      <article class="card">
        <h2>Loading Screen</h2>
        <img src="../ui/chandra-splash-1080x1920.png" alt="Chandra splash screen preview" />
      </article>

      <article class="card">
        <h2>Square Social Share</h2>
        <img src="../social/chandra-og-square-1200.png" alt="Square social share image" />
      </article>

      <article class="card wide">
        <h2>Wide Open Graph Share</h2>
        <img src="../social/chandra-og-wide-1200x630.png" alt="Wide social share image" />
      </article>

      <article class="card wide">
        <h2>One-Page Contact Sheet</h2>
        <img src="./chandra-logo-system-preview.png" alt="Logo system preview contact sheet" />
      </article>
    </section>
  </main>
</body>
</html>`
  await fs.writeFile(path.join(dirs.preview, 'chandra-logo-system-preview.html'), html)
}

const makeSimplifiedSvg = async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">Chandra simplified mark</title>
  <desc id="desc">Simplified gold moon calendar mark for small UI sizes.</desc>
  <rect width="512" height="512" rx="112" fill="#071C35"/>
  <circle cx="256" cy="256" r="178" fill="none" stroke="#F2D483" stroke-width="12"/>
  <path d="M256 146a110 110 0 0 1 0 220c74-15 124-59 124-110s-50-95-124-110Z" fill="#DDBB6A"/>
  <path d="M256 86v60M256 366v60" stroke="#F2D483" stroke-width="10" stroke-linecap="round"/>
  <circle cx="426" cy="212" r="23" fill="#F2D483"/>
</svg>`
  await fs.writeFile(path.join(dirs.ui, 'chandra-mark-simplified.svg'), svg)
}

const makeIco = async () => {
  const inputs = [
    path.join(dirs.icons, 'favicon-16.png'),
    path.join(dirs.icons, 'favicon-32.png'),
    path.join(dirs.icons, 'favicon-48.png'),
  ]
  const pngs = await Promise.all(inputs.map((file) => fs.readFile(file)))
  const headerSize = 6 + pngs.length * 16
  let offset = headerSize
  const entries = []

  for (const png of pngs) {
    const width = png.readUInt32BE(16)
    const height = png.readUInt32BE(20)
    const entry = Buffer.alloc(16)
    entry.writeUInt8(width >= 256 ? 0 : width, 0)
    entry.writeUInt8(height >= 256 ? 0 : height, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    offset += png.length
  }

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  await fs.writeFile(path.join(dirs.icons, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs]))
}

const main = async () => {
  await ensureDirs()
  const img = await loadImage(sourcePath)
  await fs.copyFile(sourcePath, path.join(dirs.source, 'selected-logo-source.png'))

  await makeIcon(img, path.join(dirs.master, 'chandra-master-2048.png'), 2048, 0)
  await makeIcon(img, path.join(dirs.icons, 'google-play-icon-512.png'), 512, 0)
  await makeIcon(img, path.join(dirs.icons, 'maskable-icon-512.png'), 512, 0.16, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'maskable-icon-192.png'), 192, 0.16, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'pwa-icon-192.png'), 192, 0)
  await makeIcon(img, path.join(dirs.icons, 'app-icon-192.png'), 192, 0)
  await makeIcon(img, path.join(dirs.icons, 'app-icon-72.png'), 72, 0)
  await makeIcon(img, path.join(dirs.icons, 'app-icon-32.png'), 32, 0.12, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'app-icon-16.png'), 16, 0.14, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'notification-icon-72.png'), 72, 0.14, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'favicon-96.png'), 96, 0.12, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'favicon-48.png'), 48, 0.12, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'favicon-32.png'), 32, 0.08, { simplified: true })
  await makeIcon(img, path.join(dirs.icons, 'favicon-16.png'), 16, 0.10, { simplified: true })
  await makeTopbarMark(img)
  await makeLockup(img)
  await makeSplash(img)
  await makeSocial(img)
  await makePreview(img)
  await makePreviewHtml()
  await makeSimplifiedSvg()
  await makeIco()

  const summary = {
    source: path.relative(root, sourcePath),
    output: path.relative(root, brandDir),
    files: [
      'source/selected-logo-source.png',
      'master/chandra-master-2048.png',
      'icons/google-play-icon-512.png',
      'icons/maskable-icon-512.png',
      'icons/maskable-icon-192.png',
      'icons/pwa-icon-192.png',
      'icons/notification-icon-72.png',
      'icons/favicon-96.png',
      'icons/favicon-48.png',
      'icons/favicon-32.png',
      'icons/favicon.ico',
      'ui/chandra-mark-topbar-96.png',
      'ui/chandra-mark-simplified.svg',
      'ui/chandra-lockup-horizontal.png',
      'ui/chandra-splash-1080x1920.png',
      'social/chandra-og-square-1200.png',
      'social/chandra-og-wide-1200x630.png',
      'preview/chandra-logo-system-preview.html',
      'preview/chandra-logo-system-preview.png',
    ],
  }
  await fs.writeFile(path.join(brandDir, 'asset-manifest.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
