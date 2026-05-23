import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { isRestrictedMode } from '@/utils/restrictedMode'

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (isRestrictedMode()) {
    return res.status(200).json([])
  }

  try {
    const bgmDir = path.join(process.cwd(), 'public/bgm')

    if (!fs.existsSync(bgmDir)) {
      fs.mkdirSync(bgmDir, { recursive: true })
      return res.status(200).json([])
    }

    const files = fs.readdirSync(bgmDir)
    const audioFiles = files.filter((file) => {
      const extension = path.extname(file).toLowerCase()
      return AUDIO_EXTENSIONS.includes(extension)
    })

    audioFiles.sort((a, b) => a.localeCompare(b, 'ja'))
    res.status(200).json(audioFiles)
  } catch (error) {
    console.error('Error fetching BGM list:', error)
    res.status(500).json({ error: 'Failed to fetch BGM list' })
  }
}
