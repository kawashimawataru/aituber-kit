import type React from 'react'

export interface ProjectManifest {
  id: string
  /** 表示名 */
  name: string
  /** 説明 */
  description: string
  /** emoji or path */
  icon: string
  /** システムプロンプト末尾に追記するテキストを返す関数 */
  systemPromptAppend?: () => string
  /** AI応答完了後に呼ばれるフック */
  onAiResponse?: (text: string) => void
  /** 企画詳細パネルで表示するカスタム設定コンポーネント */
  DetailComponent?: React.ComponentType
}
