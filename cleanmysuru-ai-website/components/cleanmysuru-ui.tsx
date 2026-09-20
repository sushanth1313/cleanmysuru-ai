'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  LayoutDashboard,
  List,
  LocateFixed,
  LogOut,
  Map as MapIcon,
  Menu,
  PlusCircle,
  Settings,
  TrendingUp,
  User,
  X,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useStore, cx, loadUser, type Incident } from '@/lib/store'
import { parseLocation, formatLocationString } from '@/lib/utils'
import { api } from '@/lib/api'
import {
  SpatialCard,
  DepthPanel,
  MagneticButton,
  SignalDot,
  EvidenceStack,
  PageTransition,
} from './spatial-ui'

/* ── Location Display Cell ─────────────────────────────────── */
export function LocationCell({
  location,
  locality,
  className = '',
  light = false,
}: {
  location: any
  locality?: string
  className?: string
  light?: boolean
}) {
  const parsed = parseLocation(location, locality)
  return (
    <div className={cx('flex flex-col text-left leading-tight', className)}>
      <span
        className={cx('text-body truncate max-w-[240px]', light ? 'text-[var(--color-paper)]' : 'text-[var(--foreground)]')}
        title={parsed.name}
      >
        {parsed.name}
      </span>
      {parsed.coordsText ? (
        <span className={cx('text-tech-label mt-1', light ? 'text-[var(--color-lichen)]' : 'text-[var(--color-graphite)]')}>
          {parsed.coordsText}
        </span>
      ) : null}
    </div>
  )
}

/* ── Logo ──────────────────────────────────────────────────── */
export function Logo({
  compact = false,
  inverted = false,
}: {
  compact?: boolean
  inverted?: boolean
}) {
  return (
    <Link href="/" className={cx('group flex items-center gap-3 select-none', compact && 'justify-center')}>
      {!compact && (
        <div className="flex flex-col">
          <span className={cx('text-[18px] tracking-tight font-medium flex items-center gap-1.5 leading-tight', inverted ? 'text-[var(--color-paper)]' : 'text-[var(--foreground)]')}>
            CLEAN<span className="font-light">MYSURU</span>
            <span className="font-light text-[var(--color-graphite)] ml-1">AI</span>
          </span>
          <span className={cx('text-tech-label mt-0.5', inverted ? 'text-[var(--color-lichen)]' : 'text-[var(--color-graphite)]')}>
            Civic Intelligence Lab
          </span>
        </div>
      )}
      {compact && (
        <span className={cx('text-[18px] font-medium tracking-tight', inverted ? 'text-[var(--color-paper)]' : 'text-[var(--foreground)]')}>
          CM<span className="font-light text-[var(--color-graphite)]">AI</span>
        </span>
      )}
    </Link>
  )
}

/* ── Sidebar ───────────────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { user, logout } = useStore()
  const isAdmin = user?.role === 'ADMIN'

  const citizenNav = [
    { label: 'Dashboard', href: '/citizen', icon: LayoutDashboard },
    { label: 'My Complaints', href: '/citizen?tab=complaints', icon: List },
    { label: 'Notifications', href: '/citizen?tab=notifications', icon: Bell },
    { label: 'Profile', href: '/citizen?tab=profile', icon: User },
  ]

  const adminNav = [
    { label: 'Operations', href: '/admin', icon: LayoutDashboard },
    { label: 'Complaint Queue', href: '/admin?tab=complaints', icon: List },
    { label: 'Alerts', href: '/admin?tab=notifications', icon: Bell },
    { label: 'Analytics', href: '/admin?tab=analytics', icon: BarChart3 },
    { label: 'Live City Map', href: '/map', icon: MapIcon },
    { label: 'Settings', href: '/admin?tab=settings', icon: Settings },
  ]

  const links = isAdmin ? adminNav : citizenNav

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cleanmysuru-token')
      localStorage.removeItem('cleanmysuru-user')
    }
    logout()
    router.push('/login')
  }

  // Active state matching handles query params for precise styling
  const isActive = (href: string) => {
    if (typeof window !== 'undefined') {
      // client side check matching exact URL including query params
      const currentUrl = pathname + window.location.search
      if (href === currentUrl) return true
      if (href === '/citizen' && currentUrl === '/citizen') return true
      if (href === '/admin' && currentUrl === '/admin') return true
    } else {
      if (href === pathname) return true
    }
    return false
  }

  return (
    <>
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex size-12 items-center justify-center border border-[var(--color-lichen)] bg-[var(--color-paper)] text-[var(--foreground)] lg:hidden shadow-sm rounded-lg"
      >
        <Menu className="size-6" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-[var(--color-abyssal)]/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--color-lichen)] bg-[var(--color-bone)] transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo & Header */}
        <div className="flex flex-col px-6 pt-10 pb-8 border-b border-[var(--color-lichen)]">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex flex-col select-none relative z-10" onClick={() => setOpen(false)}>
              <span className="text-[22px] tracking-tight font-medium flex items-center gap-1.5 leading-tight text-[var(--foreground)]">
                CLEAN<span className="font-light">MYSURU</span>
                <span className="font-light text-[var(--color-graphite)] ml-1">AI</span>
              </span>
              <span className="text-[12px] font-bold tracking-widest text-[var(--color-graphite)] mt-1 uppercase">
                Civic Intelligence Platform
              </span>
            </Link>
            <button onClick={() => setOpen(false)} className="lg:hidden text-[var(--color-graphite)] hover:bg-[var(--color-tissue)] p-2 rounded-md">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <SignalDot />
            <span className="text-[12px] font-bold text-[var(--color-graphite)] tracking-widest uppercase">
              {isAdmin ? 'MUNICIPAL ADMIN' : 'CITIZEN PORTAL'}
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-col flex-1 px-4 py-6 gap-2 overflow-y-auto">
          <span className="text-[11px] font-bold text-[var(--color-lichen)] tracking-widest uppercase px-4 mb-2">
            Navigation
          </span>
          {links.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cx(
                  'w-full flex items-center gap-4 px-4 h-[48px] rounded-xl text-left transition-all group relative',
                  active
                    ? 'bg-[var(--color-abyssal)] text-[var(--color-biolime)] shadow-sm'
                    : 'text-[var(--color-graphite)] hover:bg-[var(--color-tissue)] hover:text-[var(--foreground)]'
                )}
              >
                <item.icon className={cx("size-5 shrink-0", active ? "text-[var(--color-biolime)]" : "text-[var(--color-graphite)] group-hover:text-[var(--foreground)]")} />
                <span className={cx("text-[15px] font-medium tracking-wide", active ? "text-[var(--color-paper)]" : "")}>{item.label}</span>
                {active && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-[var(--color-biolime)]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Action Area & User Profile */}
        <div className="border-t border-[var(--color-lichen)] bg-[var(--color-paper)]/50 p-6 flex flex-col gap-6">
          {!isAdmin && (
            <Link
              href="/detect"
              onClick={() => setOpen(false)}
              className="w-full bg-[var(--color-abyssal)] text-[var(--color-biolime)] flex items-center justify-center gap-3 h-[52px] rounded-xl hover:bg-black transition-colors shadow-md group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <PlusCircle className="size-5 relative z-10" />
              <span className="text-[15px] font-bold tracking-widest uppercase relative z-10">Raise Complaint</span>
            </Link>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[var(--color-tissue)] border border-[var(--color-lichen)] flex items-center justify-center text-[16px] font-bold text-[var(--foreground)]">
                {user?.name ? user.name[0].toUpperCase() : (isAdmin ? 'A' : 'C')}
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[var(--foreground)] leading-none truncate max-w-[120px]">
                  {user?.name || (isAdmin ? 'Admin' : 'Citizen')}
                </span>
                <span className="text-[12px] text-[var(--color-graphite)] mt-1 truncate max-w-[120px]">
                  {user?.email || 'Active Session'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[var(--color-graphite)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ── Top Header Bar ────────────────────────────────────────── */
export function HeaderBar() {
  const router = useRouter()
  const { user } = useStore()
  const isAdmin = user?.role === 'ADMIN'
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const fetchUnread = async () => {
      try {
        const data = await api.getNotifications()
        if (mounted && data && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount)
        }
      } catch {}
    }
    fetchUnread()
    const timer = setInterval(fetchUnread, 30000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--color-lichen)] bg-[var(--color-paper)]/95 px-6 backdrop-blur-xl lg:px-10">
      <div className="hidden lg:flex flex-col">
        <span className="text-[12px] font-bold tracking-widest uppercase text-[var(--color-graphite)]">
          {isAdmin ? 'Admin Workspace' : 'Citizen Workspace'}
        </span>
        <h2 className="text-[20px] font-medium text-[var(--foreground)]">
          Civic Intelligence System
        </h2>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        {/* Notifications bell */}
        <Link
          href={isAdmin ? '/admin?tab=notifications' : '/citizen?tab=notifications'}
          className="relative text-[var(--color-graphite)] hover:text-[var(--foreground)] transition-colors flex items-center justify-center size-10 rounded-full hover:bg-[var(--color-tissue)]"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-[var(--color-biolime)] border-2 border-[var(--color-paper)]" />
          )}
        </Link>
      </div>
    </header>
  )
}

/* ── Footer ────────────────────────────────────────────────── */
export function CivicFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-lichen)] bg-[var(--color-bone)] py-12">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-bold text-[var(--foreground)] tracking-wide">CLEANMYSURU AI</span>
          <span className="text-[13px] text-[var(--color-graphite)] font-medium">CIVIC INTELLIGENCE PLATFORM — MYSURU CITY CORP</span>
        </div>
        <span className="text-[13px] font-medium text-[var(--color-graphite)]">© 2026. All rights reserved.</span>
      </div>
    </footer>
  )
}

/* ── AppShell ──────────────────────────────────────────────── */
export function AppShell({
  children,
  title,
  eyebrow,
  fullWidth = false,
}: {
  children: React.ReactNode
  title?: string
  eyebrow?: string
  fullWidth?: boolean
}) {
  const { user, loading } = useStore()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login' && pathname !== '/register') {
      const localUser = loadUser()
      if (!localUser) {
        router.push('/login')
      }
    }
  }, [user, loading, pathname, router])

  if (!user && pathname !== '/login' && pathname !== '/register') {
    const localUser = typeof window !== 'undefined' ? loadUser() : null
    if (!localUser && !loading) {
      return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bone)] text-[var(--foreground)] flex font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 lg:pl-[280px]">
        <HeaderBar />
        <PageTransition>
          <main
            className={cx(
              'flex-1 px-5 py-12 sm:px-8 lg:px-12',
              !fullWidth && 'max-w-[1600px] mx-auto w-full'
            )}
          >
            {(eyebrow || title) && (
              <div className="mb-12 max-w-4xl">
                {eyebrow && <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--color-graphite)] block mb-3">{eyebrow}</span>}
                {title && <h1 className="text-[40px] leading-tight font-medium tracking-tight text-[var(--foreground)]">{title}</h1>}
              </div>
            )}
            {children}
          </main>
        </PageTransition>
        <CivicFooter />
      </div>
    </div>
  )
}

/* ── Stat Card ─────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  accent = false,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  subtext?: string
  accent?: boolean
}) {
  return (
    <SpatialCard className={cx('p-6 flex flex-col justify-between min-h-[160px]', accent && 'bg-[var(--color-abyssal)]')}>
      <div className="flex items-start justify-between">
        <span className={cx('text-tech-label', accent ? 'text-[var(--color-lichen)]' : 'text-[var(--color-graphite)]')}>
          {label}
        </span>
        <Icon className={cx('size-4', accent ? 'text-[var(--color-biolime)]' : 'text-[var(--color-graphite)]')} />
      </div>
      <div className="mt-4">
        <div className={cx('text-large-heading leading-none', accent ? 'text-[var(--color-biolime)]' : 'text-[var(--foreground)]')}>
          {value}
        </div>
        {subtext && (
          <p className={cx('text-tech-label mt-2', accent ? 'text-[var(--color-lichen)]' : 'text-[var(--color-graphite)]')}>
            {subtext}
          </p>
        )}
      </div>
    </SpatialCard>
  )
}

/* ── Severity Badge ────────────────────────────────────────── */
export function SeverityBadge({ severity }: { severity: string }) {
  const colorMap: Record<string, string> = {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High: 'bg-orange-50 text-orange-700 border-orange-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-green-50 text-green-700 border-green-200',
  }
  return (
    <span className={cx('tag-pill', colorMap[severity] || '')}>
      {severity}
    </span>
  )
}

/* ── Status Badge ──────────────────────────────────────────── */
export function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toUpperCase()
  const isResolved = ['RESOLVED', 'WORK_DONE', 'CITIZEN_CONFIRMATION'].includes(s)
  const isActive = ['ACCEPTED', 'IN_PROGRESS'].includes(s)
  const isRejected = s === 'REJECTED'
  const isReopened = s === 'REOPENED'

  return (
    <span
      className={cx(
        'tag-pill',
        isResolved && 'bg-[var(--color-abyssal)] text-[var(--color-biolime)] border-transparent',
        isActive && 'bg-blue-50 text-blue-700 border-blue-200',
        isRejected && 'bg-red-50 text-red-700 border-red-200',
        isReopened && 'bg-orange-50 text-orange-700 border-orange-200'
      )}
    >
      {isResolved && <SignalDot />}
      {status}
    </span>
  )
}

/* ── Incident Card ─────────────────────────────────────────── */
export function IncidentCard({
  incident,
  compact = false,
}: {
  incident: Incident
  compact?: boolean
}) {
  const router = useRouter()
  return (
    <SpatialCard onClick={() => router.push(`/complaints/${incident.id}`)} className="group flex flex-col cursor-pointer">
      {/* Image */}
      <div className="w-full aspect-[4/3] relative overflow-hidden bg-[var(--color-tissue)]">
        <EvidenceStack src={incident.image} className="w-full h-full" fallback="NO EVIDENCE" />
      </div>

      {/* Metadata */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-tech-label text-[var(--color-graphite)]">{incident.id}</span>
          <span className="text-tech-label text-[var(--foreground)] font-medium">{incident.confidence}%</span>
        </div>
        <p className="text-[15px] font-medium text-[var(--foreground)] mb-1 truncate">{incident.type}</p>
        <p className="text-tech-label text-[var(--color-graphite)] mb-4 truncate">
          {formatLocationString(incident.location, incident.locality)}
        </p>
        <div className="mt-auto pt-4 border-t border-[var(--color-lichen)] flex items-center justify-between">
          <StatusBadge status={incident.status} />
          <ChevronRight className="size-4 text-[var(--color-graphite)] group-hover:text-[var(--foreground)] transition-colors" />
        </div>
      </div>
    </SpatialCard>
  )
}

/* ── Evidence Viewer ───────────────────────────────────────── */
export function EvidenceViewer({ incident }: { incident: Incident }) {
  return (
    <div className="relative w-full aspect-[4/3] border border-[var(--color-lichen)] overflow-hidden bg-[var(--color-tissue)]">
      <EvidenceStack src={incident.image} className="w-full h-full" fallback="AWAITING EVIDENCE" />
    </div>
  )
}

/* ── Compliance Disclaimer ─────────────────────────────────── */
export function ComplianceDisclaimer() {
  return (
    <div className="mt-12 p-5 border border-[var(--color-lichen)] bg-[var(--color-tissue)]">
      <p className="text-tech-label text-[var(--color-graphite)] leading-relaxed">
        <span className="text-[var(--foreground)] font-bold">STATUTORY NOTICE:</span>{' '}
        AI detection constitutes preliminary screening. All actions require municipal verification before enforcement.
      </p>
    </div>
  )
}

/* ── Section Heading ───────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-8">
      <div>
        {eyebrow && <span className="text-tech-label text-[var(--color-graphite)] block mb-3">{eyebrow}</span>}
        <h2 className="text-heading text-[var(--foreground)]">{title}</h2>
        {description && <p className="mt-3 max-w-2xl text-body text-[var(--color-graphite)]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export { Check, CheckCircle2, TrendingUp }
