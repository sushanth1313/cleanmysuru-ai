'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  PlusCircle,
  LayoutDashboard,
  List,
  Bell,
  User as UserIcon,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock3,
  ChevronRight,
  Eye,
  BarChart3,
  Search,
  Check,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell as PieCell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStore, loadUser, type Incident } from '@/lib/store'
import { api, API_BASE, normalizeImagePath } from '@/lib/api'
import {
  AppShell,
  StatCard,
  IncidentCard,
  StatusBadge,
  ComplianceDisclaimer,
} from '@/components/cleanmysuru-ui'
import { DepthPanel, MagneticButton, SpatialCard, SignalDot } from '@/components/spatial-ui'
import { formatLocationString } from '@/lib/utils'
import Link from 'next/link'

type CitizenTab = 'dashboard' | 'complaints' | 'notifications' | 'profile' | 'settings'

function CitizenPortalInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useStore()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const activeTab = (searchParams.get('tab') as CitizenTab) || 'dashboard'

  const [complaints, setComplaints] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])

  const switchTab = (tab: CitizenTab) => {
    if (tab === 'dashboard') {
      router.push('/citizen')
    } else {
      router.push(`/citizen?tab=${tab}`)
    }
  }

  const loadData = async () => {
    try {
      const [fetchedComplaints, fetchedNotifications] = await Promise.all([
        api.getIncidents({ isDemo: false }).catch(() => ({ incidents: [], total: 0 })),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ])
      const incList = Array.isArray(fetchedComplaints)
        ? fetchedComplaints
        : fetchedComplaints?.complaints || fetchedComplaints?.incidents || fetchedComplaints?.data || []
      const notifList = Array.isArray(fetchedNotifications)
        ? fetchedNotifications
        : fetchedNotifications?.notifications || []

      const mapped: any[] = incList.map((c: any) => ({
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
          typeof c.evidence === 'string' ? c.evidence : c.evidence?.filePath || c.image || ''
        ),
        timestamp: c.timestamp || (c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'),
      }))

      setComplaints(mapped)
      setNotifications(notifList)
    } catch (e) {
      console.error('Failed to load citizen data:', e)
    }
  }

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
          if (currentUser && (currentUser.role === 'CITIZEN' || currentUser.role === 'ADMIN')) {
            setUser(currentUser)
            await loadData()
            setLoading(false)
            return
          }
        }

        const localUser = loadUser()
        if (localUser && (localUser.role === 'CITIZEN' || localUser.role === 'ADMIN')) {
          setUser(localUser)
          await loadData()
        } else {
          router.push('/login')
        }
      } catch {
        const localUser = loadUser()
        if (localUser && (localUser.role === 'CITIZEN' || localUser.role === 'ADMIN')) {
          setUser(localUser)
          await loadData()
        } else {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

// Navigation handled natively by useSearchParams

  const markNotifRead = async (id: string) => {
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true, read: true } : n))
      )
    } catch {}
  }

  const getComplaintRoute = (n: any): string | null => {
    const id = n.complaintNumber || n.complaintId
    if (!id) return null
    return `/complaints/${id}`
  }

  const sectorData = useMemo(() => {
    if (complaints.length === 0) return []
    const dataMap = new Map<string, number>()
    complaints.forEach((c) => {
      const type = c.type || 'Other'
      dataMap.set(type, (dataMap.get(type) || 0) + 1)
    })
    return Array.from(dataMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [complaints])

  const SECTOR_COLORS = ['#C8F27A', '#596260', '#D6D8CE', '#E8E9E2', '#172827']

  if (loading) {
    return (
      <AppShell eyebrow="Civic Intelligence" title="Loading...">
        <div className="min-h-[400px] flex flex-col items-center justify-center text-[var(--color-graphite)] gap-6">
          <div className="size-5 border border-[var(--color-biolime)] border-t-transparent rounded-full animate-spin" />
          <p className="text-tech-label">CONNECTING TO MUNICIPAL GRID...</p>
        </div>
      </AppShell>
    )
  }

  const activeComplaints = complaints.filter(
    (c) => !['RESOLVED', 'REJECTED'].includes(c.backendStatus || c.status)
  ).length
  const resolvedComplaints = complaints.filter(
    (c) => (c.backendStatus || c.status) === 'RESOLVED' || c.status === 'Verified'
  ).length
  const pendingVerify = complaints.filter(
    (c) => (c.backendStatus || c.status) === 'WORK_DONE'
  ).length
  const unreadNotifs = notifications.filter((n) => !n.isRead && !n.read).length

  return (
    <AppShell fullWidth={false}>
      <div className="w-full pb-24 space-y-10">

        {/* ── DASHBOARD TAB ───────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            
            {/* Hero Banner - Civic Intelligence Lab */}
            <div className="bg-[var(--color-abyssal)] p-12 flex flex-col justify-center relative overflow-hidden min-h-[260px] border border-[var(--color-graphite)] shadow-lg shadow-black/10">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[var(--color-biolime)]/5 to-transparent pointer-events-none" />
              <div className="relative z-10 max-w-3xl">
                <span className="text-[13px] font-bold tracking-widest text-[var(--color-lichen)] uppercase block mb-4 flex items-center gap-2">
                  <SignalDot /> CIVIC INTELLIGENCE CONSOLE
                </span>
                <h1 className="text-[44px] lg:text-[52px] font-medium text-[var(--color-paper)] leading-[1.1] tracking-tight mb-4">
                  Welcome back, {user?.name?.split(' ')[0] || 'Citizen'}
                </h1>
                <p className="text-[18px] text-[var(--color-lichen)] max-w-2xl leading-relaxed">
                  Monitor civic conditions, track your active reports, and participate in keeping Mysuru infrastructure clean and sustainable.
                </p>
              </div>
            </div>

            {/* Pending verification alert */}
            {pendingVerify > 0 && (
              <div className="bg-[var(--color-paper)] border border-[var(--color-biolime)] shadow-sm p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-biolime)]" />
                <div className="flex items-start gap-5">
                  <div className="p-3 bg-[var(--color-abyssal)] text-[var(--color-biolime)] shrink-0">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-[20px] font-bold text-[var(--foreground)] mb-1">
                      Action Required: Verify Resolution
                    </h3>
                    <p className="text-[16px] text-[var(--color-graphite)]">
                      {pendingVerify} of your complaint{pendingVerify > 1 ? 's' : ''} {pendingVerify > 1 ? 'have' : 'has'} been marked as resolved by the administration.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => switchTab('complaints')}
                  className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] hover:bg-black px-8 py-4 text-[14px] font-bold tracking-widest uppercase transition-colors shrink-0 whitespace-nowrap shadow-md"
                >
                  REVIEW EVIDENCE
                </button>
              </div>
            )}

            {/* Core Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={List} label="TOTAL REPORTS" value={complaints.length} />
              <StatCard icon={Clock3} label="PENDING REVIEW" value={complaints.filter(c => ['SUBMITTED', 'NEEDS_REVIEW'].includes(c.backendStatus || c.status)).length} />
              <StatCard icon={TrendingUp} label="IN PROGRESS" value={complaints.filter(c => ['ACCEPTED', 'IN_PROGRESS'].includes(c.backendStatus || c.status)).length} />
              <StatCard icon={CheckCircle2} label="RESOLVED" value={resolvedComplaints} accent />
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Recent Activity Log */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--color-lichen)] pb-4">
                  <h2 className="text-[20px] font-bold text-[var(--foreground)]">RECENT ACTIVITY</h2>
                  <button
                    onClick={() => switchTab('complaints')}
                    className="text-[13px] font-bold text-[var(--color-graphite)] hover:text-[var(--color-abyssal)] flex items-center gap-1 uppercase tracking-widest transition-colors"
                  >
                    View All <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] shadow-sm">
                  {complaints.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                      <p className="text-[18px] font-medium text-[var(--color-graphite)] mb-6 max-w-md">No activity recorded. Your civic intelligence dashboard is currently empty.</p>
                      <button
                        onClick={() => router.push('/detect')}
                        className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] px-8 py-4 text-[14px] font-bold tracking-widest uppercase hover:bg-black transition-colors"
                      >
                        RAISE NEW COMPLAINT
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[var(--color-tissue)] border-b border-[var(--color-lichen)] text-[12px] text-[var(--color-graphite)] font-bold uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-5">Record ID</th>
                            <th className="px-6 py-5">Classification</th>
                            <th className="px-6 py-5">Status</th>
                            <th className="px-6 py-5 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-lichen)]">
                          {complaints.slice(0, 5).map((c) => (
                            <tr 
                              key={c.id} 
                              onClick={() => router.push(`/complaints/${c.id}`)}
                              className="hover:bg-[var(--color-tissue)] cursor-pointer transition-colors group"
                            >
                              <td className="px-6 py-5">
                                <span className="text-[15px] font-medium text-[var(--foreground)] group-hover:text-[var(--color-abyssal)] transition-colors">{c.id}</span>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-[14px] text-[var(--color-graphite)]">{c.type}</span>
                                <div className="text-[12px] text-[var(--color-lichen)] truncate max-w-[200px] mt-0.5">{formatLocationString(c.location, c.locality)}</div>
                              </td>
                              <td className="px-6 py-5">
                                <StatusBadge status={c.backendStatus || c.status} />
                              </td>
                              <td className="px-6 py-5 text-[14px] text-[var(--color-graphite)] text-right font-mono">
                                {c.timestamp}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Analytics Insight */}
              <div className="lg:col-span-4 space-y-6">
                
                <h2 className="text-[20px] font-bold text-[var(--foreground)] border-b border-[var(--color-lichen)] pb-4">
                  INTELLIGENCE
                </h2>

                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] p-8 shadow-sm">
                  <h3 className="text-[13px] font-bold text-[var(--color-graphite)] uppercase tracking-widest mb-8">
                    Sector Analysis
                  </h3>
                  
                  {sectorData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-[14px] text-[var(--color-graphite)] border-t border-[var(--color-lichen)]">
                      Insufficient data for analysis.
                    </div>
                  ) : (
                    <div className="h-56 relative mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sectorData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={1}
                            dataKey="value"
                            stroke="none"
                          >
                            {sectorData.map((entry, index) => (
                              <PieCell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[32px] font-bold text-[var(--foreground)] leading-none mb-1">{complaints.length}</span>
                        <span className="text-[11px] uppercase tracking-widest text-[var(--color-graphite)] font-bold">Total</span>
                      </div>
                    </div>
                  )}
                  {sectorData.length > 0 && (
                    <div className="flex flex-col gap-3 pt-6 border-t border-[var(--color-lichen)]">
                      {sectorData.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-3" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                            <span className="text-[14px] font-medium text-[var(--color-graphite)] truncate max-w-[140px]">{item.name}</span>
                          </div>
                          <span className="text-[14px] font-bold text-[var(--foreground)]">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-6 bg-[var(--color-tissue)] border border-[var(--color-lichen)]">
                   <p className="text-[13px] font-medium text-[var(--color-graphite)] leading-relaxed">
                     <span className="font-bold text-[var(--foreground)]">NOTE:</span> Location intelligence and severity analysis are automatically powered by Google Gemini Vision.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── MY COMPLAINTS TAB ───────────────────────────────── */}
        {activeTab === 'complaints' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[var(--color-lichen)] pb-8">
              <div>
                <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--color-graphite)] block mb-2">CIVIC DATABASE</span>
                <h1 className="text-[36px] font-medium text-[var(--foreground)] leading-tight tracking-tight">MY COMPLAINTS</h1>
              </div>
              <button
                onClick={() => router.push('/detect')}
                className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] hover:bg-black px-8 py-4 text-[14px] font-bold tracking-widest uppercase flex items-center gap-3 transition-colors shadow-sm whitespace-nowrap"
              >
                <PlusCircle className="size-5" />
                REPORT INCIDENT
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="p-20 border border-[var(--color-lichen)] text-center flex flex-col items-center bg-[var(--color-paper)] shadow-sm">
                <List className="size-16 text-[var(--color-graphite)] mb-6 opacity-50" />
                <h2 className="text-[24px] font-medium text-[var(--foreground)] mb-3">No civic records found</h2>
                <p className="text-[16px] text-[var(--color-graphite)] mb-10 max-w-md leading-relaxed">
                  You haven&apos;t filed any reports yet. Use the incident detection system to identify and report issues.
                </p>
                <button
                  onClick={() => router.push('/detect')}
                  className="bg-[var(--color-abyssal)] text-[var(--color-paper)] font-bold tracking-widest uppercase px-8 py-4 hover:bg-black transition-colors"
                >
                  INITIALIZE DETECTION
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {complaints.map((c) => (
                  <IncidentCard key={c.id} incident={c} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ───────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[var(--color-lichen)] pb-8">
              <div>
                <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--color-graphite)] block mb-2">SYSTEM SIGNALS</span>
                <h1 className="text-[36px] font-medium text-[var(--foreground)] leading-tight tracking-tight">NOTIFICATIONS</h1>
              </div>
              {unreadNotifs > 0 && (
                <span className="bg-[var(--color-biolime)] text-[var(--color-abyssal)] font-bold tracking-widest uppercase text-[12px] px-4 py-2 flex items-center gap-2 shadow-sm">
                  <SignalDot /> {unreadNotifs} UNREAD
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-20 border border-[var(--color-lichen)] text-center flex flex-col items-center bg-[var(--color-paper)] shadow-sm">
                <Bell className="size-16 text-[var(--color-graphite)] mb-6 opacity-50" />
                <h2 className="text-[24px] font-medium text-[var(--foreground)] mb-3">No system alerts</h2>
                <p className="text-[16px] text-[var(--color-graphite)] max-w-md leading-relaxed">
                  You&apos;re all caught up. Any updates regarding your reported civic issues will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] divide-y divide-[var(--color-lichen)] shadow-sm">
                {notifications.map((n) => {
                  const isRead = n.isRead || n.read
                  const route = getComplaintRoute(n)
                  return (
                    <div
                      key={n._id || n.id}
                      className={`p-6 md:p-8 flex flex-col md:flex-row items-start justify-between gap-6 transition-colors hover:bg-[var(--color-tissue)]/30 ${
                        !isRead ? 'bg-[var(--color-tissue)] relative' : ''
                      }`}
                    >
                      {!isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-biolime)]" />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="text-[16px] font-bold text-[var(--foreground)] tracking-tight">{n.title}</h4>
                          {!isRead && (
                            <span className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] text-[var(--color-graphite)] leading-relaxed">{n.message}</p>
                        <p className="text-[12px] font-bold tracking-widest text-[var(--color-graphite)] mt-4 uppercase">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                        {route && (
                          <button
                            onClick={() => router.push(route)}
                            className="bg-[var(--color-paper)] border border-[var(--color-lichen)] hover:bg-[var(--color-tissue)] text-[var(--foreground)] text-[12px] font-bold tracking-widest uppercase px-6 py-3 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                          >
                            <Eye className="size-4" /> VIEW RECORD
                          </button>
                        )}
                        {!isRead && (
                          <button
                            onClick={() => markNotifRead(n._id || n.id)}
                            className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] hover:bg-black text-[12px] font-bold tracking-widest uppercase px-6 py-3 transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                          >
                            <Check className="size-4" /> ACKNOWLEDGE
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

        {/* ── PROFILE TAB ─────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-[var(--color-lichen)] pb-8">
              <div>
                <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--color-graphite)] block mb-2">CIVIC IDENTITY</span>
                <h2 className="text-[36px] font-medium text-[var(--foreground)] leading-tight">CITIZEN PROFILE</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT: Profile Identity Panel */}
              <div className="lg:col-span-4 flex flex-col gap-8">
                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] rounded-2xl p-8 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-32 bg-[var(--color-tissue)] border-b border-[var(--color-lichen)]" />
                  <div className="relative z-10 size-32 rounded-full border-4 border-[var(--color-paper)] bg-[var(--color-abyssal)] flex items-center justify-center shadow-md mb-6 mt-12">
                    <span className="text-[48px] font-medium text-[var(--color-paper)]">
                      {user?.name?.[0]?.toUpperCase() || 'C'}
                    </span>
                  </div>
                  <h3 className="text-[28px] font-medium text-[var(--foreground)] mb-1">{user?.name || 'Citizen User'}</h3>
                  <p className="text-[16px] text-[var(--color-graphite)] mb-6">{user?.email || 'No email provided'}</p>
                  
                  <div className="w-full border-t border-[var(--color-lichen)] pt-6 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-[var(--color-graphite)] font-medium uppercase tracking-wide">Account Status</span>
                      <span className="text-[var(--color-biolime)] bg-[var(--color-abyssal)] px-3 py-1 rounded font-bold tracking-wider text-[11px] uppercase">Active</span>
                    </div>
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-[var(--color-graphite)] font-medium uppercase tracking-wide">Role Level</span>
                      <span className="text-[var(--foreground)] font-semibold">Verified Citizen</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Account Contribution & Info */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Account Contribution Statistics */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] rounded-2xl p-8 shadow-sm">
                  <h4 className="text-[13px] font-bold text-[var(--color-graphite)] uppercase tracking-widest mb-6">Civic Contributions</h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-[40px] font-medium leading-none text-[var(--foreground)]">{complaints.length}</span>
                      <span className="text-[14px] font-medium text-[var(--color-graphite)]">Total Reports</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[40px] font-medium leading-none text-[var(--color-biolime)] bg-[var(--color-abyssal)] w-fit px-3 py-1 rounded-lg">
                        {resolvedComplaints}
                      </span>
                      <span className="text-[14px] font-medium text-[var(--color-graphite)]">Resolved</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[40px] font-medium leading-none text-[var(--foreground)]">
                        {activeComplaints}
                      </span>
                      <span className="text-[14px] font-medium text-[var(--color-graphite)]">In Progress</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[40px] font-medium leading-none text-[var(--color-graphite)]">
                        {pendingVerify}
                      </span>
                      <span className="text-[14px] font-medium text-[var(--color-graphite)]">Pending</span>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-[var(--color-lichen)] bg-[var(--color-tissue)]">
                    <h4 className="text-[13px] font-bold text-[var(--color-graphite)] uppercase tracking-widest">Account Information</h4>
                  </div>
                  <div className="divide-y divide-[var(--color-lichen)]">
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="w-1/3 shrink-0">
                        <span className="text-[14px] font-bold text-[var(--color-graphite)]">Full Name</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[16px] text-[var(--foreground)] font-medium">{user?.name || 'Not Provided'}</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="w-1/3 shrink-0">
                        <span className="text-[14px] font-bold text-[var(--color-graphite)]">Email Address</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[16px] text-[var(--foreground)] font-medium">{user?.email || 'Not Provided'}</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="w-1/3 shrink-0">
                        <span className="text-[14px] font-bold text-[var(--color-graphite)]">Phone Number</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-[16px] text-[var(--color-graphite)] italic">Configure in Settings</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8">
            <div>
              <h1 className="text-[32px] font-bold text-[var(--foreground)] tracking-tight">Settings</h1>
              <p className="text-[16px] text-[var(--color-graphite)] mt-1">Local preferences stored on this device.</p>
            </div>

            <div className="bg-[var(--color-paper)] border border-[var(--color-lichen)] rounded-xl divide-y divide-[var(--color-lichen)] shadow-sm">
              {[
                {
                  key: 'pushNotif',
                  label: 'Desktop Notifications',
                  desc: 'Show browser alerts when your complaints are updated',
                  defaultOn: true,
                },
                {
                  key: 'gpsStrict',
                  label: 'Precise Location Request',
                  desc: 'Use highly accurate hardware GPS instead of general cell towers when reporting issues',
                  defaultOn: true,
                },
              ].map((setting) => {
                const stored =
                  typeof window !== 'undefined' ? localStorage.getItem(`citizen-pref-${setting.key}`) : null
                const isOn = stored === null ? setting.defaultOn : stored === 'true'
                return (
                  <div key={setting.key} className="flex items-start justify-between p-8 gap-6">
                    <div>
                      <p className="text-[16px] font-bold text-[var(--foreground)] mb-1">{setting.label}</p>
                      <p className="text-[15px] text-[var(--color-graphite)]">{setting.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        defaultChecked={isOn}
                        onChange={(e) => {
                          if (typeof window !== 'undefined') {
                            localStorage.setItem(`citizen-pref-${setting.key}`, String(e.target.checked))
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-[var(--color-tissue)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-lichen)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-abyssal)] border border-[var(--color-lichen)]"></div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}

export default function CitizenPortal() {
  return (
    <React.Suspense fallback={<div className="p-8 text-[var(--color-graphite)] text-tech-label">LOADING PORTAL...</div>}>
      <CitizenPortalInner />
    </React.Suspense>
  )
}
