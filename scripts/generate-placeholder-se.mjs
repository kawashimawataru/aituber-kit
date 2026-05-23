/**
 * プレースホルダー SE（無音 WAV）を生成するスクリプト
 *
 * 使い方: node scripts/generate-placeholder-se.mjs
 *
 * 出力先: public/assets/reactions/
 * フォーマット: 44100Hz, mono, 16-bit PCM, 無音
 *
 * 本番では各ファイルを実際の効果音に差し替えること。
 * 差し替え手順:
 *   1. 各 .wav を同名の実音源（mono/stereo, 44100Hz 推奨）で上書き
 *   2. ライセンス確認済みの素材を使用すること
 *   3. このスクリプトの再実行でプレースホルダーに戻すことができる
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'reactions')

// 生成するファイルとその長さ（秒）
const FILES = [
  // 笑い SE（L3 事後非言語）
  { name: 'laugh_short.wav', durationSec: 0.3 },
  { name: 'laugh_medium.wav', durationSec: 0.6 },
  { name: 'laugh_big.wav', durationSec: 1.0 },
  // stunt SE（seFile が設定されているもの）
  { name: 'stunt_desk_slam.wav', durationSec: 0.4 },
  { name: 'stunt_desk_slam_light.wav', durationSec: 0.25 },
  { name: 'stunt_head_hold.wav', durationSec: 0.5 },
  { name: 'stunt_flinch.wav', durationSec: 0.2 },
  { name: 'stunt_rage_quiver.wav', durationSec: 0.6 },
  { name: 'stunt_collapse.wav', durationSec: 0.8 },
]

const SAMPLE_RATE = 44100
const NUM_CHANNELS = 1
const BITS_PER_SAMPLE = 16

/**
 * 無音モノラル WAV バッファを生成する
 */
function makeSilentWav(durationSec) {
  const numSamples = Math.ceil(SAMPLE_RATE * durationSec)
  const dataSize = numSamples * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF ヘッダー
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt チャンク
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)         // Subchunk1Size
  buffer.writeUInt16LE(1, 20)          // PCM
  buffer.writeUInt16LE(NUM_CHANNELS, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 28) // ByteRate
  buffer.writeUInt16LE(NUM_CHANNELS * (BITS_PER_SAMPLE / 8), 32) // BlockAlign
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34)

  // data チャンク
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  // ペイロードは all-zeros（無音）

  return buffer
}

fs.mkdirSync(OUT_DIR, { recursive: true })

let created = 0
let skipped = 0

for (const { name, durationSec } of FILES) {
  const dest = path.join(OUT_DIR, name)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100) {
    console.log(`  skip  ${name} (既存ファイルが存在)`)
    skipped++
    continue
  }
  const wav = makeSilentWav(durationSec)
  fs.writeFileSync(dest, wav)
  console.log(`  wrote ${name} (${durationSec}s silent, ${wav.length} bytes)`)
  created++
}

console.log(`\n完了: ${created} 個生成, ${skipped} 個スキップ`)
console.log(`出力先: ${OUT_DIR}`)
console.log('\n⚠ プレースホルダーは無音です。実際の SE に差し替えてください。')
