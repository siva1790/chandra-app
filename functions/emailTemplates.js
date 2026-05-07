/**
 * emailTemplates.js — HTML email templates for Chandra.
 *
 * Three templates:
 *   festivalEmail     — sent on festival / eclipse days
 *   monthlyDigestEmail — sent on the 1st of each month (emailFrequency = 'monthly')
 *
 * All emails are mobile-friendly, dark-themed, and include an unsubscribe footer.
 */

'use strict'

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmtTime = (date) =>
  date
    ? new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata',
      }).format(date)
    : 'N/A'

const fmtDate = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date)

const fmtShortDate = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    month: 'short', day: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date)

const fmtMonth = (date) =>
  new Intl.DateTimeFormat('en-IN', {
    month: 'long', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(date)

// ── Shared layout wrapper ─────────────────────────────────────────────────────

const wrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chandra</title>
</head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="100%" style="max-width:520px;background:#111120;border-radius:16px;overflow:hidden;border:1px solid #2a2a40;">

          <!-- Header -->
          <tr>
            <td style="padding:24px 28px 16px;border-bottom:1px solid #2a2a40;">
              <span style="font-size:22px;">🌙</span>
              <span style="font-size:18px;font-weight:700;color:#fde68a;margin-left:8px;vertical-align:middle;">Chandra</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #2a2a40;">
              <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.6;">
                You're receiving this because you subscribed to Chandra — Indian Moon Tracker.<br/>
                To unsubscribe or change your preferences, open the Chandra app → Settings → Email Alerts.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

// ── Festival / Eclipse email ──────────────────────────────────────────────────

/**
 * festivalEmail({ subscriber, festival, tithi, nakshatra, moonrise, eclipse, date })
 * Returns { subject, html }
 */
const festivalEmail = ({ subscriber, festival, eclipse, tithi, nakshatra, moonrise, date }) => {
  const greeting = subscriber.name ? `Namaste, ${subscriber.name}` : 'Namaste'
  const dateStr  = fmtDate(date)
  const moonStr  = fmtTime(moonrise)

  // Eclipse takes priority in subject line
  const isEclipse = !!eclipse && !festival
  const emoji     = isEclipse ? (eclipse.type === 'lunar' ? '🌑' : '☀️') : festival.emoji
  const name      = isEclipse ? eclipse.hinduName : festival.name
  const desc      = isEclipse
    ? `A ${eclipse.kind} ${eclipse.type} eclipse is occurring today.`
    : festival.description

  const subject   = `${emoji} ${name} — Your Chandra Guide for ${subscriber.city}`

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">${dateStr}</p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">📍 ${subscriber.city}</p>

    <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:20px;border-left:3px solid #fbbf24;">
      <p style="margin:0 0 6px;font-size:24px;">${emoji}</p>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fde68a;">${name}</h1>
      <p style="margin:0;font-size:14px;color:#d1d5db;line-height:1.6;">${desc}</p>
    </div>

    <p style="margin:0 0 16px;font-size:15px;color:#e5e7eb;">${greeting},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Today's Panchang for <strong style="color:#e5e7eb;">${subscriber.city}</strong>:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f1f;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a40;">
          <span style="font-size:12px;color:#6b7280;">Tithi</span><br/>
          <span style="font-size:14px;color:#e5e7eb;font-weight:500;">${tithi.name} · ${tithi.paksha} Paksha</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a40;">
          <span style="font-size:12px;color:#6b7280;">Nakshatra</span><br/>
          <span style="font-size:14px;color:#e5e7eb;font-weight:500;">${nakshatra}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <span style="font-size:12px;color:#6b7280;">🌙 Moonrise in ${subscriber.city}</span><br/>
          <span style="font-size:14px;color:#fde68a;font-weight:600;">${moonStr}</span>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
      Open the Chandra app for full Panchang details, eclipse timings, and your monthly festival calendar.
    </p>
  `)

  return { subject, html }
}

// ── Monthly digest email ──────────────────────────────────────────────────────

/**
 * monthlyDigestEmail({ subscriber, upcomingFestivals, date })
 * upcomingFestivals: array of { date, dateKey, festivals: [{name, emoji, description}] }
 * Returns { subject, html }
 */
const monthlyDigestEmail = ({ subscriber, upcomingFestivals, date }) => {
  const monthStr  = fmtMonth(date)
  const greeting  = subscriber.name ? `Namaste, ${subscriber.name}` : 'Namaste'
  const subject   = `🌙 Your Chandra Guide for ${monthStr}`

  const festivalRows = upcomingFestivals.length > 0
    ? upcomingFestivals.map(({ date: fd, festivals }) => {
        const fest = festivals[0]
        return `
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #2a2a40;">
              <span style="font-size:11px;color:#6b7280;">${fmtShortDate(fd)}</span><br/>
              <span style="font-size:14px;">${fest.emoji}</span>
              <span style="font-size:14px;color:#e5e7eb;font-weight:500;margin-left:6px;">${fest.name}</span><br/>
              <span style="font-size:12px;color:#9ca3af;">${fest.description}</span>
            </td>
          </tr>`
      }).join('')
    : `<tr><td style="padding:16px;color:#6b7280;font-size:13px;">No major festivals this month.</td></tr>`

  const html = wrap(`
    <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">${monthStr}</p>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;">📍 ${subscriber.city}</p>

    <p style="margin:0 0 8px;font-size:15px;color:#e5e7eb;">${greeting},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#9ca3af;line-height:1.7;">
      Here are the major Hindu festivals coming up in <strong style="color:#e5e7eb;">${monthStr}</strong>:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#0f0f1f;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      ${festivalRows}
    </table>

    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
      Open the Chandra app for daily Tithi, Nakshatra, moonrise times and full Panchang details for ${subscriber.city}.
    </p>
  `)

  return { subject, html }
}

module.exports = { festivalEmail, monthlyDigestEmail }
