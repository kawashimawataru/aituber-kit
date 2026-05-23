import { NextApiRequest, NextApiResponse } from 'next'
import {
  isLive2DEnabled,
  createLive2DRestrictionErrorResponse,
} from '@/utils/live2dRestriction'
import { isRestrictedMode } from '@/utils/restrictedMode'
import assetManifest from '@/constants/assetManifest.json'
import { discoverLive2DModelsInRoot } from '@/lib/live2d/discoverModel'
import { getLive2dStorageDir } from '@/lib/live2d/importModels'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isLive2DEnabled()) {
    return res.status(403).json(createLive2DRestrictionErrorResponse())
  }

  if (isRestrictedMode()) {
    return res.status(200).json(assetManifest.live2d)
  }

  try {
    const live2dModels = await discoverLive2DModelsInRoot(getLive2dStorageDir())
    res.status(200).json(live2dModels)
  } catch (error) {
    console.error('Error reading Live2D directory:', error)
    res.status(500).json({
      error: 'Failed to get Live2D model list',
    })
  }
}
