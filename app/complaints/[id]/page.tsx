'use client'

import { use, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Clock3,
  LocateFixed,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Camera,
  Loader2,
  Wrench,
  UploadCloud,
} from 'lucide-react'
import { AppShell, ComplianceDisclaimer, SeverityBadge, StatusBadge } from '@/components/cleanmysuru-ui'
import { DepthPanel, MagneticButton, SpatialCard, EvidenceStack, SignalDot } from '@/components/spatial-ui'
import { useStore, type Incident } from '@/lib/store'
import { api, normalizeImagePath } from '@/lib/api'
import { formatLocationString, formatCoordinates, parseLocation } from '@/lib/utils'

const ComplaintLocationMap = dynamic(
  () => import('@/components/complaint-location-map'),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full bg-[var(--color-tissue)] border hairline-border flex items-center justify-center text-tech-label text-[var(--color-graphite)]">
        INITIALIZING SPATIAL GRID...
      </div>
    ),
  }
)

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { incidents, addToast, user } = useStore()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [completionFile, setCompletionFile] = useState<File | null>(null)
  const [completionPreview, setCompletionPreview] = useState<string | null>(null)
  const [responseNote, setResponseNote] = useState('Garbage cleared from the roadside and area cleaned.')

  const [reopenNote, setReopenNote] = useState('')
  const [showReopenInput, setShowReopenInput] = useState(false)

  const fetchIncident = async () => {
    try {
      setLoading(true)
      const res = await api.getComplaintById(id)
      const raw = res?.data || res?.complaint || res?.incident || res
      if (raw) {
        const loc = parseLocation(raw.location, raw.locality)
        const lat = loc.lat ?? (raw.latitude !== undefined && raw.latitude !== null ? Number(raw.latitude) : undefined)
        const lng = loc.lng ?? (raw.longitude !== undefined && raw.longitude !== null ? Number(raw.longitude) : undefined)

        const evidenceStr = typeof raw.evidence === 'string'
          ? raw.evidence
          : (raw.evidence?.filePath || raw.evidence?.path || raw.image || '')
        const completionStr = typeof raw.completionEvidence === 'string'
          ? raw.completionEvidence
          : (raw.completionEvidence?.filePath || raw.completionEvidence?.path || '')

        const hasCoords = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
        const coords: [number, number] | undefined = hasCoords ? [lat, lng] : undefined

        const normalized: Incident = {
          ...raw,
          id: raw.complaintNumber || raw.complaintId || raw.id || id,
          complaintNumber: raw.complaintNumber || raw.complaintId || raw.id || id,
          type: raw.aiAnalysis?.description ? (raw.incidentType?.replace(/_/g, ' ') || raw.type) : (raw.type || raw.incidentType?.replace(/_/g, ' ') || 'Civic Waste'),
          shortType: raw.incidentType?.replace(/_/g, ' ') || raw.shortType || 'Waste',
          confidence: raw.aiAnalysis?.confidence ?? raw.confidence ?? 0,
          severity: raw.severity || 'Medium',
          status: raw.status || 'Submitted',
          backendStatus: raw.status || 'SUBMITTED',
          location: raw.location || (lat !== undefined && lng !== undefined ? { type: 'Point', coordinates: [lng, lat] } : raw.locality || 'Mysuru'),
          locality: raw.locality || loc.name,
          coords,
          timestamp: raw.createdAt ? new Date(raw.createdAt).toLocaleString() : new Date().toLocaleString(),
          image: normalizeImagePath(evidenceStr),
          quality: raw.aiAnalysis?.imageQuality || raw.imageQuality || 'GOOD',
          reason: raw.aiAnalysis?.reasoning || raw.reasoning || raw.reason || 'Preliminary screening completed.',
          description: raw.description || '',
          completionEvidence: completionStr ? normalizeImagePath(completionStr) : undefined,
          municipalityResponse: raw.municipalityResponse,
          citizenConfirmation: raw.citizenConfirmation,
        }
        setIncident(normalized)
      }
    } catch (err: any) {
      console.error('Failed to fetch complaint:', err)
      const found = incidents.find((i) => i.id === id || i.complaintNumber === id)
      if (found) setIncident(found)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncident()
  }, [id])

  if (loading && !incident) {
    return (
      <AppShell eyebrow="Complaint Investigation" title="Initializing...">
        <div className="min-h-[400px] flex flex-col items-center justify-center text-[var(--color-graphite)] gap-6">
          <div className="size-6 border border-[var(--color-biolime)] border-t-transparent rounded-full animate-spin" />
          <p className="text-tech-label">RETRIEVING REPORT METRICS...</p>
        </div>
      </AppShell>
    )
  }

  if (!incident) {
    return (
      <AppShell eyebrow="Complaint Investigation" title="Not Found">
        <div className="flex flex-col items-center py-20 text-center gap-6 text-[var(--foreground)]">
          <AlertTriangle className="size-12 text-[var(--color-graphite)]" />
          <p className="text-subheading">COMPLAINT #{id} NOT FOUND IN ACTIVE INDEX.</p>
          <MagneticButton onClick={() => router.push(user?.role === 'ADMIN' ? '/admin' : '/citizen')}>
            <span className="bg-[var(--color-abyssal)] text-[var(--color-paper)] text-tech-label font-bold px-6 py-4 block hover:bg-black transition-colors">
              RETURN TO CONSOLE
            </span>
          </MagneticButton>
        </div>
      </AppShell>
    )
  }

  const rawStatus = incident.backendStatus || incident.status
  const isAdmin = user?.role === 'ADMIN'
  const isCitizen = !isAdmin

  const handleAdminAccept = async () => {
    setSubmitting(true)
    try {
      const res = await api.updateComplaintStatus(incident.id, 'ACCEPTED', 'Complaint accepted for municipal clearance.')
      const updated = res.data || res
      setIncident((prev: any) => ({ ...prev, ...updated, status: 'Accepted', backendStatus: 'ACCEPTED' }))
      await fetchIncident()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminStartWork = async () => {
    setSubmitting(true)
    try {
      const res = await api.updateComplaintStatus(incident.id, 'IN_PROGRESS', 'Sanitation team dispatched to site.')
      const updated = res.data || res
      setIncident((prev: any) => ({ ...prev, ...updated, status: 'In Progress', backendStatus: 'IN_PROGRESS' }))
      await fetchIncident()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminReject = async () => {
    setSubmitting(true)
    try {
      const res = await api.updateComplaintStatus(incident.id, 'REJECTED', 'Complaint reviewed and rejected.')
      const updated = res.data || res
      setIncident((prev: any) => ({ ...prev, ...updated, status: 'Rejected', backendStatus: 'REJECTED' }))
      await fetchIncident()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminCleaned = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completionFile) return
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('completionEvidence', completionFile)
      formData.append('notes', responseNote)
      formData.append('responseNote', responseNote)

      const res = await api.markWorkDone(incident.id, formData)
      const updated = res.data || res
      setIncident((prev: any) => ({ ...prev, ...updated, status: 'Work Done', backendStatus: 'WORK_DONE' }))
      setCompletionFile(null)
      setCompletionPreview(null)
      await fetchIncident()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCitizenConfirm = async (confirmed: boolean) => {
    setSubmitting(true)
    try {
      if (confirmed) {
        const res = await api.confirmResolution(incident.id)
        const updated = res.data || res
        setIncident((prev: any) => ({ ...prev, ...updated, status: 'Resolved', backendStatus: 'RESOLVED' }))
      } else {
        const note = reopenNote.trim() || 'Citizen reported problem still exists after municipal work.'
        const res = await api.reopenComplaint(incident.id, note)
        const updated = res.data || res
        setIncident((prev: any) => ({ ...prev, ...updated, status: 'Reopened', backendStatus: 'REOPENED' }))
        setShowReopenInput(false)
      }
      await fetchIncident()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCompletionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCompletionFile(file)
      setCompletionPreview(URL.createObjectURL(file))
    }
  }

  const isAccepted = ['ACCEPTED', 'IN_PROGRESS', 'WORK_DONE', 'CITIZEN_CONFIRMATION', 'RESOLVED', 'REOPENED'].includes(rawStatus)
  const isWorkDone = ['WORK_DONE', 'CITIZEN_CONFIRMATION', 'RESOLVED'].includes(rawStatus)
  const isResolved = rawStatus === 'RESOLVED'
  const isReopened = rawStatus === 'REOPENED'

  return (
    <AppShell eyebrow="INCIDENT REPORT" title={`ID: ${incident.id}`}>
      <div className="w-full pb-24 space-y-16">
        
        {/* Header Section */}
        <div>
          <button 
            onClick={() => router.push(isAdmin ? '/admin' : '/citizen')}
            className="flex items-center gap-2 text-tech-label text-[var(--color-graphite)] hover:text-[var(--foreground)] transition-colors mb-8"
          >
            <ArrowLeft className="size-4" /> 
            BACK TO {isAdmin ? 'ADMIN CONSOLE' : 'MY COMPLAINTS'}
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b hairline-b border-b-0 pb-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <span className="bg-[var(--color-abyssal)] text-[var(--color-paper)] text-tech-label px-3 py-1 font-bold">
                  ID: {incident.id}
                </span>
                <span className="text-tech-label text-[var(--color-graphite)]">
                  {incident.timestamp}
                </span>
              </div>
              <h1 className="text-large-heading text-[var(--foreground)] uppercase mb-6">
                {incident.type}
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={rawStatus} />
                <span className="flex items-center gap-2 text-tech-label text-[var(--color-graphite)]">
                  <LocateFixed className="size-4" />
                  {formatLocationString(incident.location, incident.locality)}
                </span>
              </div>
            </div>

            <div className="flex gap-8 border-l hairline-l border-l-0 pl-12">
              <div>
                <p className="text-tech-label text-[var(--color-graphite)] mb-1">AI CONFIDENCE</p>
                <p className="text-heading text-[var(--color-biolime)] flex items-center gap-2">
                  <SignalDot /> {incident.confidence}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {isReopened && (
          <DepthPanel className="bg-[var(--color-abyssal)] p-8 border-l-[4px] border-[var(--color-biolime)]" zOffset={6}>
             <div className="flex items-start gap-4">
                <AlertTriangle className="size-6 text-amber-500 mt-1" />
                <div>
                  <p className="text-subheading text-[var(--color-paper)]">REOPENED BY CITIZEN</p>
                  <p className="text-tech-label text-[var(--color-tissue)] mt-2">
                    The citizen indicated the issue was not fully cleaned or waste has resurfaced. Immediate municipal re-inspection is required.
                  </p>
                </div>
             </div>
          </DepthPanel>
        )}

        {isResolved && (
          <DepthPanel className="bg-[var(--color-abyssal)] p-8 border-l-[4px] border-emerald-500" zOffset={6}>
             <div className="flex items-start gap-4">
                <Check className="size-6 text-emerald-500 mt-1" />
                <div>
                  <p className="text-subheading text-[var(--color-paper)]">VERIFIED RESOLVED</p>
                  <p className="text-tech-label text-[var(--color-tissue)] mt-2">
                    The citizen has inspected the completion evidence and verified the area is clean. Case closed.
                  </p>
                </div>
             </div>
          </DepthPanel>
        )}

        {/* ── Main Layout: 2 Columns ────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
          
          {/* Left Column: Evidence & Lifecycle */}
          <div className="xl:col-span-7 space-y-12">
            
            {/* Original Evidence */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <span className="text-tech-label text-[var(--color-graphite)] flex items-center gap-2">
                  <Camera className="size-4" /> ORIGINAL CAPTURE
                </span>
                <span className="bg-[var(--color-tissue)] text-[var(--color-graphite)] text-tech-label px-2 py-1">
                  SOURCE MATERIAL
                </span>
              </div>
              <EvidenceStack src={incident.image} className="aspect-video w-full mb-8" />
              
              {incident.description && (
                <SpatialCard className="p-6">
                  <p className="text-tech-label text-[var(--color-graphite)] mb-2">FIELD NOTES</p>
                  <p className="text-body font-mono text-[var(--foreground)]">{incident.description}</p>
                </SpatialCard>
              )}

              <div className="mt-12 pt-8 border-t hairline-b border-b-0">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-tech-label text-[var(--color-graphite)] flex items-center gap-2">
                    <LocateFixed className="size-4" /> SPATIAL MAPPING
                  </p>
                  <span className="text-tech-label font-mono text-[var(--foreground)]">
                    {formatCoordinates(incident.location, incident.locality)}
                  </span>
                </div>
                <div className="border hairline-border p-2 bg-[var(--color-paper)]">
                  <ComplaintLocationMap
                    coordinates={incident.coords}
                    locality={incident.locality || (typeof incident.location === 'string' ? incident.location : 'Mysuru')}
                  />
                </div>
              </div>
            </div>

            {/* Completion Evidence (If available) */}
            {incident.completionEvidence && (
              <div className="mt-12 pt-12 border-t hairline-b border-b-0">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-tech-label text-[var(--color-graphite)] flex items-center gap-2">
                    <Check className="size-4 text-emerald-500" /> RESOLUTION EVIDENCE
                  </span>
                  <span className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] text-tech-label px-2 py-1">
                    WORK DONE
                  </span>
                </div>
                <EvidenceStack src={incident.completionEvidence} className="aspect-video w-full" />
                
                {incident.municipalityResponse && (
                  <SpatialCard className="p-6 mt-8 border-l-[4px] border-l-[var(--color-biolime)]">
                    <p className="text-tech-label text-[var(--color-graphite)] mb-2">ADMIN RESPONSE NOTE</p>
                    <p className="text-body font-mono text-[var(--foreground)]">{incident.municipalityResponse}</p>
                  </SpatialCard>
                )}
              </div>
            )}

            {/* Lifecycle Timeline */}
            <div className="pt-12">
              <p className="text-tech-label text-[var(--color-graphite)] mb-8">LIFECYCLE TIMELINE</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                
                <div className="flex flex-col gap-3">
                  <div className="size-8 rounded-full border hairline-border bg-[var(--color-abyssal)] text-[var(--color-paper)] flex items-center justify-center">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <p className="text-tech-label text-[var(--foreground)] font-bold">1. INTAKE</p>
                    <p className="text-tech-label text-[var(--color-graphite)] mt-1">Complete</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="size-8 rounded-full border hairline-border bg-[var(--color-abyssal)] text-[var(--color-paper)] flex items-center justify-center">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <p className="text-tech-label text-[var(--foreground)] font-bold">2. AI VISION</p>
                    <p className="text-tech-label text-[var(--color-graphite)] mt-1">Complete</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className={`size-8 rounded-full border hairline-border flex items-center justify-center ${isAccepted ? 'bg-[var(--color-abyssal)] text-[var(--color-paper)]' : 'bg-[var(--color-paper)] text-[var(--color-graphite)]'}`}>
                    {isAccepted ? <Check className="size-4" /> : <Clock3 className="size-4" />}
                  </div>
                  <div>
                    <p className="text-tech-label text-[var(--foreground)] font-bold">3. DISPATCH</p>
                    <p className="text-tech-label text-[var(--color-graphite)] mt-1">{isAccepted ? 'Active' : 'Pending'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                   <div className={`size-8 rounded-full border hairline-border flex items-center justify-center ${isWorkDone ? 'bg-[var(--color-abyssal)] text-[var(--color-paper)]' : 'bg-[var(--color-paper)] text-[var(--color-graphite)]'}`}>
                    {isWorkDone ? <Check className="size-4" /> : <Clock3 className="size-4" />}
                  </div>
                  <div>
                    <p className="text-tech-label text-[var(--foreground)] font-bold">4. RESOLVED</p>
                    <p className="text-tech-label text-[var(--color-graphite)] mt-1">{isWorkDone ? 'Proof Uploaded' : 'Pending Clearance'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                   <div className={`size-8 rounded-full border hairline-border flex items-center justify-center ${isResolved ? 'bg-[var(--color-biolime)] text-[var(--color-abyssal)]' : isReopened ? 'bg-rose-500 text-white' : 'bg-[var(--color-paper)] text-[var(--color-graphite)]'}`}>
                    {isResolved ? <Check className="size-4" /> : isReopened ? <RotateCcw className="size-4" /> : <Clock3 className="size-4" />}
                  </div>
                  <div>
                    <p className="text-tech-label text-[var(--foreground)] font-bold">5. VERIFIED</p>
                    <p className="text-tech-label text-[var(--color-graphite)] mt-1">{isResolved ? 'Confirmed' : isReopened ? 'Reopened' : 'Awaiting'}</p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: AI Analysis & Actions */}
          <div className="xl:col-span-5 space-y-12">
            
            {/* AI Diagnostics Card */}
            <SpatialCard className="p-8 sticky top-8">
              <div className="flex items-center justify-between mb-8 pb-4 border-b hairline-b border-b-0">
                <span className="text-tech-label text-[var(--color-graphite)] flex items-center gap-2">
                  <Sparkles className="size-4" /> AI DIAGNOSTICS
                </span>
                <span className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] text-tech-label px-2 py-1">
                  VISION ONLINE
                </span>
              </div>
              
              <div className="space-y-8">
                <div>
                  <p className="text-tech-label text-[var(--color-graphite)] mb-2">CLASSIFICATION</p>
                  <p className="text-subheading text-[var(--foreground)] uppercase">{incident.type}</p>
                </div>
                <div>
                  <p className="text-tech-label text-[var(--color-graphite)] mb-2">REASONING ENGINE</p>
                  <p className="text-body font-mono bg-[var(--color-tissue)] p-4 text-[var(--foreground)]">{incident.reason}</p>
                </div>
                <div>
                   <p className="text-tech-label text-[var(--color-graphite)] mb-2">METADATA</p>
                   <div className="flex justify-between items-center py-2 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-tech-label text-[var(--color-graphite)]">QUALITY</span>
                      <span className="text-tech-label text-[var(--foreground)]">{incident.quality}</span>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-tech-label text-[var(--color-graphite)]">LOC SOURCE</span>
                      <span className="text-tech-label text-[var(--foreground)] font-mono">{incident.locationSource || 'BROWSER_GPS'}</span>
                   </div>
                   <div className="flex justify-between items-center py-2">
                      <span className="text-tech-label text-[var(--color-graphite)]">COORDS</span>
                      <span className="text-tech-label text-[var(--foreground)] font-mono">{formatCoordinates(incident.location, incident.locality)}</span>
                   </div>
                </div>
              </div>
            </SpatialCard>

            {/* ACTION PANELS */}
            <div className="sticky top-[550px]">
              
              {/* ADMIN: ACCEPT / REJECT */}
              {isAdmin && ['SUBMITTED', 'NEEDS_REVIEW', 'AI_ANALYZED', 'Pending', 'Needs Review'].includes(rawStatus) && (
                <DepthPanel className="p-8 bg-[var(--color-paper)] border hairline-border mt-12" zOffset={4}>
                  <p className="text-tech-label text-[var(--color-graphite)] mb-6">ADMIN DECISION</p>
                  <div className="flex flex-col gap-4">
                    <MagneticButton onClick={handleAdminAccept} disabled={submitting}>
                      <span className="bg-[var(--color-abyssal)] text-[var(--color-paper)] hover:bg-black text-tech-label font-bold px-6 py-4 block text-center transition-colors">
                        {submitting ? 'PROCESSING...' : 'ACCEPT & DISPATCH'}
                      </span>
                    </MagneticButton>
                    <MagneticButton onClick={handleAdminReject} disabled={submitting}>
                      <span className="border hairline-border text-[var(--color-graphite)] hover:text-red-500 hover:border-red-500 text-tech-label px-6 py-4 block text-center transition-colors">
                        REJECT AS INVALID
                      </span>
                    </MagneticButton>
                  </div>
                </DepthPanel>
              )}

              {/* ADMIN: WORK COMPLETION */}
              {isAdmin && ['ACCEPTED', 'IN_PROGRESS', 'REOPENED'].includes(rawStatus) && (
                <DepthPanel className="p-8 bg-[var(--color-abyssal)] border-l-[4px] border-[var(--color-biolime)] mt-12" zOffset={6}>
                  <p className="text-tech-label text-[var(--color-paper)] mb-6 flex items-center gap-2">
                    <Wrench className="size-4" /> MUNICIPAL RESPONSE
                  </p>
                  
                  {(rawStatus === 'ACCEPTED' || rawStatus === 'REOPENED') && (
                    <div className="mb-8 pb-8 border-b hairline-b border-[var(--color-graphite)] border-b-0">
                      <MagneticButton onClick={handleAdminStartWork} disabled={submitting}>
                        <span className="border border-[var(--color-biolime)] text-[var(--color-biolime)] hover:bg-[var(--color-biolime)] hover:text-[var(--color-abyssal)] text-tech-label font-bold px-6 py-4 block text-center transition-colors">
                          MARK IN PROGRESS
                        </span>
                      </MagneticButton>
                    </div>
                  )}

                  <form onSubmit={handleAdminCleaned} className="space-y-6">
                    <div>
                      <label className="block text-tech-label text-[var(--color-graphite)] mb-3">UPLOAD RESOLUTION EVIDENCE</label>
                      <div className="border hairline-border border-[var(--color-graphite)] p-6 bg-black/20 text-center cursor-pointer hover:bg-black/40 transition-colors">
                        <UploadCloud className="size-6 text-[var(--color-paper)] mx-auto mb-3" />
                        <span className="text-tech-label text-[var(--color-paper)]">SELECT MEDIA FILE</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,video/mp4"
                          onChange={handleCompletionFileChange}
                          className="hidden"
                          id="completion-upload"
                          required
                        />
                      </div>
                      {/* Hidden label trigger */}
                      <label htmlFor="completion-upload" className="absolute inset-0 cursor-pointer opacity-0" />
                      {completionPreview && (
                        <div className="mt-4 border hairline-border">
                          <img src={completionPreview} alt="Preview" className="w-full h-40 object-cover" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                       <label className="block text-tech-label text-[var(--color-graphite)] mb-3">RESPONSE NOTES</label>
                       <textarea
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        rows={2}
                        className="w-full bg-black/20 border hairline-border border-[var(--color-graphite)] p-4 text-tech-label text-[var(--color-paper)] focus:outline-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !completionFile}
                      className="w-full bg-[var(--color-biolime)] text-[var(--color-abyssal)] text-tech-label font-bold px-6 py-4 block text-center hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'PROCESSING...' : 'SUBMIT WORK DONE'}
                    </button>
                  </form>
                </DepthPanel>
              )}

              {/* CITIZEN: VERIFY RESOLUTION */}
              {isCitizen && ['WORK_DONE', 'CITIZEN_CONFIRMATION'].includes(rawStatus) && (
                 <DepthPanel className="p-8 bg-[var(--color-abyssal)] border-l-[4px] border-[var(--color-biolime)] mt-12" zOffset={6}>
                  <p className="text-subheading text-[var(--color-paper)] mb-2">VERIFY RESOLUTION</p>
                  <p className="text-tech-label text-[var(--color-tissue)] mb-8">
                    The administration has uploaded completion evidence. Please verify.
                  </p>

                  {!showReopenInput ? (
                    <div className="flex flex-col gap-4">
                      <MagneticButton onClick={() => handleCitizenConfirm(true)} disabled={submitting}>
                        <span className="bg-[var(--color-biolime)] text-[var(--color-abyssal)] hover:bg-white text-tech-label font-bold px-6 py-4 block text-center transition-colors">
                          CONFIRM RESOLVED
                        </span>
                      </MagneticButton>
                      <MagneticButton onClick={() => setShowReopenInput(true)} disabled={submitting}>
                        <span className="border border-[var(--color-paper)] text-[var(--color-paper)] hover:text-amber-500 hover:border-amber-500 text-tech-label px-6 py-4 block text-center transition-colors">
                          PROBLEM STILL EXISTS
                        </span>
                      </MagneticButton>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-tech-label text-[var(--color-graphite)] mb-3">REASON FOR REOPENING</label>
                        <textarea
                          value={reopenNote}
                          onChange={(e) => setReopenNote(e.target.value)}
                          rows={3}
                          className="w-full bg-black/20 border hairline-border border-[var(--color-graphite)] p-4 text-tech-label text-[var(--color-paper)] focus:outline-none"
                          placeholder="Provide details..."
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleCitizenConfirm(false)}
                          disabled={submitting}
                          className="flex-1 bg-amber-500 text-black text-tech-label font-bold py-3 hover:bg-amber-400 transition-colors"
                        >
                          SUBMIT
                        </button>
                        <button
                          onClick={() => setShowReopenInput(false)}
                          className="flex-1 border border-[var(--color-graphite)] text-[var(--color-paper)] text-tech-label py-3 hover:bg-[var(--color-graphite)] hover:text-black transition-colors"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  )}
                 </DepthPanel>
              )}

            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
