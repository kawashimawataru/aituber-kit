#!/usr/bin/env node
/**
 * VTube Studio の Live2DModels フォルダを public/live2d にコピーする
 *
 * Usage:
 *   node scripts/import-vts-live2d.mjs
 *   node scripts/import-vts-live2d.mjs "/path/to/Live2DModels"
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const destRoot = path.join(projectRoot, 'public/live2d')

const defaultSource = path.join(
  process.env.HOME || '',
  'Library/Application Support/Steam/steamapps/common/VTube Studio/VTubeStudio.app/Contents/Resources/Data/StreamingAssets/Live2DModels'
)

const MAX_DEPTH = 5

async function findModel3JsonInDir(dir, depth = 0, relativePrefix = '') {
  if (depth > MAX_DEPTH) return null
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const model3 = entries.find(
    (e) => e.isFile() && e.name.endsWith('.model3.json')
  )
  if (model3) {
    return {
      model3FileName: model3.name,
      relativeDir: relativePrefix.replace(/\\/g, '/'),
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const subDir = path.join(dir, entry.name)
    const subPrefix = relativePrefix
      ? path.join(relativePrefix, entry.name)
      : entry.name
    const found = await findModel3JsonInDir(subDir, depth + 1, subPrefix)
    if (found) return found
  }
  return null
}

async function main() {
  const sourcePath = path.resolve(process.argv[2] || defaultSource)

  try {
    await fs.access(sourcePath)
  } catch {
    console.error(`Source not found: ${sourcePath}`)
    process.exit(1)
  }

  await fs.mkdir(destRoot, { recursive: true })

  const entries = await fs.readdir(sourcePath, { withFileTypes: true })
  let imported = 0
  let skipped = 0

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const src = path.join(sourcePath, entry.name)
    const hasModel = await findModel3JsonInDir(src)
    if (!hasModel) {
      console.log(`  skip (no model3.json): ${entry.name}`)
      skipped++
      continue
    }
    const dest = path.join(destRoot, entry.name)
    console.log(`  copy: ${entry.name}`)
    await fs.cp(src, dest, { recursive: true, force: true })
    imported++
  }

  console.log(`\nDone. imported=${imported} skipped=${skipped}`)
  console.log(`Destination: ${destRoot}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
