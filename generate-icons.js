import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

const generateIcon = (size) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, size, size)

  // Outer glow
  const gradient = ctx.createRadialGradient(
    size * 0.5, size * 0.5, size * 0.2,
    size * 0.5, size * 0.5, size * 0.5
  )
  gradient.addColorStop(0, 'rgba(245, 230, 66, 0.15)')
  gradient.addColorStop(1, 'rgba(10, 10, 26, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Dark moon base circle
  ctx.beginPath()
  ctx.arc(size * 0.5, size * 0.5, size * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1a2e'
  ctx.fill()

  // Crescent — waxing gibbous shape
  ctx.beginPath()
  ctx.arc(size * 0.5, size * 0.5, size * 0.38, -Math.PI / 2, Math.PI / 2)
  ctx.fillStyle = '#f5e642'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(size * 0.42, size * 0.5, size * 0.28, -Math.PI / 2, Math.PI / 2, true)
  ctx.fillStyle = '#1a1a2e'
  ctx.fill()

  // Subtle ring
  ctx.beginPath()
  ctx.arc(size * 0.5, size * 0.5, size * 0.38, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(245, 230, 66, 0.3)'
  ctx.lineWidth = size * 0.015
  ctx.stroke()

  return canvas.toBuffer('image/png')
}

writeFileSync('public/icons/icon-192.png', generateIcon(192))
writeFileSync('public/icons/icon-512.png', generateIcon(512))
console.log('Icons generated successfully!')