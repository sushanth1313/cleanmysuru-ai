'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowRight,
  Check,
  FileImage,
  ImageIcon,
  LocateFixed,
  MapPin,
  Play,
  Trash2,
  UploadCloud,
  Video,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Search,
  Camera,
} from 'lucide-react'
import { AppShell, ComplianceDisclaimer } from '@/components/cleanmysuru-ui'
import { DepthPanel, MagneticButton, SpatialCard, EvidenceStack, SignalDot } from '@/components/spatial-ui'
import { useStore } from '@/lib/store'
import { api, normalizeImagePath } from '@/lib/api'
import { searchMysuruLocations, reverseGeocodeLocation, formatCoordinates as formatCoordsText, type LocationSearchResult } from '@/lib/mysuru-locations'
import { motion, AnimatePresence } from 'framer-motion'

const LocationPickerMap = dynamic(() => import('@/components/location-picker-map'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-[var(--color-tissue)] flex items-center justify-center text-tech-label text-[var(--color-graphite)] border hairline-border">
      INITIALIZING MAP GRID...
    </div>
  ),
})

const ACCEPTED = '.jpg,.jpeg,.png,.webp,.mp4'
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

async function extractClientExifGps(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer()
    const view = new DataView(buffer)
    if (view.byteLength < 16 || view.getUint16(0, false) !== 0xffd8) return null
    let offset = 2
    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false)
      if (marker === 0xffe1) {
        const length = view.getUint16(offset + 2, false)
        const exifStart = offset + 4
        if (
          offset + length <= view.byteLength &&
          view.getUint32(exifStart, false) === 0x45786966 &&
          view.getUint16(exifStart + 4, false) === 0x0000
        ) {
          const tiffStart = exifStart + 6
          const isLittleEndian = view.getUint16(tiffStart, false) === 0x4949
          const getUint16 = (idx: number) => view.getUint16(idx, isLittleEndian)
          const getUint32 = (idx: number) => view.getUint32(idx, isLittleEndian)
          const firstIfdOffset = getUint32(tiffStart + 4)
          const ifdPtr = tiffStart + firstIfdOffset
          if (ifdPtr + 2 > view.byteLength) break
          const entries = getUint16(ifdPtr)
          let gpsIfdOffset = 0
          for (let i = 0; i < entries; i++) {
            const entryPtr = ifdPtr + 2 + i * 12
            if (entryPtr + 12 > view.byteLength) break
            if (getUint16(entryPtr) === 0x8825) {
              gpsIfdOffset = getUint32(entryPtr + 8)
              break
            }
          }
          if (gpsIfdOffset && tiffStart + gpsIfdOffset + 2 <= view.byteLength) {
            const gpsPtr = tiffStart + gpsIfdOffset
            const gpsEntries = getUint16(gpsPtr)
            let lat: number[] = [], latRef = 'N', lng: number[] = [], lngRef = 'E'
            for (let i = 0; i < gpsEntries; i++) {
              const tagPtr = gpsPtr + 2 + i * 12
              if (tagPtr + 12 > view.byteLength) break
              const tag = getUint16(tagPtr)
              const valOffset = tiffStart + getUint32(tagPtr + 8)
              if (tag === 1) latRef = String.fromCharCode(view.getUint8(tagPtr + 8))
              else if (tag === 2 && valOffset + 24 <= view.byteLength) {
                for (let k = 0; k < 3; k++) {
                  const num = getUint32(valOffset + k * 8)
                  const den = getUint32(valOffset + k * 8 + 4) || 1
                  lat.push(num / den)
                }
              } else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(tagPtr + 8))
              else if (tag === 4 && valOffset + 24 <= view.byteLength) {
                for (let k = 0; k < 3; k++) {
                  const num = getUint32(valOffset + k * 8)
                  const den = getUint32(valOffset + k * 8 + 4) || 1
                  lng.push(num / den)
                }
              }
            }
            if (lat.length === 3 && lng.length === 3) {
              let latitude = lat[0] + lat[1] / 60 + lat[2] / 3600
              if (latRef === 'S') latitude = -latitude
              let longitude = lng[0] + lng[1] / 60 + lng[2] / 3600
              if (lngRef === 'W') longitude = -longitude
              return { lat: latitude, lng: longitude }
            }
          }
        }
        offset += 2 + length
      } else if ((marker & 0xff00) === 0xff00) {
        offset += 2 + view.getUint16(offset + 2, false)
      } else {
        break
      }
    }
  } catch {}
  return null
}

type UploadedFile = {
  file: File
  preview: string
  isVideo: boolean
}

export default function DetectPage() {
  const router = useRouter()
  const { addToast } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [createdComplaint, setCreatedComplaint] = useState<any | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [description, setDescription] = useState('')
  const [locality, setLocality] = useState('Location not set')
  const [city, setCity] = useState('Mysuru')
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationSource, setLocationSource] = useState<'BROWSER_GPS' | 'EXIF_GPS' | 'MANUAL'>('MANUAL')
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number; locality: string } | null>(null)
  const [exifLocation, setExifLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationMismatch, setLocationMismatch] = useState(false)
  const [mismatchDistance, setMismatchDistance] = useState(0)

  const [showPicker, setShowPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearchLocation = async (query: string) => {
    if (!query || query.trim().length < 2) return
    setSearching(true)
    setHasSearched(false)
    try {
      const results = await searchMysuruLocations(query)
      setSearchResults(results)
    } catch (err) {
      console.error('Location search failed:', err)
      setSearchResults([])
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  const selectSearchResult = (item: LocationSearchResult) => {
    const lat = item.lat
    const lng = item.lng
    const cleanName = item.locality ? `${item.locality}, Mysuru` : `${item.display_name.split(',')[0].trim()}, Mysuru`
    setLocality(cleanName)
    setSelectedCoords({ lat, lng })
    setManualLocation({ lat, lng, locality: cleanName })
    setLocationSource('MANUAL')
    setSearchResults([])
    setSearchQuery('')
    setShowPicker(false)

    if (gpsLocation) {
      const dist = calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, lat, lng)
      if (dist > 500) {
        setLocationMismatch(true)
        setMismatchDistance(dist)
      } else {
        setLocationMismatch(false)
      }
    }
  }

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng })
    setLocationSource('MANUAL')

    try {
      const rev = await reverseGeocodeLocation(lat, lng)
      const cleanName = rev?.locality ? `${rev.locality}, Mysuru` : `Selected Point, Mysuru`
      setLocality(cleanName)
      setManualLocation({ lat, lng, locality: cleanName })
    } catch {
      const fallbackName = `Selected Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      setLocality(fallbackName)
      setManualLocation({ lat, lng, locality: fallbackName })
    }

    if (gpsLocation) {
      const dist = calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, lat, lng)
      if (dist > 500) {
        setLocationMismatch(true)
        setMismatchDistance(dist)
      } else {
        setLocationMismatch(false)
      }
    }
  }

  const requestGpsLocation = () => {
    console.log("[GPS] BUTTON CLICKED")
    if (!navigator.geolocation) {
      addToast({ title: 'GPS Unavailable', description: 'Browser does not support geolocation.', variant: 'warning' })
      return
    }
    setGettingLocation(true)
    console.log("[GPS] REQUESTING GEOLOCATION")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const gps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        console.log("[GPS] SUCCESS", pos.coords.latitude, pos.coords.longitude)
        setGpsLocation(gps)
        setGettingLocation(false)

        setSelectedCoords({ lat: gps.lat, lng: gps.lng })
        setLocationAccuracy(gps.accuracy)
        setLocationSource('BROWSER_GPS')
        setLocationMismatch(false)
        setShowPicker(false)

        try {
          const rev = await reverseGeocodeLocation(gps.lat, gps.lng)
          if (rev && rev.locality) {
            setLocality(`${rev.locality}, ${rev.city || 'Mysuru'}`)
          } else {
            setLocality(`GPS Point (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`)
          }
        } catch {
          setLocality(`GPS Point (${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`)
        }
      },
      (err) => {
        console.error("[GPS] ERROR", err.code, err.message)
        setGettingLocation(false)
        addToast({
          title: 'GPS Unavailable',
          description: 'Permission denied or timed out. Please manually select on map.',
          variant: 'warning',
        })
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  const useExifLocation = () => {
    if (!exifLocation) return
    setSelectedCoords({ lat: exifLocation.lat, lng: exifLocation.lng })
    setLocationSource('EXIF_GPS')
    setLocality('EXTRACTED FROM MEDIA METADATA')
    setShowPicker(false)
    setLocationMismatch(false)
  }

  const handleFile = useCallback((file: File) => {
    if (file.size > MAX_SIZE) {
      addToast({ title: 'File Too Large', description: 'Maximum file size is 50 MB', variant: 'error' })
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp', 'mp4'].includes(ext || '')) {
      addToast({ title: 'Unsupported Format', description: 'Supported: JPG, PNG, WEBP, MP4', variant: 'error' })
      return
    }
    const preview = URL.createObjectURL(file)
    const isVideo = ext === 'mp4'
    setUploaded({ file, preview, isVideo })
    setCreatedComplaint(null)
    setErrorMsg(null)

    if (!isVideo) {
      extractClientExifGps(file).then((gps) => {
        if (gps) {
          setExifLocation(gps)
        }
      }).catch(() => {})
    }
  }, [addToast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const clearUpload = () => {
    if (uploaded) URL.revokeObjectURL(uploaded.preview)
    setUploaded(null)
    setCreatedComplaint(null)
    setErrorMsg(null)
    setAnalyzing(false)
  }

  const handleSubmitComplaint = async () => {
    console.log("[AI] ANALYZE BUTTON CLICKED")
    if (!uploaded) return

    setAnalyzing(true)
    setErrorMsg(null)
    setCreatedComplaint(null)

    try {
      const formData = new FormData()
      formData.append('evidence', uploaded.file)
      formData.append('description', description)
      formData.append('locality', locality)
      formData.append('city', city)
      formData.append('state', 'Karnataka')
      if (selectedCoords) {
        formData.append('latitude', String(selectedCoords.lat))
        formData.append('longitude', String(selectedCoords.lng))
      }
      formData.append('locationSource', locationSource)
      if (locationAccuracy) {
        formData.append('locationAccuracy', String(locationAccuracy))
      }

      console.log("[AI] SENDING REQUEST")
      const res = await api.createComplaint(formData)
      console.log("[AI] RESPONSE", res ? "SUCCESS" : "NO_RES")
      const complaintData = res.data || res.complaint

      setCreatedComplaint(complaintData)
    } catch (err: any) {
      console.error("[AI] ERROR", err)
      const msg = err.message || 'Analysis failed.'
      setErrorMsg(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <AppShell eyebrow="CIVIC INTAKE">
      <div className="w-full pb-24 space-y-16">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b hairline-b border-b-0 pb-12">
          <div className="max-w-3xl">
            <h1 className="text-large-heading text-[var(--foreground)]">
              AI VISION<br />EVIDENCE INTAKE
            </h1>
          </div>
          <MagneticButton onClick={() => router.push('/citizen')}>
            <span className="border hairline-border bg-[var(--color-paper)] hover:bg-[var(--color-tissue)] text-[var(--foreground)] px-8 py-5 text-tech-label transition-colors inline-block">
              BACK TO CONSOLE
            </span>
          </MagneticButton>
        </div>

        {/* Results View */}
        {createdComplaint ? (
          <div className="space-y-12">
            <DepthPanel className="bg-[var(--color-abyssal)] p-10 border-l-[4px] border-[var(--color-biolime)]" zOffset={6}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                <div className="flex items-start gap-5">
                  <SignalDot className="mt-2" />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-tech-label text-[var(--color-biolime)]">INTAKE SUCCESSFUL</p>
                      <span className="bg-[var(--color-paper)] text-[var(--color-abyssal)] px-2 py-0.5 text-tech-label font-bold">
                        {createdComplaint.complaintNumber}
                      </span>
                    </div>
                    <p className="text-heading text-[var(--color-paper)]">
                      {createdComplaint.incidentType.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MagneticButton onClick={() => router.push(`/complaints/${createdComplaint.complaintNumber || createdComplaint._id}`)}>
                    <span className="bg-[var(--color-biolime)] text-[var(--color-abyssal)] text-tech-label font-bold px-6 py-4 block hover:bg-white transition-colors">
                      VIEW REPORT
                    </span>
                  </MagneticButton>
                  <MagneticButton onClick={clearUpload}>
                    <span className="border border-[var(--color-paper)] text-[var(--color-paper)] hover:bg-[var(--color-paper)] hover:text-[var(--color-abyssal)] text-tech-label px-6 py-4 block transition-colors">
                      SUBMIT NEW
                    </span>
                  </MagneticButton>
                </div>
              </div>

              {createdComplaint.duplicateStatus === 'POSSIBLE_DUPLICATE' && (
                <div className="mt-8 p-4 border border-amber-500/50 bg-amber-500/10 text-amber-200 text-tech-label flex items-start gap-3">
                  <AlertTriangle className="size-4 shrink-0" />
                  <div>
                    <span className="text-amber-400">POSSIBLE DUPLICATE:</span> A similar issue was already logged. Merging evidence into active cluster.
                  </div>
                </div>
              )}

              {createdComplaint.jurisdictionStatus === 'LOCATION_MISMATCH' && (
                <div className="mt-4 p-4 border border-rose-500/50 bg-rose-500/10 text-rose-200 text-tech-label flex items-start gap-3">
                  <AlertCircle className="size-4 shrink-0" />
                  <div>
                      <span className="text-tech-label text-[var(--color-graphite)] mr-2">MISMATCH:</span> EXIF coordinates deviated &gt;500m from selected point. Administrative review required.
                  </div>
                </div>
              )}
            </DepthPanel>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <div className="flex items-center justify-between">
                  <span className="text-tech-label text-[var(--color-graphite)]">EVIDENCE CACHE</span>
                  <span className="bg-[var(--color-abyssal)] text-[var(--color-biolime)] text-tech-label px-2 py-1">
                    {createdComplaint.confidence}% CONFIDENCE
                  </span>
                </div>
                
                <EvidenceStack 
                  src={normalizeImagePath(createdComplaint.evidence)} 
                  className="aspect-[4/3] w-full"
                />

                <SpatialCard className="p-8">
                  <h3 className="text-tech-label text-[var(--color-graphite)] mb-4 pb-4 border-b hairline-b border-b-0">
                    AI VISION REASONING
                  </h3>
                  <p className="text-body text-[var(--foreground)] bg-[var(--color-tissue)] p-6">
                    {createdComplaint.reasoning || createdComplaint.description}
                  </p>
                  
                  {createdComplaint.detectedObjects && createdComplaint.detectedObjects.length > 0 && (
                    <div className="mt-6 pt-6 border-t hairline-b border-b-0">
                      <p className="text-tech-label text-[var(--color-graphite)] mb-4">DETECTED ENTITIES</p>
                      <div className="flex flex-wrap gap-2">
                        {createdComplaint.detectedObjects.map((obj: any, idx: number) => (
                          <span key={idx} className="border hairline-border bg-[var(--color-paper)] text-tech-label px-3 py-1">
                            {obj.label} ({obj.confidence}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </SpatialCard>
              </div>

              <div className="lg:col-span-5">
                <SpatialCard className="p-8 sticky top-8">
                  <h3 className="text-tech-label text-[var(--color-graphite)] mb-6 pb-4 border-b hairline-b border-b-0">
                    METADATA EXTRACT
                  </h3>
                  <div className="space-y-6 text-tech-label">
                    <div className="flex justify-between items-center pb-4 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-[var(--color-graphite)]">STATUS</span>
                      <span className="text-[var(--foreground)] bg-[var(--color-tissue)] px-2 py-1">{createdComplaint.status}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-[var(--color-graphite)]">SEVERITY</span>
                      <span className="text-[var(--foreground)]">{createdComplaint.severity}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-[var(--color-graphite)]">LOCATION</span>
                      <span className="text-[var(--foreground)] text-right max-w-[200px] truncate">{createdComplaint.locality}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-[var(--color-graphite)]">COORDINATES</span>
                      <span className="text-[var(--foreground)] font-mono">{formatCoordsText(createdComplaint.latitude, createdComplaint.longitude)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b hairline-b border-[var(--color-tissue)] border-b-0">
                      <span className="text-[var(--color-graphite)]">LOC SOURCE</span>
                      <span className="text-[var(--foreground)]">{createdComplaint.locationSource}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-graphite)]">ROUTING</span>
                      <span className="text-[var(--foreground)]">{createdComplaint.assignedTo}</span>
                    </div>
                  </div>
                </SpatialCard>
              </div>
            </div>
          </div>
        ) : (
          /* INTAKE FORM (Asymmetric Grid) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left: UPLOAD DROPZONE */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <span className="text-tech-label text-[var(--color-graphite)]">MEDIA CAPTURE</span>
              
              <div 
                className="relative min-h-[400px] w-full border hairline-border bg-[var(--color-tissue)] flex flex-col items-center justify-center p-8 transition-colors group"
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-[var(--color-paper)]') }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('bg-[var(--color-paper)]') }}
              >
                {uploaded ? (
                  <div className="w-full h-full space-y-6 flex flex-col">
                    <EvidenceStack src={uploaded.preview} className="flex-1 min-h-[300px] w-full" />
                    <div className="flex items-center justify-between border hairline-border bg-[var(--color-paper)] p-4">
                      <div className="flex items-center gap-4 text-tech-label text-[var(--foreground)]">
                        {uploaded.isVideo ? <Video className="size-4" /> : <ImageIcon className="size-4" />}
                        <span className="truncate max-w-[200px]">{uploaded.file.name}</span>
                        <span className="text-[var(--color-graphite)]">{(uploaded.file.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <MagneticButton onClick={clearUpload}>
                        <div className="p-2 text-[var(--color-graphite)] hover:text-red-500 transition-colors">
                          <Trash2 className="size-4" />
                        </div>
                      </MagneticButton>
                    </div>
                  </div>
                ) : (
                  <div className="text-center" onClick={() => fileRef.current?.click()}>
                    <div className="mx-auto flex size-20 items-center justify-center bg-[var(--color-paper)] border hairline-border text-[var(--foreground)] mb-6 cursor-pointer group-hover:bg-[var(--color-abyssal)] group-hover:text-[var(--color-biolime)] transition-colors">
                      <UploadCloud className="size-8" />
                    </div>
                    <h3 className="text-subheading text-[var(--foreground)] mb-2">INITIALIZE UPLOAD SEQUENCE</h3>
                    <p className="text-tech-label text-[var(--color-graphite)] mb-8">DRAG MEDIA HERE OR CLICK TO BROWSE</p>
                    <span className="text-tech-label text-[var(--color-graphite)] border hairline-border bg-[var(--color-paper)] px-4 py-2">
                      ACCEPTED: JPG / PNG / MP4
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFile(e.target.files[0])
                      }}
                    />
                  </div>
                )}
                
                {/* Thin scan line decoration */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-[var(--color-biolime)] opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
              </div>

              {errorMsg && (
                <div className="p-6 border hairline-border bg-red-500/10 text-red-600 text-tech-label flex items-start gap-4">
                  <AlertCircle className="size-4 shrink-0" />
                  <div>
                    <span className="font-bold">SYSTEM ERROR:</span> {errorMsg}
                  </div>
                </div>
              )}
            </div>

            {/* Right: METADATA & SUBMIT */}
            <div className="lg:col-span-5 flex flex-col gap-6 relative z-30">
              <span className="text-tech-label text-[var(--color-graphite)]">CONTEXT & LOCALIZATION</span>
              
              <SpatialCard className="p-8 h-full flex flex-col relative z-30">
                <div className="space-y-10 flex-1">
                  
                  {/* Notes */}
                  <div>
                    <label className="block text-tech-label text-[var(--foreground)] mb-4">
                      ADDITIONAL FIELD NOTES (OPTIONAL)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-[var(--color-tissue)] border hairline-border p-4 text-body font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--color-graphite)] transition-colors resize-none"
                      placeholder="Input context..."
                    />
                  </div>

                  {/* Location Engine */}
                  <div>
                    <label className="block text-tech-label text-[var(--foreground)] mb-4">
                      SPATIAL COORDINATES
                    </label>
                    
                    <div className="border hairline-border bg-[var(--color-paper)] p-6 space-y-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-tech-label text-[var(--color-graphite)]">CURRENT PIN</span>
                        <p className="text-body text-[var(--foreground)] flex items-start gap-3">
                          <MapPin className="size-5 shrink-0 text-[var(--color-graphite)] mt-0.5" />
                          <span>{locality}</span>
                        </p>
                        <p className="text-tech-label text-[var(--color-graphite)] font-mono pl-8">
                          {formatCoordsText(selectedCoords?.lat, selectedCoords?.lng)}
                        </p>
                      </div>

                      <div className="flex gap-4 border-t hairline-b border-b-0 pt-6">
                        <MagneticButton onClick={requestGpsLocation} disabled={gettingLocation}>
                          <span className={`text-tech-label px-4 py-3 block border hairline-border transition-colors ${gettingLocation ? 'opacity-50' : 'hover:bg-[var(--color-tissue)]'}`}>
                            {gettingLocation ? 'ACQUIRING...' : 'DEVICE GPS'}
                          </span>
                        </MagneticButton>
                        <MagneticButton onClick={() => setShowPicker(!showPicker)}>
                          <span className="text-tech-label px-4 py-3 block border hairline-border bg-[var(--color-abyssal)] text-[var(--color-paper)] hover:bg-black transition-colors">
                            {showPicker ? 'HIDE SEARCH' : 'SEARCH AREA'}
                          </span>
                        </MagneticButton>
                      </div>

                      {exifLocation && (
                        <div className="pt-2">
                           <MagneticButton onClick={useExifLocation}>
                            <span className="text-tech-label px-4 py-3 block border hairline-border bg-[var(--color-tissue)] text-[var(--foreground)] hover:bg-[var(--color-paper)] transition-colors w-full text-center">
                              USE MEDIA EXIF ({exifLocation.lat.toFixed(4)}, {exifLocation.lng.toFixed(4)})
                            </span>
                          </MagneticButton>
                        </div>
                      )}
                      
                      {showPicker && (
                        <div className="mt-4 space-y-4">
                          <div className="flex gap-3">
                            <input
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation(searchQuery)}
                              placeholder="Input locality..."
                              className="flex-1 bg-[var(--color-tissue)] border hairline-border p-3 text-tech-label focus:outline-none"
                            />
                            <button
                              onClick={() => handleSearchLocation(searchQuery)}
                              disabled={searching}
                              className="bg-[var(--color-abyssal)] text-[var(--color-paper)] px-4 text-tech-label"
                            >
                              GO
                            </button>
                          </div>
                          {searchResults.length > 0 ? (
                            <div className="border hairline-border max-h-[200px] overflow-y-auto bg-[var(--color-tissue)] divide-y divide-[var(--color-graphite)]/20">
                              {searchResults.map((item, idx) => (
                                <div key={idx} onClick={() => selectSearchResult(item)} className="p-3 hover:bg-[var(--color-paper)] cursor-pointer text-tech-label">
                                  <p className="text-[var(--foreground)]">{item.locality || item.display_name.split(',')[0]}</p>
                                  <p className="text-[var(--color-graphite)] truncate mt-1">{item.display_name}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            hasSearched && !searching && (
                              <div className="border hairline-border bg-[var(--color-tissue)] p-4 text-tech-label text-[var(--color-graphite)]">
                                No matching location found in Mysuru
                              </div>
                            )
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        <LocationPickerMap
                          selectedCoords={selectedCoords}
                          onLocationSelect={handleMapLocationSelect}
                          height="320px"
                        />
                      </div>

                    </div>

                    {locationMismatch && gpsLocation && selectedCoords && (
                      <div className="mt-4 p-4 border border-amber-500/30 bg-amber-500/10 space-y-4">
                         <div className="flex items-center gap-3 text-tech-label text-amber-600">
                          <AlertTriangle className="size-4 shrink-0" />
                          <span>GPS DEVIATION DETECTED</span>
                        </div>
                        <div className="text-tech-label text-[var(--foreground)] grid gap-2 opacity-80">
                           <p>Device: {formatCoordsText(gpsLocation.lat, gpsLocation.lng)}</p>
                           <p>Pin: {formatCoordsText(selectedCoords.lat, selectedCoords.lng)}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                           <button onClick={() => setLocationMismatch(false)} className="text-tech-label border border-amber-600 px-3 py-2 text-amber-600 hover:bg-amber-600/10">KEEP PIN</button>
                           <button onClick={() => {
                               setSelectedCoords({ lat: gpsLocation.lat, lng: gpsLocation.lng })
                               setLocationAccuracy(gpsLocation.accuracy)
                               setLocationSource('BROWSER_GPS')
                               setLocationMismatch(false)
                               reverseGeocodeLocation(gpsLocation.lat, gpsLocation.lng).then(rev => {
                                 if (rev?.locality) setLocality(`${rev.locality}, ${rev.city || 'Mysuru'}`)
                               }).catch(() => {})
                            }} className="text-tech-label bg-amber-600 px-3 py-2 text-[var(--color-paper)]">USE GPS</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="mt-12 pt-6 border-t hairline-b border-b-0">
                  <MagneticButton onClick={handleSubmitComplaint} disabled={!uploaded || analyzing}>
                    <span className={`w-full text-center text-tech-label font-bold px-6 py-5 block transition-colors ${
                      (!uploaded || analyzing) 
                        ? 'bg-[var(--color-tissue)] text-[var(--color-graphite)] cursor-not-allowed'
                        : 'bg-[var(--color-abyssal)] text-[var(--color-paper)] hover:bg-black cursor-pointer'
                    }`}>
                      {analyzing ? 'PROCESSING TRANSMISSION...' : 'TRANSMIT REPORT TO SYSTEM'}
                    </span>
                  </MagneticButton>
                </div>
              </SpatialCard>
            </div>
            
          </div>
        )}
        
        <ComplianceDisclaimer />
      </div>
    </AppShell>
  )
}
