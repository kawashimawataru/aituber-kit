import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import {
  isRestrictedMode,
  createRestrictedModeErrorResponse,
} from '@/utils/restrictedMode'

export const config = {
  api: {
    bodyParser: false,
  },
}

const VALID_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']

const formOptions: formidable.Options = {
  maxFileSize: 50 * 1024 * 1024,
  filter: (part) => {
    const mime = part.mimetype || ''
    return mime.startsWith('audio/') || mime === 'application/octet-stream'
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (isRestrictedMode()) {
    return res.status(403).json(createRestrictedModeErrorResponse('upload-bgm'))
  }

  const form = formidable(formOptions)

  try {
    const [, files] = await form.parse(req)
    const file = files.file?.[0]

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const extension = path.extname(file.originalFilename || '').toLowerCase()

    if (!VALID_EXTENSIONS.includes(extension)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'MP3, WAV, OGG, M4A, AAC, FLAC のみアップロードできます',
      })
    }

    const bgmDir = path.join(process.cwd(), 'public/bgm')
    if (!fs.existsSync(bgmDir)) {
      fs.mkdirSync(bgmDir, { recursive: true })
    }

    const filename = path.basename(file.originalFilename || `bgm${extension}`)
    const newPath = path.join(bgmDir, filename)
    await fs.promises.copyFile(file.filepath, newPath)

    res.status(200).json({
      path: `/bgm/${filename}`,
    })
  } catch (error) {
    console.error('BGM upload failed:', error)
    res.status(500).json({ error: 'Failed to upload BGM file' })
  }
}
