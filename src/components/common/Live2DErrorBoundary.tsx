'use client'

import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean; message?: string }

export class Live2DErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Live2D] render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg bg-red-900/85 p-4 text-sm text-white shadow-lg">
          <p className="font-medium">Live2D の表示でエラーが発生しました</p>
          <p className="mt-2 opacity-90">
            設定 → キャラクターで別モデルを選ぶか、
            public/scripts/live2dcubismcore.min.js を確認してください。
          </p>
          {this.state.message && (
            <p className="mt-2 text-xs opacity-75 break-all">
              {this.state.message}
            </p>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
