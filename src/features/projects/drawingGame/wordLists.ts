export type Difficulty = 'easy' | 'normal' | 'hard'

export const WORD_LISTS: Record<Difficulty, string[]> = {
  easy: [
    // 動物
    '猫',
    '犬',
    '魚',
    '鳥',
    '象',
    'うさぎ',
    'クマ',
    'カエル',
    'ペンギン',
    'サル',
    // 食べ物
    'りんご',
    'バナナ',
    'ケーキ',
    'ピザ',
    'すし',
    'ラーメン',
    'いちご',
    'みかん',
    // 乗り物
    '車',
    '電車',
    '飛行機',
    '船',
    '自転車',
    // 自然
    '山',
    '花',
    '太陽',
    '月',
    '木',
    '星',
    '雲',
    // 日用品
    '家',
    '傘',
    '本',
    '時計',
    'かさ',
  ],
  normal: [
    // 動物
    'ライオン',
    'キリン',
    'シマウマ',
    'タコ',
    'クジラ',
    'オウム',
    'カメ',
    'ワニ',
    // 食べ物
    'アイスクリーム',
    'ハンバーガー',
    'チョコレート',
    'たこ焼き',
    'おにぎり',
    'スイカ',
    // スポーツ
    'サッカー',
    '野球',
    '水泳',
    'テニス',
    // 道具・物
    '眼鏡',
    'ハサミ',
    '鍵',
    '電球',
    'テレビ',
    'カメラ',
    '電話',
    // 自然現象
    '虹',
    '雪',
    '雨',
    '火',
    '波',
    // 建物
    '城',
    '橋',
    '灯台',
  ],
  hard: [
    // 抽象
    '夢',
    '音楽',
    '笑顔',
    '友情',
    '驚き',
    // 複雑な物
    '東京タワー',
    '富士山',
    '桜',
    '浴衣',
    '将棋',
    // 動作
    '走る',
    '踊る',
    '泳ぐ',
    '飛ぶ',
    '眠る',
    // 概念
    '平和',
    '時間',
    '未来',
    '思い出',
  ],
}

export function pickWord(
  difficulty: Difficulty,
  usedWords: Set<string>
): string {
  const pool = WORD_LISTS[difficulty]
  const available = pool.filter((w) => !usedWords.has(w))
  const list = available.length > 0 ? available : pool
  return list[Math.floor(Math.random() * list.length)]
}
