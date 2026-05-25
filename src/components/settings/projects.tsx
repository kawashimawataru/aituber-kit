import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import projectStore from '@/features/stores/projectStore'
import { PROJECT_REGISTRY } from '@/features/projects/registry'
import type { ProjectManifest } from '@/features/projects/types'

type SortKey = 'status' | 'name'

const Projects = () => {
  const { t } = useTranslation()
  const activeIds = projectStore((s) => s.activeProjectIds)
  const { activateProject, deactivateProject } = projectStore.getState()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('status')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo<ProjectManifest[]>(() => {
    let list = [...PROJECT_REGISTRY]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    }
    if (sort === 'status') {
      list.sort((a, b) => {
        const aOn = activeIds.includes(a.id)
        const bOn = activeIds.includes(b.id)
        if (aOn === bOn) return a.name.localeCompare(b.name, 'ja')
        return aOn ? -1 : 1
      })
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    }
    return list
  }, [search, sort, activeIds])

  const selectedProject = selectedId
    ? (PROJECT_REGISTRY.find((p) => p.id === selectedId) ?? null)
    : null

  const toggleActive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (activeIds.includes(id)) {
      deactivateProject(id)
    } else {
      activateProject(id)
    }
  }

  return (
    <div className="my-10">
      <div className="my-4 text-xl font-bold">{t('ProjectsTitle')}</div>
      <div className="my-2 text-sm whitespace-pre-wrap text-gray-600">
        {t('ProjectsDesc')}
      </div>

      {/* ── Controls ─────────────────────────────────────────── */}
      <div className="flex gap-2 mt-4 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="企画を検索…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary bg-white"
        >
          <option value="status">ステータス順</option>
          <option value="name">名前順 (A-Z)</option>
        </select>
      </div>

      {/* ── Active badge summary ──────────────────────────────── */}
      {activeIds.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {activeIds.map((id) => {
            const proj = PROJECT_REGISTRY.find((p) => p.id === id)
            if (!proj) return null
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 text-primary text-xs rounded-full font-medium"
              >
                {proj.icon} {proj.name}
                <button
                  className="text-primary/60 hover:text-primary ml-0.5 leading-none"
                  onClick={() => deactivateProject(id)}
                  aria-label={`${proj.name}をオフ`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* ── Main layout: list + detail panel ─────────────────── */}
      <div className="flex gap-4">
        {/* Project list */}
        <div
          className={`${selectedProject ? 'w-2/5' : 'w-full'} transition-all duration-200`}
        >
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">
              該当する企画が見つかりません
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((proj) => {
                const isActive = activeIds.includes(proj.id)
                const isSelected = selectedId === proj.id
                return (
                  <div
                    key={proj.id}
                    className={`rounded-xl border-2 p-3 cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'border-primary bg-primary/8 shadow-sm'
                        : isActive
                          ? 'border-primary/40 bg-primary/4 hover:border-primary/60'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedId(isSelected ? null : proj.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none shrink-0">
                        {proj.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm leading-tight">
                          {proj.name}
                        </div>
                        {!selectedProject && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {proj.description}
                          </div>
                        )}
                      </div>
                      <button
                        className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-primary text-theme hover:bg-primary/80'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        onClick={(e) => toggleActive(proj.id, e)}
                      >
                        {isActive ? t('ProjectActive') : t('ProjectInactive')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedProject && (
          <div className="flex-1 border-2 border-gray-200 rounded-xl p-4 animate-fade-in-right min-w-0">
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-2xl leading-none">
                {selectedProject.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base">
                  {selectedProject.name}
                </div>
                <div className="text-xs text-gray-500 leading-snug mt-0.5">
                  {selectedProject.description}
                </div>
              </div>
              <button
                className="shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
                onClick={() => setSelectedId(null)}
                aria-label="パネルを閉じる"
              >
                ✕
              </button>
            </div>

            {/* Toggle button */}
            <button
              className={`w-full py-2 rounded-xl font-bold text-sm mb-4 transition-colors ${
                activeIds.includes(selectedProject.id)
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
              }`}
              onClick={() => toggleActive(selectedProject.id)}
            >
              {activeIds.includes(selectedProject.id)
                ? '⏹ オフにする'
                : '▶ アクティブにする'}
            </button>

            {/* Project-specific settings */}
            {selectedProject.DetailComponent ? (
              <selectedProject.DetailComponent />
            ) : (
              <div className="text-xs text-gray-400 text-center py-4">
                この企画には追加設定がありません
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {activeIds.length > 0 && (
        <div className="mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="text-xs font-bold text-amber-800 mb-0.5">
            {t('ProjectsActiveNote')}
          </div>
          <div className="text-xs text-amber-700">
            {t('ProjectsActiveNoteDesc')}
          </div>
        </div>
      )}
    </div>
  )
}

export default Projects
