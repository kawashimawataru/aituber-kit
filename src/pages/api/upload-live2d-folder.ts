import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import {
  isLive2DEnabled,
  createLive2DRestrictionErrorResponse,
} from '@/utils/live2dRestriction'
import {
  isRestrictedMode,
  createRestrictedModeErrorResponse,
} from '@/utils/restrictedMode'
import { saveUploadedLive2DFiles } from '@/lib/live2d/importModels'

export const config = {
  api: {
    bodyParser: false,
  },
}

const formOptions = {
  maxFileSize: 500 * 1024 * 1024,
  maxFiles: 5000,
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
      .json(createRestrictedModeErrorResponse('upload-live2d-folder'))
  }

  const form = formidable(formOptions)

  try {
    const [, files] = await form.parse(req)
    const uploaded = files.files
    const fileList = Array.isArray(uploaded)
      ? uploaded
      : uploaded
        ? [uploaded]
        : []

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const toSave = fileList
      .filter((f) => f.filepath && f.originalFilename)
      .map((f) => ({
        filepath: f.filepath,
        relativePath: f.originalFilename!.replace(/\\/g, '/'),
      }))

    const results = await saveUploadedLive2DFiles(toSave)
    const imported = results.filter((r) => r.path && !r.skipped)

    res.status(200).json({
      imported,
      skipped: results.filter((r) => r.skipped),
      count: imported.length,
    })
  } catch (error) {
    console.error('[upload-live2d-folder]', error)
    res.status(500).json({ error: 'Failed to upload Live2D folder' })
  }
}
