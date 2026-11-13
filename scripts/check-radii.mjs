import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true }))
  .map(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat()
const files = [...(await walk('src')).filter(file => /\.(jsx|css)$/.test(file)), 'public/privacy.html']
const approved = /^(?:icon|control|inset|card|dialog|pill|circle|none)$/
const failures = []
for (const file of files) {
  const source = await readFile(file, 'utf8')
  const report = (index, message) => failures.push(`${file}:${source.slice(0, index).split('\n').length}: ${message}`)
  for (const match of source.matchAll(/\brounded(?:-(?:[a-z0-9-]+|\[[^\]]+\]))?/g)) {
    // Match whole utility names only, not English words such as "surrounded".
    const token = match[0].replace(/^rounded(?:-(?:t|r|b|l|tl|tr|br|bl))?-?/, '')
    if (!approved.test(token)) report(match.index, `Use a semantic radius utility instead of ${match[0]}`)
  }
  for (const match of source.matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
    const value = match[1].replace(/var\(--radius-(?:icon|control|inset|card|dialog|pill|circle)\)/g, '0')
    if (!/^(?:0\s*)+$/.test(value.trim())) report(match.index, `Use radius tokens instead of ${match[1].trim()}`)
  }
  for (const match of source.matchAll(/\bborderRadius\s*:/g)) report(match.index, 'Use a semantic radius class instead of an inline radius')
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log(`Radius policy passed: ${files.length} source files checked.`)
