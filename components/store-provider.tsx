'use client'

import { useState, useCallback, useEffect, type ReactNode } from 'react'
import {
  StoreContext,
  loadUser,
  saveUser,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type Incident,
  type Status,
  type Toast,
  type StoreState,
  type User,
  type Settings,
  type Severity,
} from '@/lib/store'
import { api, normalizeImagePath } from '@/lib/api'

function mapBackendStatusToFrontend(status: string): Status {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted'
    case 'AI_ANALYZED':
    case 'ACCEPTED':
      return 'Accepted'
    case 'NEEDS_REVIEW':
      return 'Needs Review'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'WORK_DONE':
      return 'Work Done'
    case 'CITIZEN_CONFIRMATION':
      return 'Citizen Confirmation'
    case 'RESOLVED':
      return 'Resolved'
    case 'REJECTED':
      return 'Rejected'
    case 'REOPENED':
      return 'Reopened'
    case 'AI_ANALYSIS_FAILED':
    case 'VIDEO_ANALYSIS_FAILED':
      return 'Failed'
    default:
      return 'Pending'
  }
}

function mapBackendSeverityToFrontend(sev?: string): Severity {
  if (!sev) return 'Medium'
  const upper = sev.toUpperCase()
  if (upper === 'CRITICAL') return 'Critical'
  if (upper === 'HIGH') return 'High'
  if (upper === 'MEDIUM') return 'Medium'
  if (upper === 'LOW') return 'Low'
  return 'None'
}

function mapBackendTypeToFrontend(type?: string): { type: string; shortType: string } {
  switch (type) {
    case 'C_AND_D':
      return { type: 'Suspected C&D Waste', shortType: 'C&D Waste' }
    case 'GARBAGE_PILE':
      return { type: 'Suspected Garbage Pile', shortType: 'Garbage Pile' }
    case 'OVERFLOWING_BIN':
      return { type: 'Suspected Overflowing Bin', shortType: 'Overflowing Bin' }
    case 'MIXED_WASTE':
      return { type: 'Suspected Mixed Waste', shortType: 'Mixed Waste' }
    case 'NO_RELEVANT_WASTE_DETECTED':
      return { type: 'No Civic Waste Detected', shortType: 'Clean Area' }
    case 'INSUFFICIENT_EVIDENCE':
      return { type: 'Insufficient Evidence', shortType: 'Unclear' }
    case 'VIDEO_ANALYSIS_FAILED':
      return { type: 'Video Analysis Failed', shortType: 'Video Error' }
    case 'AI_ANALYSIS_FAILED':
      return { type: 'AI Analysis Failed', shortType: 'Analysis Error' }
    default:
      return { type: 'Civic Waste Report', shortType: 'Waste' }
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loading, setLoading] = useState(true)

  const refreshIncidents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getComplaints({ all: true })
      const rawList = res.data || res.incidents || []

      const mapped: Incident[] = rawList.map((item: any) => {
        const { type, shortType } = mapBackendTypeToFrontend(item.incidentType)
        const lat = item.location?.coordinates?.[1] || item.latitude || 12.2958
        const lng = item.location?.coordinates?.[0] || item.longitude || 76.6394

        return {
          id: item.complaintNumber || item.complaintId || item._id,
          complaintNumber: item.complaintNumber || item.complaintId,
          type,
          shortType,
          confidence: item.confidence || 0,
          severity: mapBackendSeverityToFrontend(item.severity),
          status: mapBackendStatusToFrontend(item.status),
          backendStatus: item.status,
          location: item.locality || item.city || 'Mysuru',
          locality: item.locality,
          source: 'Citizen',
          sourceType: 'LIVE',
          timestamp: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent',
          image: normalizeImagePath(item.evidence),
          quality: item.imageQuality === 'POOR' ? 'Poor' : item.nightDetected ? 'Night' : 'Good',
          reason: item.reasoning || item.description || '',
          description: item.description,
          coords: [lat, lng],
          jurisdiction: item.jurisdictionStatus,
          verificationRequired: item.verificationRequired,
          duplicateOf: item.duplicateOf,
          duplicateStatus: item.duplicateStatus,
          locationMismatch: item.jurisdictionStatus === 'LOCATION_MISMATCH',
          createdAt: item.createdAt,
          completionEvidence: item.completionEvidence ? normalizeImagePath(item.completionEvidence) : undefined,
          municipalityResponse: item.municipalityResponse,
          citizenConfirmation: item.citizenConfirmation,
          citizenConfirmationNote: item.citizenConfirmationNote,
          citizenId: item.citizenId,
          fileHash: item.fileHash,
          detectedObjects: item.detectedObjects,
        }
      })

      setIncidents(mapped)
    } catch (err: any) {
      console.warn('Could not fetch complaints from backend:', err?.message)
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    setUser(loadUser())
    setSettings(loadSettings())
    refreshIncidents()
  }, [refreshIncidents])

  // Sync user and settings to localStorage
  useEffect(() => {
    saveUser(user)
  }, [user])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const addIncident = useCallback((incident: Incident) => {
    setIncidents((prev) => [incident, ...prev])
  }, [])

  const updateIncidentStatus = useCallback((id: string, status: Status) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status } : inc))
    )
  }, [])

  const login = useCallback((loggedInUser: User) => {
    setUser(loggedInUser)
    saveUser(loggedInUser)
    refreshIncidents()
  }, [refreshIncidents])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {}
    localStorage.removeItem('cleanmysuru-token')
    setUser(null)
    saveUser(null)
    window.location.href = '/login'
  }, [])

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const getDashboardStats = useCallback((sourceFilter: string = 'ALL') => {
    const list = sourceFilter === 'ALL' ? incidents : incidents.filter((i) => i.sourceType === sourceFilter)
    return {
      total: list.length,
      pending: list.filter((i) => i.status === 'Pending' || i.status === 'Submitted').length,
      verification: list.filter((i) => i.status === 'In Progress' || i.status === 'Needs Review' || i.status === 'Work Done').length,
      resolved: list.filter((i) => i.status === 'Resolved' || i.status === 'Citizen Confirmation').length,
    }
  }, [incidents])

  const value: StoreState = {
    incidents,
    user,
    settings,
    toasts,
    loading,
    addIncident,
    updateIncidentStatus,
    login,
    logout,
    updateSettings,
    addToast,
    removeToast,
    refreshIncidents,
    getDashboardStats,
    clearDemoData: () => {},
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
