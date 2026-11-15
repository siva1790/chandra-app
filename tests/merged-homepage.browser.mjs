// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright entry and,
// optionally, CHROMIUM_EXECUTABLE pointing to a local Chromium binary.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
const modulePath = process.env.PLAYWRIGHT_MODULE || 'playwright'
const { chromium } = await import(isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath)
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) })
const base = process.env.PANCHANG_TEST_URL || 'http://127.0.0.1:5189'
const server = !process.env.PANCHANG_TEST_URL && spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: ['ignore','pipe','pipe'], windowsHide: true })
if (server) await new Promise((resolve,reject) => {
  const timer=setTimeout(()=>reject(new Error('Local preview did not start')),30000)
  server.stdout.on('data',chunk=>{if(chunk.toString().includes('Local:')){clearTimeout(timer);resolve()}})
  server.on('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited: ${code}`))})
})
const output = new URL('../tmp/merged-panchang-review/', import.meta.url)
await mkdir(output, { recursive: true })
const context = await browser.newContext({ timezoneId: 'Asia/Kolkata', viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' })
await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort())
const page = await context.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
await page.clock.install({ time: new Date('2026-11-15T03:30:00Z') })
const root = page.locator('.panchang-page')
const nav = () => page.locator('nav[aria-label="Main navigation"]:visible')
const go = async name => nav().getByRole('button', { name, exact: true }).click()
const pick = async (day, nextMonth = false) => {
  await root.getByRole('button', { name: /^Selected date:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Select date' })
  if (nextMonth) await dialog.getByRole('button', { name: 'Next month', exact: true }).click()
  await dialog.getByRole('button', { name: day, exact: true }).click()
}
const measure = () => page.evaluate(() => {
  const box = selector => {
    const { top, bottom, left, right, width, height } = document.querySelector(selector).getBoundingClientRect()
    return { top, bottom, left, right, width, height }
  }
  return {
    overflow: document.documentElement.scrollWidth > innerWidth,
    moon: box('.panchang-cosmos-moon'),
    columns: [...document.querySelectorAll('.panchang-cosmos-column')].map(n => { const r=n.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width} }),
    anga: box('.panchang-anga'), solar: box('.panchang-sun'), timings: box('.panchang-timings'), nakshatra: box('.panchang-nakshatra'), month: box('.panchang-month'),
  }
})
try {
  await page.goto(base)
  await root.locator('.panchang-cosmos-grid').waitFor()
  assert.equal(await nav().count(), 1)
  assert.deepEqual(await nav().locator('button').allTextContents(), ['Panchang','Calendar','Settings'])
  assert.equal(await page.locator('.day-view-page').count(), 0)
  assert.equal(await root.locator('.panchang-panel [aria-expanded="true"]').count(), 6)
  assert.equal(await root.getByRole('button', { name: 'Collapse all', exact: true }).count(), 1)
  const savedProfile = await page.evaluate(() => localStorage.getItem('chandra-profile'))
  await root.getByRole('button', { name: 'Collapse all', exact: true }).click()
  assert.equal(await root.locator('.panchang-panel [aria-expanded="true"]').count(), 0)
  await root.getByRole('button', { name: 'Expand all', exact: true }).click()

  await pick('24 November 2026')
  assert.match(await root.locator('.panchang-highlight').textContent(), /Dev Diwali/)
  assert.equal(await root.locator('.panchang-festival-description p').first().isVisible(), true, 'Event description must be visible without another tap')
  assert.equal(await root.locator('.panchang-highlight summary').count(), 0, 'Highlights should not have a details dropdown')
  assert.equal(await root.getByRole('heading', { name: 'Cosmos', exact: true }).count(), 1)
  const priorSunrise = await root.locator('.panchang-sun .font-semibold').first().textContent()
  await root.locator('.panchang-context-picker').click()
  assert.equal(await root.getByRole('searchbox').evaluate(n => n === document.activeElement), true)
  await root.getByRole('searchbox').fill('del')
  assert.equal(await root.locator('.panchang-city-option').count(), 1)
  await root.getByRole('radio', { name: /^Delhi/ }).check()
  await root.getByRole('radio', { name: /^Purnimant/ }).check()
  assert.match(await root.locator('.panchang-context-picker').textContent(), /Bengaluru/)
  await root.getByRole('button', { name: 'Apply changes', exact: true }).click()
  assert.equal(await root.locator('.panchang-context-picker').textContent(), 'Delhi · Purnimant')
  assert.notEqual(await root.locator('.panchang-sun .font-semibold').first().textContent(), priorSunrise)
  assert.match(await root.getByRole('button', { name: /^Selected date:/ }).textContent(), /24 November/)
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('chandra-settings')))
  assert.equal(settings.city, 'Delhi'); assert.equal(settings.lat, 28.6139); assert.equal(settings.calendarSystem, 'Purnimant')
  assert.equal(await page.evaluate(() => localStorage.getItem('chandra-profile')), savedProfile)
  await root.locator('.panchang-context-picker').click()
  await root.getByRole('radio', { name: /^Mumbai/ }).check()
  await root.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert.match(await root.locator('.panchang-context-picker').textContent(), /Delhi/)
  await root.locator('.panchang-context-picker').click()
  await root.getByRole('searchbox').fill('no-such-city')
  assert.match(await root.getByRole('status').first().textContent(), /No matching cities/)
  await page.keyboard.press('Escape')
  assert.equal(await root.locator('.panchang-preferences-editor').count(), 0)
  assert.equal(await root.locator('.panchang-context-picker').evaluate(n => n === document.activeElement), true)
  await go('Settings')
  assert.match(await page.locator('.settings-page').textContent(), /Delhi/)
  await go('Calendar')
  await page.getByRole('button', { name: /^25 November 2026,/ }).click()
  await page.getByRole('button', { name: /View Full Panchang/ }).click()
  assert.match(await root.getByRole('button', { name: /^Selected date:/ }).textContent(), /25 November/)
  await root.getByRole('button', { name: 'Learn about Pancha Anga', exact: true }).click()
  await page.getByRole('button', { name: 'Back to Panchang', exact: true }).click()
  assert.match(await root.getByRole('button', { name: /^Selected date:/ }).textContent(), /25 November/)

  // Restore Bengaluru to inspect the documented no-moonrise case.
  await root.locator('.panchang-context-picker').click()
  await root.getByRole('radio', { name: /^Bengaluru/ }).check()
  await root.getByRole('radio', { name: /^Amavasyant/ }).check()
  await root.getByRole('button', { name: 'Apply changes', exact: true }).click()
  await pick('1 December 2026', true)
  assert.match(await root.locator('.panchang-cosmos').textContent(), /No moonrise on this date/)
  assert.match(await root.locator('.panchang-cosmos').textContent(), /12:27 PM/)

  for (const width of [320,390,767,768,800,1023,1024,1440]) {
    await page.setViewportSize({ width, height: 1000 })
    const m = await measure()
    assert.equal(m.overflow, false, `Page overflow at ${width}`)
    assert.ok(Math.abs(m.columns[0].width-m.columns[1].width)<1, `Unequal Cosmos columns at ${width}`)
    assert.ok(Math.abs((m.columns[0].left-m.moon.right)-(m.columns[1].left-m.columns[0].right))<1, `Unequal Cosmos gaps at ${width}`)
    assert.ok(m.moon.width >= 88, `Moon too small at ${width}`)
    if(width>=768){
      assert.ok(Math.abs(m.anga.top-m.timings.top)<1, `Grid tops at ${width}`)
      assert.ok(Math.abs(m.anga.bottom-m.nakshatra.bottom)<1, `Grid span at ${width}`)
      assert.ok(Math.abs(m.solar.top-m.month.top)<1, `Final row tops at ${width}`)
      assert.ok(Math.abs(m.solar.bottom-m.month.bottom)<1, `Final row bottoms at ${width}`)
    }
    await root.locator('.panchang-context-picker').click()
    if([390,800,1440].includes(width))await page.screenshot({ path:fileURLToPath(new URL(`picker-${width}.png`,output)),fullPage:true,animations:'disabled' })
    await root.getByRole('searchbox').fill('Thiruvananthapuram')
    assert.equal(await root.getByRole('radio', { name: /^Thiruvananthapuram/ }).count(), 1)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth),false,`Picker overflow at ${width}`)
    await root.getByRole('button', { name: 'Cancel', exact: true }).click()
    if([390,800,1440].includes(width))await page.screenshot({ path:fileURLToPath(new URL(`panchang-${width}.png`,output)),fullPage:true,animations:'disabled' })
    console.log(`Responsive layout, matching heights, equal Cosmos gaps and city picker: ${width}px passed`)
  }
  await page.setViewportSize({width:320,height:1000})
  await page.evaluate(()=>document.documentElement.style.fontSize='200%')
  assert.equal((await measure()).overflow,false,'Enlarged-text page overflow')
  await root.locator('.panchang-context-picker').click()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Enlarged-text picker overflow')
  await root.getByRole('button',{name:'Cancel',exact:true}).click()
  await page.evaluate(()=>document.documentElement.style.fontSize='')
  for(const path of ['/#panchang','/#home','/#today']){
    await page.goto(base+path)
    await root.locator('.panchang-cosmos-grid').waitFor()
    assert.equal(await root.getByRole('heading',{name:'Panchang',exact:true}).count(),1)
  }
  for(const path of ['/panchang/bengaluru','/learn/panchang-basics']){
    await page.goto(base+path)
    assert.deepEqual(await page.locator('nav[aria-label="Main navigation"]:visible a').allTextContents(),['Panchang','Calendar','Settings'])
  }
  assert.deepEqual(errors,[])
  console.log('Navigation, city/system drafts and saved Apply, date preservation, Learn return, no-moonrise display, legacy links, enlarged text and public navigation passed')
} finally { await browser.close(); if(server)server.kill() }
