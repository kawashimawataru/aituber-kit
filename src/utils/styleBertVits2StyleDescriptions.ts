/**
 * Style-Bert-VITS2 のスタイル名 → 聴感の説明（設定 UI 用）
 * モデル独自名（01, 02 等）は汎用説明にフォールバック
 */

const STYLE_DESCRIPTIONS: Record<string, string> = {
  Neutral:
    '落ち着いた通常の声。ニュートラルでバランスの取れた読み上げ。日常会話・説明向き。',
  neutral:
    '落ち着いた通常の声。ニュートラルでバランスの取れた読み上げ。日常会話・説明向き。',
  Happy: '明るく弾む声。喜び・興奮・テンション高めのリアクション向き。',
  happy: '明るく弾む声。喜び・興奮・テンション高めのリアクション向き。',
  Sad: '低めでしっとりした声。悲しみ・落ち込み・しんみりした場面向き。',
  sad: '低めでしっとりした声。悲しみ・落ち込み・しんみりした場面向き。',
  Angry: '強めでキレのある声。怒り・ツッコミ・ぷんぷんした反応向き。',
  angry: '強めでキレのある声。怒り・ツッコミ・ぷんぷんした反応向き。',
  Surprised: '驚き・仰天した声。急な展開・「えっ！」系の反応向き。',
  surprised: '驚き・仰天した声。急な展開・「えっ！」系の反応向き。',
  Surprise: '驚き・仰天した声。急な展開・「えっ！」系の反応向き。',
  Fear: '不安・おびえた声。緊張・ビビり・怯えた表現向き。',
  fear: '不安・おびえた声。緊張・ビビり・怯えた表現向き。',
  Disgust: '嫌悪・呆れた声。引き・ツッコミ・「いやそれ…」向き。',
  disgust: '嫌悪・呆れた声。引き・ツッコミ・「いやそれ…」向き。',
  Relaxed: 'ゆったり柔らかい声。リラックス・雑談・優しいトーン向き。',
  relaxed: 'ゆったり柔らかい声。リラックス・雑談・優しいトーン向き。',
  Sleepy: '眠そう・だるそうな声。トローン・寝起き・低テンション向き。',
  sleepy: '眠そう・だるそうな声。トローン・寝起き・低テンション向き。',
  Whisper: 'ささやき声。小声・秘密・近くで話す感じ。',
  whisper: 'ささやき声。小声・秘密・近くで話す感じ。',
  Shout: '大きめ・叫び寄りの声。強調・盛り上げ・オーバーな反応向き。',
  shout: '大きめ・叫び寄りの声。強調・盛り上げ・オーバーな反応向き。',
}

const NUMBERED_STYLE_HINT =
  'このモデル専用のスタイル番号です。聴感はモデル学習データに依存します。ボイステストで確認してください。'

/**
 * スタイル名の聴感説明を返す
 */
export function getStyleBertVits2StyleDescription(styleName: string): string {
  const trimmed = styleName.trim()
  if (!trimmed) {
    return 'スタイル未選択。モデル一覧を取得してから選んでください。'
  }

  if (STYLE_DESCRIPTIONS[trimmed]) {
    return STYLE_DESCRIPTIONS[trimmed]
  }

  if (/^\d+$/.test(trimmed)) {
    return `スタイル「${trimmed}」: ${NUMBERED_STYLE_HINT}`
  }

  return `スタイル「${trimmed}」: モデル固有のスタイル名です。ボイステストで聴き比べてください。`
}

/**
 * ドロップダウン用の短いラベル（名前 — 要約）
 */
export function formatStyleBertVits2StyleOptionLabel(
  styleName: string
): string {
  const desc = getStyleBertVits2StyleDescription(styleName)
  const short = desc.split('。')[0].slice(0, 28)
  return `${styleName} — ${short}${desc.length > short.length ? '…' : ''}`
}

/**
 * モデル表示用の補足（話者一覧）
 */
export function formatSbv2ModelOptionLabel(
  label: string,
  modelId: string,
  speakers: string[]
): string {
  const spk = speakers.length > 0 ? ` / 話者: ${speakers.join(', ')}` : ''
  return `${label} (ID: ${modelId})${spk}`
}
