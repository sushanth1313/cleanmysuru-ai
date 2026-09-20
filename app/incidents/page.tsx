'use client'
import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { AppShell, ComplianceDisclaimer, IncidentCard, SectionHeading } from '@/components/cleanmysuru-ui'
import { useStore, cx } from '@/lib/store'
import { formatLocationString } from '@/lib/utils'

const TYPE_FILTERS = ['All', 'C&D Waste', 'Garbage', 'Overflowing Bin', 'Mixed Waste']
const STATUS_FILTERS = ['All Statuses', 'Pending', 'Needs Review', 'Verified', 'Rejected']

export default function IncidentsPage() {
  const { incidents: allIncidents } = useStore()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const incidents = allIncidents

  const filtered = useMemo(
    () =>
      incidents.filter((i) => {
        const matchType = typeFilter === 'All' || i.shortType === typeFilter
        const matchStatus = statusFilter === 'All Statuses' || i.status === statusFilter
        const locStr = formatLocationString(i.location, i.locality)
        const matchQuery = `${i.type} ${locStr} ${i.id}`.toLowerCase().includes(query.toLowerCase())
        return matchType && matchStatus && matchQuery
      }),
    [incidents, query, typeFilter, statusFilter],
  )

  return (
    <AppShell eyebrow="Civic Intelligence" title="Civic Incidents">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Civic Incidents"
          description="Search, filter and triage real civic waste complaints and municipal signals."
        />

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="mt-9 flex flex-col gap-3 lg:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="size-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by incident, location or ID"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <SlidersHorizontal className="size-4 shrink-0 text-slate-400" />
            {TYPE_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setTypeFilter(item)}
                className={cx(
                  'whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all shadow-sm',
                  typeFilter === item
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status filters ─────────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              className={cx(
                'whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-semibold transition-all shadow-sm',
                statusFilter === item
                  ? 'border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {item}
            </button>
          ))}
          <span className="ml-auto text-xs font-medium text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Grid ───────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="size-16 flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
              <Search className="size-8 text-slate-400" />
            </div>
            <p className="mt-5 text-sm font-medium text-slate-600">No incidents match your filters.</p>
            <button onClick={() => { setQuery(''); setTypeFilter('All'); setStatusFilter('All Statuses') }} className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}

        <ComplianceDisclaimer />
      </div>
    </AppShell>
  )
}
