/**
 * shareCard.js
 * Generates a 540×960 PNG share card (Instagram Stories 9:16 ratio).
 * Returns a Blob suitable for navigator.share({ files }) or a download link.
 *
 * Layout (top → bottom):
 *   - Starfield background (#0B1020)
 *   - Vara + formatted date (small, muted)
 *   - Moon phase visual (shadow-overlay, same logic as MoonVisual.jsx)
 *   - Gold divider
 *   - Tithi name (large) + Paksha (small gold)
 *   - Illumination %
 *   - Daily message (italic, wrapped)
 *   - Bottom strip: Chandra wordmark + chandrapanchang.app URL
 */

import QRCode from 'qrcode'
import moonTexture from './assets/moon-texture.png'

const W = 540
const H = 960

// ── Moon phase path (mirrors MoonVisual.jsx shadow-overlay logic) ────────────
const CX = W / 2
const MOON_CY = 295
const R = 110

const shadowPathString = (phase) => {
  if (phase < 0.02 || phase > 0.98) return null // Amavasya — all dark
  if (phase > 0.48 && phase < 0.52) return null  // Purnima — no shadow

  const termCos      = Math.cos(phase * 2 * Math.PI)
  const rx           = Math.max(1, Math.abs(termCos) * R)
  const isWaxing     = phase < 0.5
  const isGibbous    = (isWaxing && phase > 0.25) || (!isWaxing && phase < 0.75)
  const outerSweep   = isWaxing ? 0 : 1
  let terminatorSweep
  if (isWaxing) terminatorSweep = isGibbous ? 1 : 0
  else          terminatorSweep = isGibbous ? 0 : 1

  return (
    `M ${CX} ${MOON_CY - R} ` +
    `A ${R} ${R} 0 0 ${outerSweep} ${CX} ${MOON_CY + R} ` +
    `A ${rx.toFixed(2)} ${R} 0 0 ${terminatorSweep} ${CX} ${MOON_CY - R} Z`
  )
}

// ── Text wrapping helper ──────────────────────────────────────────────────────
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ')
  let line = ''
  let currentY = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, currentY)
  return currentY
}

// ── Load image helper ─────────────────────────────────────────────────────────
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// ── Main generator ────────────────────────────────────────────────────────────
/**
 * @param {object} data
 * @param {number} data.phase          - Moon phase 0–1
 * @param {string} data.vara           - Sanskrit weekday e.g. 'Guruvara'
 * @param {string} data.dateLabel      - Formatted date e.g. 'Thursday, 14 May 2026'
 * @param {string} data.tithiName      - e.g. 'Pratipada (Prathama)'
 * @param {string} data.paksha         - 'Shukla' or 'Krishna' (or null for Amavasya/Purnima)
 * @param {string} data.illuminationPct - e.g. '12.4'
 * @param {string} data.message        - Daily message string
 * @returns {Promise<Blob>} PNG blob
 */
export const generateShareCard = async ({
  phase,
  vara,
  dateLabel,
  tithiName,
  paksha,
  illuminationPct,
  message,
}) => {
  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx     = canvas.getContext('2d')

  // ── 1. Background ────────────────────────────────────────────────────────
  ctx.fillStyle = '#0B1020'
  ctx.fillRect(0, 0, W, H)

  // ── 2. Stars ─────────────────────────────────────────────────────────────
  const stars = [
    [48,70],[140,45],[320,30],[470,90],[510,50],[100,155],[400,130],[25,220],
    [490,200],[75,340],[520,310],[220,60],[290,38],[430,240],[60,510],
    [500,480],[250,840],[120,780],[470,730],[380,60],[160,890],[510,850],
    [30,650],[490,620],[200,120],[440,170],[80,420],[360,390],[270,700],
  ]
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (const [sx, sy] of stars) {
    ctx.beginPath()
    ctx.arc(sx, sy, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── 3. Moon visual ───────────────────────────────────────────────────────
  const isNewMoon  = phase < 0.02 || phase > 0.98
  const isFullMoon = phase > 0.48 && phase < 0.52

  // Clip to disc
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, MOON_CY, R, 0, Math.PI * 2)
  ctx.clip()

  // Dark base
  ctx.fillStyle = '#0b1420'
  ctx.fillRect(CX - R - 2, MOON_CY - R - 2, (R + 2) * 2, (R + 2) * 2)

  if (!isNewMoon) {
    try {
      const img = await loadImage(moonTexture)
      const texSize = R * 2 * 1.1
      ctx.drawImage(img, CX - texSize / 2, MOON_CY - texSize / 2, texSize, texSize)
    } catch (_) {
      // texture failed — fall back to plain cream disc
      ctx.fillStyle = '#D4C98A'
      ctx.beginPath()
      ctx.arc(CX, MOON_CY, R, 0, Math.PI * 2)
      ctx.fill()
    }

    // Shadow overlay using Path2D (SVG path syntax)
    const shadowStr = shadowPathString(phase)
    if (shadowStr) {
      const shadowGrad = ctx.createRadialGradient(CX, MOON_CY, 0, CX, MOON_CY, R)
      shadowGrad.addColorStop(0,    'rgba(11,20,32,0.97)')
      shadowGrad.addColorStop(0.75, 'rgba(13,24,40,1.00)')
      shadowGrad.addColorStop(1,    'rgba(27,47,70,0.94)')
      ctx.fillStyle = shadowGrad
      ctx.fill(new Path2D(shadowStr))
    }
  }
  ctx.restore()

  // Rim
  ctx.beginPath()
  ctx.arc(CX, MOON_CY, R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(200,210,255,0.2)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Outer glow ring (full moon only)
  if (isFullMoon) {
    ctx.beginPath()
    ctx.arc(CX, MOON_CY, R + 14, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(220,230,255,0.08)'
    ctx.lineWidth = 10
    ctx.stroke()
  }

  // ── 4. Vara + date ────────────────────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6b7494'
  ctx.font = '500 22px Arial, sans-serif'
  ctx.fillText(vara.toUpperCase(), CX, 128)
  ctx.font = '400 20px Arial, sans-serif'
  ctx.fillStyle = '#4a5070'
  ctx.fillText(dateLabel, CX, 156)

  // ── 5. Gold divider (below moon) ─────────────────────────────────────────
  const divY1 = MOON_CY + R + 28
  ctx.fillStyle = 'rgba(221,187,106,0.45)'
  ctx.fillRect(CX - 50, divY1, 100, 1)

  // ── 6. Tithi name ─────────────────────────────────────────────────────────
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F5F7FA'
  ctx.font = '500 44px Georgia, serif'
  ctx.fillText(tithiName, CX, divY1 + 54)

  // ── 7. Paksha ─────────────────────────────────────────────────────────────
  const pakshaDisplay = paksha ? `${paksha.toUpperCase()} PAKSHA` : ''
  ctx.fillStyle = '#DDBB6A'
  ctx.font = '500 20px Arial, sans-serif'
  ctx.fillText(pakshaDisplay, CX, divY1 + 86)

  // ── 8. Illumination ───────────────────────────────────────────────────────
  ctx.fillStyle = '#6b7494'
  ctx.font = '400 18px Arial, sans-serif'
  ctx.fillText(`${Number(illuminationPct).toFixed(0)}% illuminated`, CX, divY1 + 114)

  // ── 9. Message ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#B5BDD1'
  ctx.font = 'italic 400 22px Georgia, serif'
  ctx.textAlign = 'center'
  const msgY  = divY1 + 158
  const msgX  = CX
  const maxW  = 420
  const lineH = 34
  wrapText(ctx, `"${message}"`, msgX, msgY, maxW, lineH)

  // ── 10. Bottom strip — QR code + wordmark ─────────────────────────────────
  const bottomDivY = H - 148
  ctx.fillStyle = 'rgba(221,187,106,0.2)'
  ctx.fillRect(60, bottomDivY, W - 120, 1)

  // Generate QR code as a data URL (gold on dark)
  const qrSize = 80
  const qrX    = CX - qrSize / 2    // centred horizontally
  const qrY    = bottomDivY + 14

  try {
    const qrDataUrl = await QRCode.toDataURL('https://chandrapanchang.app', {
      width:  qrSize * 2,   // 2× for crisp rendering, then scale down
      margin: 1,
      color: {
        dark:  '#DDBB6A',   // gold modules
        light: '#0B1020',   // dark background matches card
      },
    })
    const qrImg = await loadImage(qrDataUrl)
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  } catch (_) {
    // QR generation failed — fall back to URL text only
  }

  // Wordmark below QR code
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(221,187,106,0.75)'
  ctx.font = '500 20px Arial, sans-serif'
  ctx.fillText('CHANDRA', CX, qrY + qrSize + 22)

  ctx.fillStyle = 'rgba(107,116,148,0.65)'
  ctx.font = '400 14px Arial, sans-serif'
  ctx.fillText('chandrapanchang.app', CX, qrY + qrSize + 40)

  // ── 11. Export ────────────────────────────────────────────────────────────
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}
