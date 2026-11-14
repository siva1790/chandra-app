import { readdir, readFile } from 'node:fs/promises'

// Prevent size/weight drift. Role assignment, wrapping and visual hierarchy still
// require a rendered review; this check does not certify accessibility.
const failures = []
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) await walk(path)
    else if (/\.(?:css|jsx)$/.test(path)) files.push(path)
  }
}
await walk('src')
files.push('public/privacy.html')
for (const file of files) {
  const source = await readFile(file, 'utf8')
  const report = (index, message) => failures.push(`${file}:${source.slice(0, index).split('\n').length}: ${message}`)
  for (const match of source.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)(?:px|rem|em|vw|%)/g)) {
    report(match.index, 'Use a shared --type-* size token instead of a page-specific font size')
  }
  for (const match of source.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    if (![400, 500, 600, 700].includes(Number(match[1]))) report(match.index, 'Use a loaded Inter weight: 400, 500, 600 or 700')
  }
  for (const match of source.matchAll(/\btext-\[(?:10|11|13|15)px\]/g)) {
    report(match.index, 'Use text-body, text-support or text-meta instead of an off-scale size')
  }
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else console.log(`Typography policy passed: ${files.length} source files checked.`)
