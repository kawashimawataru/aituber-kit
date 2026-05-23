import fs from 'fs/promises'
import path from 'path'

const MAX_SEARCH_DEPTH = 5

export interface Model3Location {
  model3FileName: string
  /** model3.json があるディレクトリ（モデルフォルダ直下からの相対パス、空なら直下） */
  relativeDir: string
}

/**
 * ディレクトリ内（最大 MAX_SEARCH_DEPTH 階層）で .model3.json を探す
 */
export async function findModel3JsonInDir(
  dir: string,
  depth = 0,
  relativePrefix = ''
): Promise<Model3Location | null> {
  if (depth > MAX_SEARCH_DEPTH) return null

  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return null
  }

  const model3Entry = entries.find(
    (e) => e.isFile() && e.name.endsWith('.model3.json')
  )
  if (model3Entry) {
    return {
      model3FileName: model3Entry.name,
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

export interface Live2DModelInfo {
  path: string
  name: string
  expressions: string[]
  motions: string[]
}

function buildModelUrlPath(
  folderName: string,
  location: Model3Location
): string {
  const sub = location.relativeDir
    ? `${location.relativeDir}/${location.model3FileName}`
    : location.model3FileName
  return `/live2d/${folderName}/${sub}`
}

/**
 * public/live2d 配下の登録済みモデル一覧を構築する
 */
export async function discoverLive2DModelsInRoot(
  live2dRoot: string
): Promise<Live2DModelInfo[]> {
  if (!(await fs.stat(live2dRoot).catch(() => null))) {
    return []
  }

  const folders = await fs.readdir(live2dRoot, { withFileTypes: true })
  const models: Live2DModelInfo[] = []

  for (const folder of folders) {
    if (!folder.isDirectory() || folder.name.startsWith('.')) continue

    const folderPath = path.join(live2dRoot, folder.name)
    const location = await findModel3JsonInDir(folderPath)
    if (!location) continue

    const fullModelPath = path.join(
      folderPath,
      location.relativeDir,
      location.model3FileName
    )

    let expressions: string[] = []
    let motions: string[] = []
    try {
      const modelContent = await fs.readFile(fullModelPath, 'utf-8')
      const modelJson = JSON.parse(modelContent)
      expressions =
        modelJson.FileReferences?.Expressions?.map(
          (exp: { Name: string }) => exp.Name
        ) || []
      motions = Object.keys(modelJson.FileReferences?.Motions || {})
    } catch {
      // model3.json が壊れていても一覧には載せる
    }

    models.push({
      path: buildModelUrlPath(folder.name, location),
      name: folder.name,
      expressions,
      motions,
    })
  }

  models.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return models
}
