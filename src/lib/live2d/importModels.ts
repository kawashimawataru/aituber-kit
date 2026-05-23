import fs from 'fs/promises'
import path from 'path'
import {
  discoverLive2DModelsInRoot,
  findModel3JsonInDir,
  Live2DModelInfo,
} from './discoverModel'

export interface Live2DImportResult {
  folderName: string
  path: string
  skipped?: boolean
  reason?: string
}

export function getLive2dStorageDir(): string {
  return path.join(process.cwd(), 'public/live2d')
}

export function sanitizeImportFolderName(name: string): string {
  const base = path.basename(name.trim())
  if (!base || base === '.' || base === '..') {
    throw new Error('Invalid folder name')
  }
  return base
}

export function validateImportSourcePath(sourcePath: string): string {
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error('sourcePath is required')
  }
  if (sourcePath.includes('..')) {
    throw new Error('Invalid path')
  }
  const resolved = path.resolve(sourcePath)
  if (!path.isAbsolute(resolved)) {
    throw new Error('Path must be absolute')
  }
  return resolved
}

/**
 * ソース直下の各サブフォルダを public/live2d にコピー（model3.json があるもののみ）
 */
export async function importLive2DFromDirectory(
  sourcePath: string,
  destRoot = getLive2dStorageDir()
): Promise<Live2DImportResult[]> {
  const resolved = validateImportSourcePath(sourcePath)
  const stat = await fs.stat(resolved).catch(() => null)
  if (!stat?.isDirectory()) {
    throw new Error('Source path is not a directory')
  }

  await fs.mkdir(destRoot, { recursive: true })

  const entries = await fs.readdir(resolved, { withFileTypes: true })
  const results: Live2DImportResult[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue

    const srcFolder = path.join(resolved, entry.name)
    const hasModel = await findModel3JsonInDir(srcFolder)
    if (!hasModel) {
      results.push({
        folderName: entry.name,
        path: '',
        skipped: true,
        reason: 'No .model3.json found',
      })
      continue
    }

    const destFolder = path.join(destRoot, entry.name)
    await fs.cp(srcFolder, destFolder, { recursive: true, force: true })

    const discovered = await discoverLive2DModelsInRoot(destRoot)
    const imported = discovered.find((m) => m.name === entry.name)
    results.push({
      folderName: entry.name,
      path: imported?.path ?? '',
    })
  }

  return results
}

/**
 * アップロードされたファイル群（webkitRelativePath 付き）を保存
 */
export async function saveUploadedLive2DFiles(
  files: Array<{ filepath: string; relativePath: string }>,
  destRoot = getLive2dStorageDir()
): Promise<Live2DImportResult[]> {
  await fs.mkdir(destRoot, { recursive: true })

  const modelRoots = new Map<string, Set<string>>()

  for (const file of files) {
    const normalized = file.relativePath.replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    if (parts.length === 0) continue

    const rootName = sanitizeImportFolderName(parts[0])
    if (!modelRoots.has(rootName)) {
      modelRoots.set(rootName, new Set())
    }
    modelRoots.get(rootName)!.add(normalized)
  }

  const results: Live2DImportResult[] = []

  for (const file of files) {
    const normalized = file.relativePath.replace(/\\/g, '/')
    const parts = normalized.split('/').filter(Boolean)
    if (parts.length === 0) continue

    const rootName = sanitizeImportFolderName(parts[0])
    const destPath = path.join(destRoot, ...parts)
    await fs.mkdir(path.dirname(destPath), { recursive: true })
    await fs.copyFile(file.filepath, destPath)
  }

  for (const rootName of modelRoots.keys()) {
    const folderPath = path.join(destRoot, rootName)
    const hasModel = await findModel3JsonInDir(folderPath)
    if (!hasModel) {
      results.push({
        folderName: rootName,
        path: '',
        skipped: true,
        reason: 'No .model3.json found',
      })
      continue
    }

    const discovered = await discoverLive2DModelsInRoot(destRoot)
    const imported = discovered.find((m) => m.name === rootName)
    results.push({
      folderName: rootName,
      path: imported?.path ?? '',
    })
  }

  return results
}

export function getDefaultVtsLive2DPath(): string {
  return (
    process.env.LIVE2D_VTS_IMPORT_PATH ||
    path.join(
      process.env.HOME || '',
      'Library/Application Support/Steam/steamapps/common/VTube Studio/VTubeStudio.app/Contents/Resources/Data/StreamingAssets/Live2DModels'
    )
  )
}

export type { Live2DModelInfo }
