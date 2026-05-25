import type { ProjectManifest } from './types'
import { englishPracticeProject } from './englishPractice'
import { pianoPerformanceProject } from './pianoPerformance'
import { drawingGameProject } from './drawingGame'

/**
 * 利用可能なプロジェクト一覧
 * 新しいプロジェクトはここに追加するだけで管理画面に表示される
 */
export const PROJECT_REGISTRY: ProjectManifest[] = [
  englishPracticeProject,
  pianoPerformanceProject,
  drawingGameProject,
]

export function getProject(id: string): ProjectManifest | undefined {
  return PROJECT_REGISTRY.find((p) => p.id === id)
}
