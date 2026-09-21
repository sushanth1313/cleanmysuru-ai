'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { AppShell, ComplianceDisclaimer } from '@/components/cleanmysuru-ui'
import { SpatialCard, MagneticButton } from '@/components/spatial-ui'
import { cx, type Incident, useStore } from '@/lib/store'
import { api } from '@/lib/api'
import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-tech-label text-[var(--color-graphite)]">INITIALIZING SPATIAL GRID...</div>
})

const TYPE_OPTIONS = ['All incident types', 'C&D Waste', 'Garbage', 'Overflowing Bin', 'Mixed Waste']
const SEVERITY_OPTIONS = ['All severities', 'Low', 'Medium', 'High', 'Critical']
const STATUS_OPTIONS = ['All statuses', 'SUBMITTED', 'AI_ANALYZED', 'NEEDS_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'WORK_DONE', 'RESOLVED', 'REJECTED', 'REOPENED']

export default function MapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { user } = useStore()
  const router = useRouter()

  // Map is accessible to all users for civic transparency

  const [typeFilter, setTypeFilter] = useState('All incident types')
  const [severityFilter, setSeverityFilter] = useState('All severities')
  const [statusFilter, setStatusFilter] = useState('All statuses')

  const fetchMapData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getIncidents({ isDemo: false, limit: 500 })
      setIncidents(data.incidents)
    } catch (err: any) {
      setError('Could not load map data from server. Is the backend running?')
      console.error('Map data fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMapData() }, [])

  const filtered = useMemo(() => incidents.filter(i => {
    if (typeFilter !== 'All incident types' && i.shortType !== typeFilter) return false
    if (severityFilter !== 'All severities' && i.severity !== severityFilter) return false
    if (statusFilter !== 'All statuses') {
      const rawStatus = i.backendStatus || i.status
      if (rawStatus !== statusFilter) return false
    }
    return true
  }), [incidents, typeFilter, severityFilter, statusFilter])

  return (
    <AppShell eyebrow="SPATIAL INTELLIGENCE">
      <div className="w-full pb-24 space-y-16">
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b hairline-b border-b-0 pb-12">
          <div className="max-w-2xl">
            <h1 className="text-large-heading text-[var(--foreground)]">
              LIVE MYSURU<br />SPATIAL GRID
            </h1>
          </div>
          <MagneticButton onClick={fetchMapData} disabled={loading}>
            <div className="flex items-center gap-3 bg-[var(--color-abyssal)] hover:bg-black text-[var(--color-paper)] px-8 py-5 transition-colors">
              <span className="text-tech-label">REFRESH DATA</span>
              <RefreshCw className={cx('size-4', loading && 'animate-spin')} />
            </div>
          </MagneticButton>
        </div>

        {error && (
          <div className="p-4 border hairline-border bg-red-500/10 text-red-600 text-tech-label font-bold">
            SYSTEM ERROR: {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* ── Sidebar filters ──────────────────────────────────── */}
          <SpatialCard className="p-8">
            <p className="text-tech-label text-[var(--color-graphite)] mb-8 pb-4 border-b hairline-b border-b-0">
              DATAPOINT FILTERS
            </p>
            
            <div className="flex flex-col gap-8 text-tech-label">
              <div>
                <label className="block text-[var(--color-graphite)] mb-2">
                  CLASSIFICATION
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-[var(--color-tissue)] border hairline-border p-3 text-[var(--foreground)] outline-none focus:border-[var(--color-graphite)] transition-colors"
                >
                  {TYPE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-graphite)] mb-2">
                  SEVERITY INDEX
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-[var(--color-tissue)] border hairline-border p-3 text-[var(--foreground)] outline-none focus:border-[var(--color-graphite)] transition-colors"
                >
                  {SEVERITY_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-graphite)] mb-2">
                  OPERATIONAL STATUS
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[var(--color-tissue)] border hairline-border p-3 text-[var(--foreground)] outline-none focus:border-[var(--color-graphite)] transition-colors"
                >
                  {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[var(--color-graphite)] mb-2">
                  TIME HORIZON
                </label>
                <div className="flex items-center gap-2 bg-[var(--color-tissue)] border hairline-border p-3 text-[var(--color-graphite)] opacity-70 cursor-not-allowed">
                  <CalendarDays className="size-4" /> ALL TIME
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t hairline-b border-b-0">
              <p className="text-tech-label text-[var(--color-graphite)] mb-6">COLOR LEGEND</p>
              <div className="flex flex-col gap-4 text-tech-label">
                <span className="flex items-center gap-3"><i className="size-3 bg-rose-500" /> CRITICAL</span>
                <span className="flex items-center gap-3"><i className="size-3 bg-orange-500" /> HIGH</span>
                <span className="flex items-center gap-3"><i className="size-3 bg-amber-500" /> MEDIUM</span>
                <span className="flex items-center gap-3"><i className="size-3 bg-[var(--color-biolime)]" /> LOW</span>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t hairline-b border-b-0 text-tech-label">
              {loading ? (
                <span className="text-[var(--color-graphite)]">RETRIEVING...</span>
              ) : (
                <span className="text-[var(--foreground)]">{filtered.length} NODES VISIBLE</span>
              )}
            </div>
          </SpatialCard>

          {/* ── Map ──────────────────────────────────────────────── */}
          <div
            className="relative border hairline-border bg-[var(--color-tissue)] overflow-hidden"
            style={{ minHeight: '680px', height: 'calc(100vh - 280px)' }}
          >
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-tissue)]/80 backdrop-blur-sm">
                <span className="text-tech-label text-[var(--color-graphite)] bg-[var(--color-paper)] p-4 border hairline-border">LOADING SPATIAL DATA...</span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-[var(--color-paper)] border hairline-border p-4 text-center">
                <p className="text-tech-label text-[var(--foreground)] font-bold">0 MATCHES FOUND</p>
                <p className="text-tech-label text-[var(--color-graphite)] mt-1">ADJUST FILTERS</p>
              </div>
            )}
            {/* Map fills absolutely */}
            <div className="absolute inset-0">
              <LeafletMap incidents={filtered} />
            </div>
          </div>

        </div>

        <ComplianceDisclaimer />
      </div>
    </AppShell>
  )
}
