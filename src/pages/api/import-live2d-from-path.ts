import { NextApiRequest, NextApiResponse } from 'next'
import {
  isLive2DEnabled,
  createLive2DRestrictionErrorResponse,
} from '@/utils/live2dRestriction'
import {
  isRestrictedMode,
  createRestrictedModeErrorResponse,
} from '@/utils/restrictedMode'
import {
  getDefaultVtsLive2DPath,
  importLive2DFromDirectory,
} from '@/lib/live2d/importModels'

function isPathImportAllowed(): boolean {
  if (process.env.ALLOW_LIVE2D_PATH_IMPORT === 'false') return false
  if (process.env.NODE_ENV === 'development') return true
  return process.env.ALLOW_LIVE2D_PATH_IMPORT === 'true'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isLive2DEnabled()) {
    return res.status(403).json(createLive2DRestrictionErrorResponse())
  }

  if (isRestrictedMode()) {
    return res
      .status(403)
      .json(createRestrictedModeErrorResponse('import-live2d-from-path'))
  }

  if (!isPathImportAllowed()) {
    return res.status(403).json({
      error: 'Path import disabled',
      message:
        'Set ALLOW_LIVE2D_PATH_IMPORT=true in .env for production, or use folder upload in settings.',
    })
  }

  try {
    const body = req.body as { sourcePath?: string }
    const sourcePath = body?.sourcePath?.trim() || getDefaultVtsLive2DPath()
    const results = await importLive2DFromDirectory(sourcePath)
    const imported = results.filter((r) => r.path && !r.skipped)

    res.status(200).json({
      sourcePath,
      imported,
      skipped: results.filter((r) => r.skipped),
      count: imported.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to import Live2D models'
    console.error('[import-live2d-from-path]', error)
    res.status(500).json({ error: message })
  }
}
