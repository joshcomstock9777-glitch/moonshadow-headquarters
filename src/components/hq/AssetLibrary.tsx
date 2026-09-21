import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Asset, Project } from '../../lib/hqTypes'
import {
  ASSET_KINDS,
  ASSET_KIND_LABELS,
  ASSET_KIND_GLYPHS,
  ASSET_SOURCES,
  timeAgo,
  type AssetKind,
} from '../../lib/hq'
import { logActivity } from '../../lib/hq'
import WorkspaceIntake from '../shared/WorkspaceIntake'
import type { WorkspaceAttachment } from '../../lib/workspaceAttachments'

export default function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<'all' | AssetKind>('all')
  const [filterProject, setFilterProject] = useState<'all' | string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [quickUploads, setQuickUploads] = useState<WorkspaceAttachment[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setAssetsError(null)
    setProjectsError(null)

    const [a, p] = await Promise.all([
      supabase.from('assets').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
    ])

    if (a.error) {
      setAssetsError(a.error.message)
    } else {
      setAssets(a.data ?? [])
    }

    if (p.error) {
      setProjectsError(p.error.message)
    } else {
      setProjects(p.data ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = assets.filter(
    (a) =>
      (filterKind === 'all' || a.kind === filterKind) &&
      (filterProject === 'all' || a.project_id === filterProject),
  )

  const projectMap = new Map(projects.map((p) => [p.id, p.title]))
  const liveEvidenceUnavailable = Boolean(assetsError || projectsError)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            <span className="h-px w-8 bg-blood-700" /> Asset Library
          </p>
          <h1 className="section-title">
            Every asset, with its
            <span className="italic text-blood-500"> story.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-ink-300">
            Project-aware media with provenance. Originals are preserved —
            revisions are new rows, never overwrites.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary"
          disabled={Boolean(projectsError)}
          title={projectsError ? 'Project evidence is unavailable. Retry before adding project-linked assets.' : undefined}
        >
          Add Asset
        </button>
      </div>

      {liveEvidenceUnavailable && (
        <div className="card border-blood-700/60 bg-blood-900/20 p-4" role="alert">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blood-300">
                Live evidence unavailable
              </p>
              <p className="mt-2 text-sm text-ink-300">
                Headquarters could not verify all Asset Library data. Existing rows are preserved, but missing evidence is not being treated as an empty library.
              </p>
              {assetsError && <p className="mt-2 text-xs text-blood-300">Assets: {assetsError}</p>}
              {projectsError && <p className="mt-1 text-xs text-blood-300">Projects: {projectsError}</p>}
            </div>
            <button type="button" onClick={() => void load()} className="btn-ghost" disabled={loading}>
              {loading ? 'Refreshing…' : 'Retry evidence'}
            </button>
          </div>
        </div>
      )}

      {!projectsError && (
        <div className="card p-5">
          <p className="field-label">Upload to the Asset Library</p>
          <WorkspaceIntake
            projectId={filterProject === 'all' ? null : filterProject}
            attachments={quickUploads}
            onChange={(next) => {
              setQuickUploads(next)
              void load()
            }}
            onInsertText={() => undefined}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {ASSET_KINDS.map((kind) => {
          const count = assets.filter((a) => a.kind === kind).length
          return (
            <div key={kind} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl text-blood-700">
                  {ASSET_KIND_GLYPHS[kind]}
                </span>
                <span className="font-display text-2xl font-semibold text-ink-100">
                  {assetsError ? '—' : count}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                {ASSET_KIND_LABELS[kind]}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as 'all' | AssetKind)}
          className="field-select !w-auto !py-2 !text-xs"
          disabled={Boolean(assetsError)}
        >
          <option value="all">All kinds</option>
          {ASSET_KINDS.map((k) => (
            <option key={k} value={k}>
              {ASSET_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="field-select !w-auto !py-2 !text-xs"
          disabled={Boolean(projectsError)}
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-ink-400">Loading…</p>
      ) : assetsError ? (
        <div className="card p-12 text-center text-ink-400">
          Asset rows cannot be verified right now. Retry the live evidence read above.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">
          No assets yet. Add one, or generate one from a project.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              projectName={asset.project_id ? projectMap.get(asset.project_id) ?? null : null}
            />
          ))}
        </div>
      )}

      {showAdd && !projectsError && (
        <AddAssetModal
          projects={projects}
          onClose={() => setShowAdd(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}

function AssetCard({
  asset,
  projectName,
}: {
  asset: Asset
  projectName: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const kind = asset.kind as AssetKind

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between">
        <span className="font-display text-3xl text-blood-700">
          {ASSET_KIND_GLYPHS[kind] ?? '◇'}
        </span>
        <span className="rounded-full border border-ink-700 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] text-ink-400">
          rev {asset.revision}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-medium text-ink-100">{asset.name}</h3>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-500">
        <span>{ASSET_KIND_LABELS[kind] ?? asset.kind}</span>
        {asset.source && <span>· {asset.source}</span>}
        {asset.tool && <span>· {asset.tool}</span>}
      </div>
      {projectName && (
        <p className="mt-2 text-xs text-ink-400">{projectName}</p>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
      >
        {expanded ? 'Hide details' : 'Show provenance'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-ink-800 pt-3 text-xs text-ink-400">
          {asset.prompt && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                Prompt
              </span>
              <p className="mt-0.5 text-ink-300">{asset.prompt}</p>
            </div>
          )}
          {asset.rights && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                Rights
              </span>
              <p className="mt-0.5 text-ink-300">{asset.rights}</p>
            </div>
          )}
          {asset.url && (
            <div>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-500">
                URL
              </span>
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 block truncate text-blood-300 hover:text-blood-200"
              >
                {asset.url}
              </a>
            </div>
          )}
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-600">
            Created {timeAgo(asset.created_at)}
          </p>
        </div>
      )}
    </div>
  )
}

function AddAssetModal({
  projects,
  onClose,
  onAdded,
}: {
  projects: Project[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    name: '',
    kind: 'image' as AssetKind,
    source: 'uploaded',
    project_id: '',
    tool: '',
    prompt: '',
    url: '',
    rights: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('assets').insert({
      name: form.name.trim(),
      kind: form.kind,
      source: form.source,
      project_id: form.project_id || null,
      tool: form.tool.trim() || null,
      prompt: form.prompt.trim() || null,
      url: form.url.trim() || null,
      rights: form.rights.trim() || null,
      revision: 1,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    if (form.project_id) {
      await logActivity(form.project_id, null, 'Creator', `added asset: ${form.name}`, 'create')
    }
    onAdded()
    onClose()
  }

  const field = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-100">
            Add asset
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400 hover:text-blood-300"
          >
            Close
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="field-label">Name *</label>
            <input
              required
              value={form.name}
              onChange={field('name')}
              className="field-input"
              placeholder="e.g. Door shadow — key visual"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label">Kind</label>
              <select value={form.kind} onChange={field('kind')} className="field-select">
                {ASSET_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ASSET_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Source</label>
              <select value={form.source} onChange={field('source')} className="field-select">
                {ASSET_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Project</label>
              <select value={form.project_id} onChange={field('project_id')} className="field-select">
                <option value="">— none —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Generating tool</label>
              <input
                value={form.tool}
                onChange={field('tool')}
                className="field-input"
                placeholder="Skin Studio / Kimmy / manual"
              />
            </div>
          </div>
          <div>
            <label className="field-label">URL</label>
            <input
              value={form.url}
              onChange={field('url')}
              className="field-input"
              placeholder="https://… (if hosted)"
            />
          </div>
          <div>
            <label className="field-label">Prompt</label>
            <textarea
              value={form.prompt}
              onChange={field('prompt')}
              className="field-textarea !min-h-[60px]"
              placeholder="Generation prompt, if applicable."
            />
          </div>
          <div>
            <label className="field-label">Rights / license</label>
            <input
              value={form.rights}
              onChange={field('rights')}
              className="field-input"
              placeholder="License notes, attribution requirements…"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-blood-700/60 bg-blood-900/30 px-4 py-3 text-sm text-blood-300">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
