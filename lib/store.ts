'use client'

import { createContext, useContext } from 'react'

/* ── Types ───────────────────────────────────────────────────────── */

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical' | 'None'
export type Status =
  | 'Submitted'
  | 'Pending'
  | 'Needs Review'
  | 'Accepted'
  | 'In Progress'
  | 'Work Done'
  | 'Citizen Confirmation'
  | 'Resolved'
  | 'Rejected'
  | 'Reopened'
  | 'Failed'

export type ImageQuality = 'Good' | 'Fair' | 'Poor' | 'Night'
export type UserRole = 'ADMIN' | 'CITIZEN'

export type User = {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
}

export type Settings = {
  notifications: {
    incidentDetected: boolean
    highSeverity: boolean
    needsVerification: boolean
    locationMismatch: boolean
  }
  isDemoMode?: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  notifications: {
    incidentDetected: true,
    highSeverity: true,
    needsVerification: true,
    locationMismatch: true,
  },
  isDemoMode: false,
}

export type Incident = {
  id: string
  complaintNumber?: string
  type: string
  shortType: string
  confidence: number
  severity: Severity
  status: Status | string
  backendStatus?: string
  location: string | { type: string; coordinates: [number, number] } | any
  locality?: string
  source: string
  sourceType?: string
  timestamp: string
  image: string
  quality: ImageQuality | string
  reason: string
  description?: string
  coords?: [number, number]
  jurisdiction?: string
  jurisdictionStatus?: string
  verificationRequired?: boolean
  duplicateOf?: string
  duplicateStatus?: string
  locationMismatch?: boolean
  createdAt?: number | string
  completionEvidence?: string
  municipalityResponse?: string
  citizenConfirmation?: 'CONFIRMED' | 'PROBLEM_STILL_EXISTS' | 'PENDING'
  citizenConfirmationNote?: string
  citizenId?: any
  fileHash?: string
  detectedObjects?: Array<{ label: string; confidence: number }>
}

export type Toast = {
  id: string
  title: string
  description?: string
  variant: 'success' | 'warning' | 'error' | 'info'
}

/* ── Empty Live Incidents (NO MOCK / DEMO INCIDENTS) ─────────────── */

export const EMPTY_INCIDENTS: Incident[] = []

export const categories = [
  { name: 'C&D Waste', value: 42, color: '#34d399' },
  { name: 'Garbage Pile', value: 28, color: '#22d3ee' },
  { name: 'Mixed Waste', value: 18, color: '#fbbf24' },
  { name: 'Overflowing Bin', value: 12, color: '#fb7185' },
]

export const statusColors: Record<string, string> = {
  'Submitted': 'text-sky-600 bg-sky-50 border-sky-200',
  'Pending': 'text-amber-600 bg-amber-50 border-amber-200',
  'Needs Review': 'text-amber-700 bg-amber-50 border-amber-300',
  'Accepted': 'text-blue-600 bg-blue-50 border-blue-200',
  'In Progress': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  'Work Done': 'text-purple-600 bg-purple-50 border-purple-200',
  'Citizen Confirmation': 'text-purple-700 bg-purple-50 border-purple-300',
  'Resolved': 'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Rejected': 'text-rose-600 bg-rose-50 border-rose-200',
  'Reopened': 'text-orange-600 bg-orange-50 border-orange-300',
  'Failed': 'text-slate-600 bg-slate-100 border-slate-300',
}

export const severityColors: Record<string, string> = {
  Critical: 'text-rose-700 bg-rose-50 border-rose-200',
  High: 'text-orange-700 bg-orange-50 border-orange-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  None: 'text-slate-600 bg-slate-50 border-slate-200',
}

/* ── Context & Hook ──────────────────────────────────────────────── */

export type StoreState = {
  incidents: Incident[]
  user: User | null
  settings: Settings
  toasts: Toast[]
  loading: boolean
  addIncident: (incident: Incident) => void
  updateIncidentStatus: (id: string, status: Status) => void
  login: (user: User) => void
  logout: () => void
  updateSettings: (settings: Partial<Settings>) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  refreshIncidents: () => Promise<void>
  getDashboardStats?: (sourceFilter?: string) => { total: number; pending: number; verification: number; resolved: number }
  clearDemoData: () => void
}

export const StoreContext = createContext<StoreState | null>(null)

export function useStore(): StoreState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

/* ── Local storage helpers ───────────────────────────────────────── */

const USER_KEY = 'cleanmysuru_user'
const SETTINGS_KEY = 'cleanmysuru_settings'

export function loadUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('cleanmysuru_user') || localStorage.getItem('cleanmysuru-user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveUser(user: User | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) {
      const serialized = JSON.stringify(user)
      localStorage.setItem('cleanmysuru_user', serialized)
      localStorage.setItem('cleanmysuru-user', serialized)
    } else {
      localStorage.removeItem('cleanmysuru_user')
      localStorage.removeItem('cleanmysuru-user')
    }
  } catch {}
}

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function generateId(): string {
  return `CM-${Math.floor(1000 + Math.random() * 9000)}`
}
