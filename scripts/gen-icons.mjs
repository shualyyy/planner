// Generate PNG icons from public/icon.svg
// Usage: node scripts/gen-icons.mjs
// Requires: npm install --save-dev sharp

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svg = readFileSync(resolve(root, 'public/icon.svg'))

const targets = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of targets) {
  const out = resolve(root, `public/${name}`)
  await sharp(svg).resize(size, size).png().toFile(out)
  console.log(`✓ ${name} (${size}×${size})`)
}
console.log('Icons generated.')
