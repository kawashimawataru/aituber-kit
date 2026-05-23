import { NextApiRequest, NextApiResponse } from 'next'
import { exec } from 'child_process'
import fs from 'fs'
import {
  isLive2DEnabled,
  createLive2DRestrictionErrorResponse,
} from '@/utils/live2dRestriction'
import {
  isRestrictedMode,
  createRestrictedModeErrorResponse,
} from '@/utils/restrictedMode'
import { getLive2dStorageDir } from '@/lib/live2d/importModels'

function openDirectoryInFileManager(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const platform = process.platform
    let command: string
    if (platform === 'darwin') {
      command = `open "${dir.replace(/"/g, '\\"')}"`
    } else if (platform === 'win32') {
      command = `explorer "${dir.replace(/"/g, '')}"`
    } else {
      command = `xdg-open "${dir.replace(/"/g, '\\"')}"`
    }
    exec(command, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
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
      .json(createRestrictedModeErrorResponse('open-live2d-storage'))
  }

  try {
    const dir = getLive2dStorageDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    await openDirectoryInFileManager(dir)

    res.status(200).json({ path: dir })
  } catch (error) {
    console.error('[open-live2d-storage]', error)
    res.status(500).json({
      error: 'Failed to open storage folder',
      path: getLive2dStorageDir(),
    })
  }
}
