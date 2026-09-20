'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LogOut,
  LayoutDashboard,
  List,
  Map as MapIcon,
  Bell,
  BarChart3,
  Settings as SettingsIcon,
  AlertOctagon,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Eye,
  ArrowRight,
  TrendingUp,
  CheckCheck,
} from 'lucide-react'
import { useStore, loadUser, type Incident } from '@/lib/store'
import { api, API_BASE, normalizeImagePath } from '@/lib/api'
import {
  AppShell,
  StatCard,
  SeverityBadge,
  StatusBadge,
  IncidentCard,
  ComplianceDisclaimer,
} from '@/components/cleanmysuru-ui'
import { DepthPanel, MagneticButton, SpatialCard, SignalDot } from '@/components/spatial-ui'

type AdminTab = 'dashboard' | 'complaints' | 'notifications' | 'analytics' | 'settings'

function AdminPortalInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Read tab from URL query param
  const activeTab = (searchParams.get('tab') as AdminTab) || 'dashboard'

  const [stats, setStats] = useState({
    newComplaints: 0,
    pendingReview: 0,
    inProgress: 0,
    cleaned: 0,
    reopened: 0,
    resolved: 0,
    total: 0,
    active: 0,
    rejected: 0,
  })

  const [complaints, setComplaints] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const loadAdminData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [fetchedStats, fetchedComplaints, fetchedNotifs] = await Promise.all([
        api.getStatsSummary(false).catch(() => null),
        api.getIncidents({ isDemo: false }).catch(() => ({ incidents: [], total: 0 })),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ])

      if (fetchedStats) {
        setStats((prev) => ({ ...prev, ...fetchedStats }))
      }

      const incList = Array.isArray(fetchedComplaints)
        ? fetchedComplaints
        : (fetchedComplaints?.complaints || fetchedComplaints?.incidents || fetchedComplaints?.data || [])

      const notifList = Array.isArray(fetchedNotifs)
        ? fetchedNotifs
        : (fetchedNotifs?.notifications || [])

      const mapped = incList.map((c: any) => ({
        ...c,
        id: c.complaintNumber || c.complaintId || c.id || c._id,
        type: c.type || (c.incidentType ? c.incidentType.replace(/_/g, ' ') : 'Garbage Pile'),
        severity: c.severity || 'Medium',
        confidence: typeof c.confidence === 'number' ? c.confidence : 0,
        status: c.status || 'SUBMITTED',
        backendStatus: c.status || 'SUBMITTED',
        locality: c.locality || c.address || 'Mysuru',
        location: c.location,
        image: normalizeImagePath(
          typeof c.evidence === 'string'
            ? c.evidence
            : c.evidence?.filePath || c.image || ''
        ),
        timestamp: c.timestamp || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'),
      }))

      setComplaints(mapped)
      setNotifications(notifList)

      // Recompute stats from real data if API stats are missing
      const byStatus = (s: string[]) => mapped.filter((c: any) => s.includes(c.backendStatus || c.status)).length
      if (!fetchedStats) {
        setStats({
          newComplaints: byStatus(['SUBMITTED', 'AI_ANALYZED', 'AI_ANALYZING']),
          pendingReview: byStatus(['NEEDS_REVIEW']),
          inProgress: byStatus(['ACCEPTED', 'IN_PROGRESS']),
          cleaned: byStatus(['WORK_DONE', 'CITIZEN_CONFIRMATION']),
          reopened: byStatus(['REOPENED']),
          resolved: byStatus(['RESOLVED']),
          rejected: byStatus(['REJECTED']),
          total: mapped.length,
          active: mapped.filter((c: any) => !['RESOLVED', 'REJECTED'].includes(c.backendStatus || c.status)).length,
        })
      }
    } catch (err) {
      console.error('Failed to load admin data:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('cleanmysuru-token') : null
        const headers: HeadersInit = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`${API_BASE}/auth/me`, { headers, credentials: 'include' })

        if (res.ok) {
          const data = await res.json()
          const currentUser = data.user || data.data
          if (currentUser?.role === 'ADMIN') {
            setUser(currentUser)
            await loadAdminData()
            setLoading(false)
            return
          } else {
            setForbidden(true)
            setLoading(false)
            return
          }
        }

        const localUser = loadUser()
        if (localUser?.role === 'ADMIN') {
          setUser(localUser)
          await loadAdminData()
        } else {
          setForbidden(true)
        }
      } catch {
        const localUser = loadUser()
        if (localUser?.role === 'ADMIN') {
          setUser(localUser)
          await loadAdminData()
        } else {
          setForbidden(true)
        }
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [loadAdminData])

  // Navigation handled natively by useSearchParams
  
  const switchTab = (tab: AdminTab) => {
    if (tab === 'dashboard') {
      router.push('/admin')
    } else {
      router.push(`/admin?tab=${tab}`)
    }
  }

  const handleLogout = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('cleanmysuru-token') : null
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cleanmysuru-token')
      localStorage.removeItem('cleanmysuru-user')
    }
    logout()
    router.push('/login')
  }

  // Get correct complaint route from a notification
  const getComplaintRoute = (n: any): string | null => {
    // Backend now populates: n.complaintNumber = the actual CM-XXXX string
    const id = n.complaintNumber || n.complaintId
    if (!id) return null
    return `/complaints/${id}`
  }

  const markNotifRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true, read: true } : n)))
    } catch {}
  }

  if (loading) {
    return (
      <AppShell eyebrow="Municipal Command" title="Authorizing...">
        <div className="min-h-[400px] flex flex-col items-center justify-center text-[var(--color-graphite)] gap-6">
          <div className="size-5 border border-[var(--color-abyssal)] border-t-transparent rounded-full animate-spin" />
          <p className="text-tech-label">VERIFYING ADMIN CREDENTIALS...</p>
        </div>
      </AppShell>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bone)] p-6">
        <div className="max-w-md w-full bg-[var(--color-paper)] border border-[var(--color-lichen)] p-12 text-center">
          <div className="size-16 bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-8">
            <AlertOctagon className="size-8" />
          </div>
          <h1 className="text-heading text-[var(--foreground)] mb-6">403 FORBIDDEN</h1>
          <p className="text-tech-label text-[var(--color-graphite)] mb-10">
            ADMIN ACCESS REQUIRED. THIS ACCOUNT DOES NOT HAVE ADMINISTRATIVE PRIVILEGES.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/citizen')}
              className="bg-[var(--color-abyssal)] text-[var(--color-paper)] py-4 text-tech-label hover:bg-black transition-colors"
            >
              RETURN TO CITIZEN PORTAL
            </button>
            <button
              onClick={handleLogout}
              className="border border-[var(--color-lichen)] py-4 text-tech-label text-[var(--color-graphite)] hover:bg-[var(--color-tissue)] transition-colors"
            >
              SWITCH ACCOUNT
            </button>
          </div>
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read).length

  const TABS = [
    { id: 'dashboard', label: 'Operations', icon: LayoutDashboard },
    { id: 'complaints', label: 'Queue', icon: List, count: complaints.length },
    { id: 'notifications', label: 'Alerts', icon: Bell, count: unreadCount, alert: unreadCount > 0 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const

  return (
    <AppShell eyebrow="MUNICIPAL COMMAND">
      <div className="w-full pb-24 space-y-10">

        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-[var(--color-lichen)] pb-10">
          <div>
            <span className="text-tech-label text-[var(--color-graphite)] block mb-3">CITY OPERATIONS INTELLIGENCE SYSTEM</span>
            <h1 className="text-large-heading text-[var(--foreground)]">
              ADMIN<br />CONSOLE
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadAdminData}
              disabled={refreshing}
              className="flex items-center gap-2 border border-[var(--color-lichen)] bg-[var(--color-paper)] hover:bg-[var(--color-tissue)] text-[var(--foreground)] px-6 py-3 text-tech-label transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'REFRESHING...' : 'REFRESH DATA'}
            </button>
            <button
              onClick={() => router.push('/map')}
              className="flex items-center gap-2 bg-[var(--color-abyssal)] hover:bg-black text-[var(--color-biolime)] px-6 py-3 text-tech-label transition-colors"
            >
              LIVE CITY MAP
              <MapIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap items-center bg-[var(--color-paper)] border border-[var(--color-lichen)] w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-tech-label transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--color-abyssal)] text-[var(--color-biolime)]'
                  : 'text-[var(--color-graphite)] hover:bg-[var(--color-tissue)] hover:text-[var(--foreground)]'
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-mono ${
                    (tab as any).alert
                      ? 'bg-[var(--color-biolime)] text-[var(--color-abyssal)]'
                      : activeTab === tab.id
                      ? 'bg-white/20 text-[var(--color-biolime)]'
                      : 'bg-[var(--color-tissue)] text-[var(--foreground)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ───────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={Clock3} label="NEW" value={stats.newComplaints} subtext="Pending" />
              <StatCard icon={Sparkles} label="REVIEW" value={stats.pendingReview} subtext="AI Flagged" />
              <StatCard icon={ArrowRight} label="IN PROGRESS" value={stats.inProgress} subtext="Dispatched" />
              <StatCard icon={CheckCircle2} label="WORK DONE" value={stats.cleaned} subtext="Awaiting Verify" />
              <StatCard icon={RotateCcw} label="REOPENED" value={stats.reopened} subtext="Re-opened" />
              <StatCard icon={CheckCheck} label="RESOLVED" value={stats.resolved} subtext="Closed" accent />
            </div>

            {/* Complaint queue preview */}
            <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)]">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-lichen)]">
                <div>
                  <span className="text-tech-label text-[var(--color-graphite)] block mb-1">REAL-TIME</span>
                  <h2 className="text-heading text-[var(--foreground)]">GRIEVANCE QUEUE</h2>
                </div>
                <button
                  onClick={() => switchTab('complaints')}
                  className="flex items-center gap-2 text-tech-label text-[var(--color-graphite)] hover:text-[var(--foreground)] transition-colors"
                >
                  VIEW ALL <ArrowRight className="size-3.5" />
                </button>
              </div>

              {complaints.length === 0 ? (
                <div className="px-6 py-16 text-center text-tech-label text-[var(--color-graphite)]">
                  NO COMPLAINTS IN DATABASE
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--color-tissue)] text-tech-label text-[var(--color-graphite)] border-b border-[var(--color-lichen)]">
                        <th className="px-6 py-3 font-normal">ID</th>
                        <th className="px-6 py-3 font-normal">TYPE</th>
                        <th className="px-6 py-3 font-normal">SEVERITY</th>
                        <th className="px-6 py-3 font-normal">AI CONF.</th>
                        <th className="px-6 py-3 font-normal">STATUS</th>
                        <th className="px-6 py-3 font-normal">LOCALITY</th>
                        <th className="px-6 py-3 font-normal text-right">DATE</th>
                        <th className="px-6 py-3 font-normal text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.slice(0, 8).map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => router.push(`/complaints/${c.id}`)}
                          className="border-b border-[var(--color-tissue)] hover:bg-[var(--color-tissue)]/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4 text-tech-label text-[var(--foreground)] font-medium">{c.id}</td>
                          <td className="px-6 py-4 text-[13px] font-medium max-w-[160px] truncate">{c.type}</td>
                          <td className="px-6 py-4"><SeverityBadge severity={c.severity} /></td>
                          <td className="px-6 py-4 text-tech-label">{c.confidence}%</td>
                          <td className="px-6 py-4"><StatusBadge status={c.backendStatus || c.status} /></td>
                          <td className="px-6 py-4 text-tech-label text-[var(--color-graphite)] max-w-[140px] truncate">{c.locality}</td>
                          <td className="px-6 py-4 text-tech-label text-[var(--color-graphite)] text-right whitespace-nowrap">{c.timestamp}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-tech-label text-[var(--color-graphite)] group-hover:text-[var(--foreground)] flex items-center justify-end gap-1">
                              <Eye className="size-3.5" /> VIEW
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPLAINTS TAB ──────────────────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-tech-label text-[var(--color-graphite)] block mb-1">ALL RECORDS</span>
                <h2 className="text-heading text-[var(--foreground)]">COMPLAINT DATABASE</h2>
              </div>
              <span className="text-tech-label text-[var(--color-graphite)]">{complaints.length} TOTAL</span>
            </div>

            {complaints.length === 0 ? (
              <div className="p-16 border border-[var(--color-lichen)] text-center text-tech-label text-[var(--color-graphite)] bg-[var(--color-paper)]">
                NO COMPLAINTS IN DATABASE
              </div>
            ) : (
              <>
                {/* Table view for admin — better than cards for operations */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--color-tissue)] text-tech-label text-[var(--color-graphite)] border-b border-[var(--color-lichen)]">
                        <th className="px-6 py-3 font-normal w-8">IMG</th>
                        <th className="px-6 py-3 font-normal">ID</th>
                        <th className="px-6 py-3 font-normal">TYPE</th>
                        <th className="px-6 py-3 font-normal">SEVERITY</th>
                        <th className="px-6 py-3 font-normal">AI CONF</th>
                        <th className="px-6 py-3 font-normal">STATUS</th>
                        <th className="px-6 py-3 font-normal">LOCALITY</th>
                        <th className="px-6 py-3 font-normal text-right">DATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => router.push(`/complaints/${c.id}`)}
                          className="border-b border-[var(--color-tissue)] hover:bg-[var(--color-tissue)]/50 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            {c.image ? (
                              <img
                                src={c.image}
                                alt=""
                                className="size-10 object-cover border border-[var(--color-lichen)]"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                              />
                            ) : (
                              <div className="size-10 bg-[var(--color-tissue)] border border-[var(--color-lichen)]" />
                            )}
                          </td>
                          <td className="px-6 py-3 text-tech-label text-[var(--foreground)] font-medium whitespace-nowrap">{c.id}</td>
                          <td className="px-6 py-3 text-[13px] font-medium max-w-[180px] truncate">{c.type}</td>
                          <td className="px-6 py-3"><SeverityBadge severity={c.severity} /></td>
                          <td className="px-6 py-3 text-tech-label">{c.confidence}%</td>
                          <td className="px-6 py-3"><StatusBadge status={c.backendStatus || c.status} /></td>
                          <td className="px-6 py-3 text-tech-label text-[var(--color-graphite)] max-w-[160px] truncate">{c.locality}</td>
                          <td className="px-6 py-3 text-tech-label text-[var(--color-graphite)] text-right whitespace-nowrap">{c.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ───────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-tech-label text-[var(--color-graphite)] block mb-1">SYSTEM SIGNALS</span>
                <h2 className="text-heading text-[var(--foreground)]">ADMIN ALERTS</h2>
              </div>
              {unreadCount > 0 && (
                <span className="bg-[var(--color-biolime)] text-[var(--color-abyssal)] text-tech-label px-3 py-1">
                  {unreadCount} UNREAD
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-16 border border-[var(--color-lichen)] text-center text-tech-label text-[var(--color-graphite)] bg-[var(--color-paper)]">
                NO ALERTS LOGGED
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const isRead = n.isRead || n.read
                  const route = getComplaintRoute(n)
                  return (
                    <div
                      key={n._id || n.id}
                      className={`bg-[var(--color-paper)] border border-[var(--color-lichen)] p-6 flex flex-col sm:flex-row items-start justify-between gap-6 ${!isRead ? 'border-l-4 border-l-[var(--color-biolime)]' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-[15px] font-medium text-[var(--foreground)]">{n.title}</h4>
                          {!isRead && (
                            <span className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] px-2 py-0.5 text-tech-label shrink-0">
                              UNREAD
                            </span>
                          )}
                        </div>
                        <p className="text-body text-[var(--color-graphite)]">{n.message}</p>
                        <p className="text-tech-label text-[var(--color-graphite)] mt-3">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                        </p>
                      </div>

                      <div className="flex flex-row sm:flex-col gap-3 shrink-0">
                        {route && (
                          <button
                            onClick={() => router.push(route)}
                            className="border border-[var(--color-lichen)] bg-[var(--color-paper)] hover:bg-[var(--color-tissue)] text-tech-label px-5 py-2.5 text-center transition-colors whitespace-nowrap flex items-center gap-2"
                          >
                            <Eye className="size-3.5" /> VIEW SOURCE
                          </button>
                        )}
                        {!isRead && (
                          <button
                            onClick={() => markNotifRead(n._id || n.id)}
                            className="bg-[var(--color-abyssal)] text-[var(--color-paper)] hover:bg-black text-tech-label px-5 py-2.5 text-center transition-colors whitespace-nowrap"
                          >
                            ACKNOWLEDGE
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ───────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-10">
            <div>
              <span className="text-tech-label text-[var(--color-graphite)] block mb-1">REAL-TIME METRICS</span>
              <h2 className="text-heading text-[var(--foreground)]">CIVIC ANALYTICS</h2>
              <p className="text-tech-label text-[var(--color-graphite)] mt-2">Based on {complaints.length} total records from MongoDB</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={Clock3} label="SUBMITTED" value={stats.newComplaints} />
              <StatCard icon={Sparkles} label="NEEDS REVIEW" value={stats.pendingReview} />
              <StatCard icon={ArrowRight} label="IN PROGRESS" value={stats.inProgress} />
              <StatCard icon={CheckCircle2} label="WORK DONE" value={stats.cleaned} />
              <StatCard icon={RotateCcw} label="REOPENED" value={stats.reopened} />
              <StatCard icon={CheckCheck} label="RESOLVED" value={stats.resolved} accent />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status breakdown */}
              <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] p-6">
                <h3 className="text-tech-label text-[var(--color-graphite)] mb-6 pb-4 border-b border-[var(--color-lichen)]">
                  STATUS DISTRIBUTION
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Submitted', val: stats.newComplaints, color: 'bg-sky-400' },
                    { label: 'Needs Review', val: stats.pendingReview, color: 'bg-amber-400' },
                    { label: 'In Progress', val: stats.inProgress, color: 'bg-blue-500' },
                    { label: 'Work Done', val: stats.cleaned, color: 'bg-emerald-400' },
                    { label: 'Reopened', val: stats.reopened, color: 'bg-orange-500' },
                    { label: 'Resolved', val: stats.resolved, color: 'bg-[var(--color-biolime)]' },
                    { label: 'Rejected', val: stats.rejected || 0, color: 'bg-red-400' },
                  ].map((row) => {
                    const pct = stats.total > 0 ? Math.round((row.val / stats.total) * 100) : 0
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-tech-label mb-1">
                          <span className="text-[var(--color-graphite)]">{row.label}</span>
                          <span className="text-[var(--foreground)]">{row.val} <span className="text-[var(--color-graphite)]">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-tissue)] w-full">
                          <div className={`h-full ${row.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Severity breakdown */}
              <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] p-6">
                <h3 className="text-tech-label text-[var(--color-graphite)] mb-6 pb-4 border-b border-[var(--color-lichen)]">
                  SEVERITY DISTRIBUTION
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Critical', color: 'bg-red-500' },
                    { label: 'High', color: 'bg-orange-500' },
                    { label: 'Medium', color: 'bg-amber-400' },
                    { label: 'Low', color: 'bg-[var(--color-biolime)]' },
                  ].map((row) => {
                    const count = complaints.filter((c) => c.severity === row.label).length
                    const pct = complaints.length > 0 ? Math.round((count / complaints.length) * 100) : 0
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-tech-label mb-1">
                          <span className="text-[var(--color-graphite)]">{row.label}</span>
                          <span className="text-[var(--foreground)]">{count} <span className="text-[var(--color-graphite)]">({pct}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-tissue)] w-full">
                          <div className={`h-full ${row.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--color-lichen)] space-y-3">
                  <div className="flex justify-between text-tech-label">
                    <span className="text-[var(--color-graphite)]">DATABASE ENGINE</span>
                    <span className="text-[var(--foreground)]">MongoDB + Mongoose</span>
                  </div>
                  <div className="flex justify-between text-tech-label">
                    <span className="text-[var(--color-graphite)]">AI SCREENING</span>
                    <span className="text-[var(--foreground)] flex items-center gap-2"><SignalDot /> Gemini Vision (Live)</span>
                  </div>
                  <div className="flex justify-between text-tech-label">
                    <span className="text-[var(--color-graphite)]">TOTAL RECORDS</span>
                    <span className="text-[var(--foreground)]">{stats.total}</span>
                  </div>
                  <div className="flex justify-between text-tech-label">
                    <span className="text-[var(--color-graphite)]">RESOLUTION RATE</span>
                    <span className="text-[var(--foreground)]">
                      {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-8">
            <div>
              <span className="text-tech-label text-[var(--color-graphite)] block mb-1">CONFIGURATION</span>
              <h2 className="text-heading text-[var(--foreground)]">ADMIN SETTINGS</h2>
              <p className="text-tech-label text-[var(--color-graphite)] mt-2">
                UI PREFERENCES — stored locally on this device only
              </p>
            </div>

            <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] divide-y divide-[var(--color-lichen)]">
              {[
                {
                  key: 'autoRefresh',
                  label: 'Auto-Refresh Dashboard',
                  desc: 'Poll for new complaints every 60 seconds',
                  defaultOn: true,
                },
                {
                  key: 'strictAI',
                  label: 'Highlight Low-Confidence Submissions',
                  desc: 'Flag complaints with AI confidence below 70%',
                  defaultOn: true,
                },
                {
                  key: 'compactView',
                  label: 'Compact Table View',
                  desc: 'Reduce row height for higher information density',
                  defaultOn: false,
                },
              ].map((setting) => {
                const stored = typeof window !== 'undefined'
                  ? localStorage.getItem(`admin-pref-${setting.key}`)
                  : null
                const isOn = stored === null ? setting.defaultOn : stored === 'true'
                return (
                  <div key={setting.key} className="flex items-start justify-between p-6 gap-6">
                    <div>
                      <p className="text-[15px] font-medium text-[var(--foreground)] mb-1">{setting.label}</p>
                      <p className="text-tech-label text-[var(--color-graphite)]">{setting.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        defaultChecked={isOn}
                        onChange={(e) => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(`admin-pref-${setting.key}`, String(e.target.checked))
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-[var(--color-tissue)] border border-[var(--color-lichen)] peer-checked:bg-[var(--color-abyssal)] transition-colors relative">
                        <div className="absolute top-0.5 left-0.5 size-4 bg-[var(--color-graphite)] peer-checked:translate-x-5 peer-checked:bg-[var(--color-biolime)] transition-all" />
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="bg-[var(--color-tissue)] border border-[var(--color-lichen)] p-5">
              <p className="text-tech-label text-[var(--color-graphite)] leading-relaxed">
                <span className="text-[var(--foreground)] font-bold">NOTE:</span> These are browser-local UI preferences and do not affect server behavior or data.
                Server-side configuration requires backend admin access.
              </p>
            </div>
          </div>
        )}

        <ComplianceDisclaimer />
      </div>
    </AppShell>
  )
}

export default function AdminPortal() {
  return (
    <React.Suspense fallback={<div className="p-8 text-[var(--color-graphite)] text-tech-label">LOADING ADMIN CONSOLE...</div>}>
      <AdminPortalInner />
    </React.Suspense>
  )
}
