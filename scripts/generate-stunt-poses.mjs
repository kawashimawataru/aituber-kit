/**
 * stunt 用 VRM ポーズ JSON を生成するスクリプト
 * 出力先: public/poses/stunt_*.json
 *
 * フォーマット: VRM Web Pose 簡易形式
 *   { "version": "1.0", "pose": { boneName: { "rotation": [x,y,z,w] } } }
 * loadPoseFromJSON.ts の convertWebPoseToVrma で自動変換される
 *
 * 四元数表記: [x, y, z, w]
 * VRM 正規化空間: Y上, Z前, X右
 * 各ボーン局所空間で:
 *   +X 回転 = 前屈 (flexion)
 *   -X 回転 = 後屈 (extension)
 *   +Z 回転 = 左傾き (右から見て反時計回り)
 *   -Z 回転 = 右傾き
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'poses')

// 角度(度)→四元数ヘルパー
function q(axis, deg) {
  const r = (deg * Math.PI) / 180
  const s = Math.sin(r / 2)
  const c = Math.cos(r / 2)
  return axis === 'x' ? [s, 0, 0, c]
       : axis === 'y' ? [0, s, 0, c]
       : axis === 'z' ? [0, 0, s, c]
       : [0, 0, 0, 1]
}

// クォータニオン乗算 (a * b)
function qmul(a, b) {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw*bx + ax*bw + ay*bz - az*by,
    aw*by - ax*bz + ay*bw + az*bx,
    aw*bz + ax*by - ay*bx + az*bw,
    aw*bw - ax*bx - ay*by - az*bz,
  ].map(v => Math.round(v * 10000) / 10000)
}

// ポーズ定義
const POSES = {
  stunt_lean_in: {
    // 前のめり（eagerly leaning in）
    spine: q('x', 15),
    chest: q('x', 10),
    head:  q('x', 5),
  },

  stunt_lean_forward: {
    // 乗り出す（leaning forward, more dramatic）
    spine: q('x', 22),
    chest: q('x', 15),
    neck:  q('x', 5),
    head:  q('x', 8),
  },

  stunt_lean_back: {
    // のけぞる（surprised lean back）
    spine: q('x', -18),
    chest: q('x', -12),
    neck:  q('x', -5),
    head:  q('x', -8),
  },

  stunt_tilt_head: {
    // 首をかしげる（right tilt）
    neck: q('z', -12),
    head: q('z', -18),
  },

  stunt_flinch: {
    // びくっ（recoil / flinch backward）
    spine:         q('x', -20),
    chest:         q('x', -15),
    head:          q('x', -10),
    leftShoulder:  q('x', -8),
    rightShoulder: q('x', -8),
  },

  stunt_head_hold: {
    // 頭を抱える（both hands reaching toward head area）
    // 上腕を頭の方向に傾ける: 左は右回転、右は左回転
    leftUpperArm:  qmul(q('z', -60), q('x', -20)),
    rightUpperArm: qmul(q('z',  60), q('x', -20)),
    leftLowerArm:  q('y', 50),
    rightLowerArm: q('y', -50),
    head:          q('x', 5),
    chest:         q('x', 8),
  },

  stunt_slam: {
    // 机をドン（right fist slam）
    spine:         q('x', 18),
    chest:         q('x', 12),
    head:          q('x', 8),
    rightUpperArm: qmul(q('z', 35), q('x', 15)),
    rightLowerArm: q('y', -20),
    rightHand:     q('x', 20),
  },

  stunt_slam_light: {
    // 机をポン（lighter slam）
    spine:         q('x', 12),
    chest:         q('x', 8),
    head:          q('x', 5),
    rightUpperArm: qmul(q('z', 25), q('x', 10)),
    rightLowerArm: q('y', -15),
  },

  stunt_rage_quiver: {
    // 震える怒り（tense fists, slight lean）
    spine:         q('x', 10),
    chest:         q('x', 8),
    leftUpperArm:  qmul(q('z', -20), q('x', 10)),
    rightUpperArm: qmul(q('z',  20), q('x', 10)),
    leftLowerArm:  q('y', 30),
    rightLowerArm: q('y', -30),
    leftHand:      q('x', -15),
    rightHand:     q('x', -15),
  },

  stunt_collapse: {
    // ガクッ（slump forward exhausted）
    spine: q('x', 30),
    chest: q('x', 20),
    neck:  q('x', 10),
    head:  q('x', 15),
    leftUpperArm:  q('z', 10),
    rightUpperArm: q('z', -10),
  },

  stunt_point: {
    // 指さす（pointing right hand forward）
    rightUpperArm: qmul(q('z', 45), q('x', -10)),
    rightLowerArm: q('y', -10),
    rightHand:     q('x', -5),
    chest:         q('y', -5),
    spine:         q('y', -3),
  },
}

fs.mkdirSync(OUT_DIR, { recursive: true })

let created = 0
let skipped = 0

for (const [name, boneData] of Object.entries(POSES)) {
  const filePath = path.join(OUT_DIR, `${name}.json`)
  if (fs.existsSync(filePath)) {
    console.log(`  skip  ${name}.json (既存ファイルが存在)`)
    skipped++
    continue
  }

  const pose = {}
  for (const [boneName, rotation] of Object.entries(boneData)) {
    pose[boneName] = { rotation }
  }

  const json = {
    version: '1.0',
    pose,
  }

  fs.writeFileSync(filePath, JSON.stringify(json, null, 2))
  console.log(`  wrote ${name}.json (${Object.keys(boneData).length} bones)`)
  created++
}

console.log(`\n完了: ${created} 個生成, ${skipped} 個スキップ`)
console.log(`出力先: ${OUT_DIR}`)
console.log('\n⚠ 値は近似値です。VRM エディタで微調整することを推奨します。')
