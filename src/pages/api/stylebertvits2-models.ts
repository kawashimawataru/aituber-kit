import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'

export interface StyleBertVits2ModelOption {
  modelId: string
  label: string
  styles: string[]
  speakers: string[]
}

type ModelsInfoResponse = Record<
  string,
  {
    model_path?: string
    config_path?: string
    spk2id?: Record<string, number>
    style2id?: Record<string, number>
  }
>

function resolveServerUrl(queryUrl?: string | string[]): string {
  const fromQuery = Array.isArray(queryUrl) ? queryUrl[0] : queryUrl
  const url = (
    fromQuery?.trim() ||
    process.env.STYLEBERTVITS2_SERVER_URL ||
    ''
  ).trim()
  if (!url) {
    throw new Error('Style-Bert-VITS2 server URL is not configured')
  }
  return url.replace(/\/$/, '')
}

function labelFromModelInfo(info: ModelsInfoResponse[string]): string {
  const modelPath = info.model_path || info.config_path || ''
  if (modelPath) {
    const parts = modelPath.replace(/\\/g, '/').split('/')
    const assetsIdx = parts.indexOf('model_assets')
    if (assetsIdx >= 0 && parts[assetsIdx + 1]) {
      return parts[assetsIdx + 1]
    }
    return path.basename(path.dirname(modelPath)) || path.basename(modelPath)
  }
  return 'model'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const serverUrl = resolveServerUrl(req.query.serverUrl)
    const response = await fetch(`${serverUrl}/models/info`, {
      method: 'GET',
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(response.status).json({
        error: `SBV2 /models/info failed (${response.status}): ${text.slice(0, 200)}`,
      })
    }

    const data = (await response.json()) as ModelsInfoResponse
    const models: StyleBertVits2ModelOption[] = Object.entries(data).map(
      ([modelId, info]) => ({
        modelId,
        label: labelFromModelInfo(info),
        styles: Object.keys(info.style2id || {}),
        speakers: Object.keys(info.spk2id || {}),
      })
    )

    models.sort((a, b) => a.label.localeCompare(b.label, 'ja'))

    return res.status(200).json({ serverUrl, models })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch SBV2 models'
    console.error('[stylebertvits2-models]', error)
    return res.status(500).json({ error: message })
  }
}
