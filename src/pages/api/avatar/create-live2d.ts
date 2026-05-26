import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { isRestrictedMode } from '@/utils/restrictedMode'

export const config = {
  api: { bodyParser: { sizeLimit: '24mb' } },
}

type RequestBody = {
  name: string
  textureB64: string
  /** template model folder name under public/live2d (default: nike01) */
  templateName?: string
}

type ResponseData = { modelPath: string } | { error: string }

const TEMPLATE_MODEL3: Record<
  string,
  {
    moc3: string
    physics3: string
    cdi3?: string
    expressions: { Name: string; File: string }[]
    motions: Record<string, { File: string }[]>
    groups: { Target: string; Name: string; Ids: string[] }[]
  }
> = {
  nike01: {
    moc3: 'nike01.moc3',
    physics3: 'nike01.physics3.json',
    cdi3: 'nike01.cdi3.json',
    expressions: [
      { Name: 'Neutral', File: 'expressions/Neutral.exp3.json' },
      { Name: 'Happy', File: 'expressions/Happy.exp3.json' },
      { Name: 'Happy2', File: 'expressions/Happy2.exp3.json' },
      { Name: 'Sad', File: 'expressions/Sad.exp3.json' },
      { Name: 'Sad2', File: 'expressions/Sad2.exp3.json' },
      { Name: 'Troubled', File: 'expressions/Troubled.exp3.json' },
      { Name: 'Angry', File: 'expressions/Angry.exp3.json' },
      { Name: 'Focus', File: 'expressions/Focus.exp3.json' },
      { Name: 'Sleep', File: 'expressions/Sleep.exp3.json' },
      { Name: 'Zitome', File: 'expressions/Zitome.exp3.json' },
      { Name: 'Think', File: 'expressions/Think.exp3.json' },
      { Name: 'Think2', File: 'expressions/Think2.exp3.json' },
      { Name: 'NoSmile', File: 'expressions/NoSmile.exp3.json' },
    ],
    motions: {
      Idle: [
        { File: 'motions/Motion2.motion3.json' },
        { File: 'motions/Motion4.motion3.json' },
        { File: 'motions/Motion5.motion3.json' },
        { File: 'motions/Motion8.motion3.json' },
      ],
      Neutral: [
        { File: 'motions/Motion1.motion3.json' },
        { File: 'motions/Motion3.motion3.json' },
      ],
      Happy: [
        { File: 'motions/Motion1.motion3.json' },
        { File: 'motions/Motion3.motion3.json' },
      ],
      Sad: [
        { File: 'motions/Motion1.motion3.json' },
        { File: 'motions/Motion9.motion3.json' },
      ],
      Angry: [
        { File: 'motions/Motion7.motion3.json' },
        { File: 'motions/Motion9.motion3.json' },
      ],
      Relaxed: [
        { File: 'motions/Motion1.motion3.json' },
        { File: 'motions/Motion3.motion3.json' },
      ],
    },
    groups: [
      {
        Target: 'Parameter',
        Name: 'LipSync',
        Ids: ['ParamMouthOpenY'],
      },
      {
        Target: 'Parameter',
        Name: 'EyeBlink',
        Ids: ['ParamEyeLOpen', 'ParamEyeROpen'],
      },
    ],
  },
}

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') return res.status(405).end()
  if (isRestrictedMode())
    return res.status(403).json({ error: 'Restricted mode' })

  const { name, textureB64, templateName = 'nike01' } = req.body as RequestBody

  if (!name || !textureB64)
    return res.status(400).json({ error: 'name and textureB64 required' })

  const template = TEMPLATE_MODEL3[templateName]
  if (!template)
    return res.status(400).json({ error: `Unknown template: ${templateName}` })

  const safeName = name
    .replace(/[^a-zA-Z0-9_\-あ-んア-ン一-龥]/g, '_')
    .slice(0, 40)

  const templateDir = path.join(process.cwd(), 'public', 'live2d', templateName)
  const destDir = path.join(process.cwd(), 'public', 'live2d', safeName)
  const textureDir = path.join(destDir, `${safeName}.texture`)

  try {
    fs.mkdirSync(destDir, { recursive: true })
    fs.mkdirSync(textureDir, { recursive: true })

    // Copy moc3
    fs.copyFileSync(
      path.join(templateDir, template.moc3),
      path.join(destDir, `${safeName}.moc3`)
    )

    // Copy physics
    fs.copyFileSync(
      path.join(templateDir, template.physics3),
      path.join(destDir, `${safeName}.physics3.json`)
    )

    // Copy cdi3 (optional)
    if (template.cdi3) {
      const cdiSrc = path.join(templateDir, template.cdi3)
      if (fs.existsSync(cdiSrc)) {
        fs.copyFileSync(cdiSrc, path.join(destDir, `${safeName}.cdi3.json`))
      }
    }

    // Copy expressions directory
    const expSrc = path.join(templateDir, 'expressions')
    if (fs.existsSync(expSrc)) {
      copyDirSync(expSrc, path.join(destDir, 'expressions'))
    }

    // Copy motions directory
    const motionSrc = path.join(templateDir, 'motions')
    if (fs.existsSync(motionSrc)) {
      copyDirSync(motionSrc, path.join(destDir, 'motions'))
    }

    // Save AI-generated texture
    const textureBuf = Buffer.from(textureB64, 'base64')
    fs.writeFileSync(path.join(textureDir, 'texture_00.png'), textureBuf)

    // Build model3.json with updated expressions referencing texture path
    const model3 = {
      Version: 3,
      FileReferences: {
        Moc: `${safeName}.moc3`,
        Textures: [`${safeName}.texture/texture_00.png`],
        Physics: `${safeName}.physics3.json`,
        ...(template.cdi3 && { DisplayInfo: `${safeName}.cdi3.json` }),
        Expressions: template.expressions,
        Motions: template.motions,
      },
      Groups: template.groups,
    }

    fs.writeFileSync(
      path.join(destDir, `${safeName}.model3.json`),
      JSON.stringify(model3, null, 2)
    )

    return res
      .status(200)
      .json({ modelPath: `/live2d/${safeName}/${safeName}.model3.json` })
  } catch (err) {
    console.error('[avatar/create-live2d]', err)
    return res.status(500).json({ error: String(err) })
  }
}
