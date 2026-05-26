import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { isRestrictedMode } from '@/utils/restrictedMode'

export const config = {
  api: { bodyParser: { sizeLimit: '24mb' } },
}

type RequestBody = {
  name: string
  bodyB64: string
  mouthClosedB64?: string
  mouthOpenB64?: string
  mouthHalfB64?: string
  // Mouth position in the body image (0-1 relative coords)
  mouthX?: number
  mouthY?: number
  mouthW?: number
  mouthH?: number
}

type ResponseData = { path: string } | { error: string }

/** デフォルトの口位置 (1024x1024 前提: 中央・下部 60〜70%) */
function buildMouthTrack(
  imgW: number,
  imgH: number,
  mouthX = 0.5,
  mouthY = 0.64,
  mouthW = 0.38,
  mouthH = 0.085
) {
  const cx = imgW * mouthX
  const cy = imgH * mouthY
  const hw = (imgW * mouthW) / 2
  const hh = (imgH * mouthH) / 2
  return {
    fps: 30,
    width: imgW,
    height: imgH,
    refSpriteSize: [Math.round(hw * 2), Math.round(hh * 2)],
    calibration: { offset: [0, 0], scale: 1.0, rotation: 0 },
    calibrationApplied: false,
    frames: [
      {
        quad: [
          [Math.round(cx - hw), Math.round(cy - hh)],
          [Math.round(cx + hw), Math.round(cy - hh)],
          [Math.round(cx + hw), Math.round(cy + hh)],
          [Math.round(cx - hw), Math.round(cy + hh)],
        ],
        valid: true,
      },
    ],
  }
}

function getImageDimensions(b64: string): { w: number; h: number } {
  // PNG: width at bytes 16-19, height at 20-23 of IHDR
  try {
    const buf = Buffer.from(b64, 'base64')
    if (buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      // PNG header
      const w = buf.readUInt32BE(16)
      const h = buf.readUInt32BE(20)
      return { w, h }
    }
  } catch {
    // fallback
  }
  return { w: 1024, h: 1024 }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') return res.status(405).end()
  if (isRestrictedMode())
    return res.status(403).json({ error: 'Restricted mode' })

  const {
    name,
    bodyB64,
    mouthClosedB64,
    mouthOpenB64,
    mouthHalfB64,
    mouthX,
    mouthY,
    mouthW,
    mouthH,
  } = req.body as RequestBody

  if (!name || !bodyB64)
    return res.status(400).json({ error: 'name and bodyB64 required' })

  // Sanitize name
  const safeName = name
    .replace(/[^a-zA-Z0-9_\-あ-んア-ン一-龥]/g, '_')
    .slice(0, 40)
  const assetDir = path.join(process.cwd(), 'public', 'pngtuber', safeName)
  const mouthDir = path.join(assetDir, 'mouth')

  try {
    fs.mkdirSync(mouthDir, { recursive: true })

    // body.png
    const bodyBuf = Buffer.from(bodyB64, 'base64')
    fs.writeFileSync(path.join(assetDir, 'body.png'), bodyBuf)

    // Measure dimensions from PNG header
    const { w, h } = getImageDimensions(bodyB64)

    // mouth sprites (use body as fallback if not provided)
    const closedBuf = mouthClosedB64
      ? Buffer.from(mouthClosedB64, 'base64')
      : generateDefaultMouthSprite('closed')
    const openBuf = mouthOpenB64
      ? Buffer.from(mouthOpenB64, 'base64')
      : generateDefaultMouthSprite('open')

    fs.writeFileSync(path.join(mouthDir, 'closed.png'), closedBuf)
    fs.writeFileSync(path.join(mouthDir, 'open.png'), openBuf)

    if (mouthHalfB64) {
      fs.writeFileSync(
        path.join(mouthDir, 'half.png'),
        Buffer.from(mouthHalfB64, 'base64')
      )
    }

    // mouth_track.json
    const trackData = buildMouthTrack(w, h, mouthX, mouthY, mouthW, mouthH)
    fs.writeFileSync(
      path.join(assetDir, 'mouth_track.json'),
      JSON.stringify(trackData, null, 2)
    )

    return res.status(200).json({ path: `/pngtuber/${safeName}` })
  } catch (err) {
    console.error('[avatar/create-pngtuber]', err)
    return res.status(500).json({ error: String(err) })
  }
}

/** 最小限のデフォルト口スプライト PNG（純黒の小矩形）を生成 */
function generateDefaultMouthSprite(type: 'closed' | 'open'): Buffer {
  // 200x80 の 1bit PNG (黒 or 半透明楕円) をbase64で返す
  // 簡易: 既存の fixed PNG を埋め込む（実際は別途生成が必要だが、ここでは最小限）
  // Actually: 返す PNG は最低限の有効 PNG。ここでは透明 1x1 PNG を返す。
  // ユーザーが後から置き換え可能。
  const _ = type
  // 1x1 透明 PNG
  const png1x1 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  return Buffer.from(png1x1, 'base64')
}
