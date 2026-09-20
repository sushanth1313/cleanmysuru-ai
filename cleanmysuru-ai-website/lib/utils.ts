import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback = 'An unexpected error occurred.'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const err = error as Record<string, any>
    if (err.error && typeof err.error === 'object') {
      return getErrorMessage(err.error, fallback)
    }
    if (typeof err.message === 'string' && err.message) {
      return err.message
    }
    if (typeof err.code === 'string' && err.code) {
      return err.code
    }
    if (typeof err.error === 'string' && err.error) {
      return err.error
    }
    try {
      return JSON.stringify(err)
    } catch {
      return fallback
    }
  }
  return String(error)
}

/**
 * Robust Location Formatter
 * Handles GeoJSON { type: "Point", coordinates: [longitude, latitude] },
 * objects with lat/lng, strings, and missing coordinates.
 * GeoJSON coordinate index 0 is LONGITUDE, index 1 is LATITUDE.
 */
export interface LocationInfo {
  name: string
  coordsText: string
  lat?: number
  lng?: number
  fullDisplay: string
}

export function parseLocation(location: any, locality?: string): LocationInfo {
  let lat: number | undefined
  let lng: number | undefined
  let locName = typeof locality === 'string' && locality.trim() ? locality.trim() : ''

  if (location && typeof location === 'object') {
    // GeoJSON Point: coordinates is [longitude, latitude]
    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      const c0 = Number(location.coordinates[0])
      const c1 = Number(location.coordinates[1])
      if (!isNaN(c0) && !isNaN(c1)) {
        lng = c0
        lat = c1
      }
    } else if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      lat = location.latitude
      lng = location.longitude
    } else if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      lat = location.lat
      lng = location.lng
    }

    if (!locName) {
      if (typeof location.locality === 'string' && location.locality.trim()) {
        locName = location.locality.trim()
      } else if (typeof location.address === 'string' && location.address.trim()) {
        locName = location.address.trim()
      } else if (typeof location.city === 'string' && location.city.trim()) {
        locName = location.city.trim()
      }
    }
  } else if (typeof location === 'string' && location.trim()) {
    if (!locName) {
      locName = location.trim()
    }
  }

  const hasCoords = lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
  const coordsText = hasCoords ? `${lat!.toFixed(4)}, ${lng!.toFixed(4)}` : ''
  const finalName = locName || 'Mysuru'

  const fullDisplay = coordsText && finalName !== coordsText
    ? `${finalName} (${coordsText})`
    : coordsText || finalName

  return {
    name: finalName,
    coordsText,
    lat,
    lng,
    fullDisplay,
  }
}

export function formatLocationString(location: any, locality?: string): string {
  const parsed = parseLocation(location, locality)
  return parsed.fullDisplay
}

export function formatCoordinates(location: any, locality?: string): string {
  const parsed = parseLocation(location, locality)
  if (parsed.lat !== undefined && parsed.lng !== undefined && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
    return `Latitude: ${parsed.lat.toFixed(5)}, Longitude: ${parsed.lng.toFixed(5)}`
  }
  return 'Location unavailable'
}

