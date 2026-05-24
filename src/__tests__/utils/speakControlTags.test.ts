import {
  sanitizeVisionCommentaryText,
  stripSpeakControlTags,
} from '@/utils/speakControlTags'

describe('stripSpeakControlTags', () => {
  it('文中の stunt / thought / 感情タグを除去する', () => {
    const input =
      '[stunt:lean_in]わわっ、画面が切り替わった！[thought]テキストを分割して'
    expect(stripSpeakControlTags(input)).toBe(
      'わわっ、画面が切り替わった！テキストを分割して'
    )
  })

  it('文中の laugh / curious タグを除去する', () => {
    const input =
      'お腹空いてきちゃった！[laugh:short] 〇〇さんは食べた？[curious]'
    expect(stripSpeakControlTags(input)).toBe(
      'お腹空いてきちゃった！ 〇〇さんは食べた？'
    )
  })
})

describe('sanitizeVisionCommentaryText', () => {
  it('実況らしい混在タグをプレーン日本語にする', () => {
    const input =
      '[surprised][stunt:lean_in]左側にGeminiって書いてある！[thought]面白いね'
    expect(sanitizeVisionCommentaryText(input)).toBe(
      '左側にGeminiって書いてある！面白いね'
    )
  })
})
