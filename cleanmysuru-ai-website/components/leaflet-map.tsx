'use client'

import { useEffect, useRef } from 'react'
import type { Incident } from '@/lib/store'
import { parseLocation } from '@/lib/utils'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const MYSURU_CENTER: [number, number] = [12.3051, 76.6551]

const severityColors: Record<string, string> = {
  Critical: '#fb7185',
  High: '#fb923c',
  Medium: '#fbbf24',
  Low: '#34d399',
}

export default function LeafletMap({ incidents }: { incidents: Incident[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)

  // Initialize map once
  useEffect(() => {
    console.log("[MAP] COMPONENT MOUNT")
    console.log("[MAP] CONTAINER", containerRef.current)
    if (!containerRef.current || mapRef.current) return
    let mounted = true
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    let resizeObserver: ResizeObserver | null = null
    let map: L.Map | null = null

    try {
      console.log("[MAP] INITIALIZING LEAFLET")
      map = L.map(containerRef.current, {
        center: MYSURU_CENTER,
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        zoomControl: true,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)
      markersRef.current = L.layerGroup().addTo(map)
      mapRef.current = map

      console.log("[MAP] MAP CREATED")
      console.log("[MAP] MAP SIZE", containerRef.current?.clientWidth, containerRef.current?.clientHeight)

      // Force resize after mount
      resizeTimer = setTimeout(() => {
        if (mounted && map && containerRef.current) {
          map.invalidateSize()
        }
      }, 100)

      resizeObserver = new ResizeObserver(() => {
        if (mounted && map && containerRef.current) {
          map.invalidateSize()
        }
      })
      resizeObserver.observe(containerRef.current)
    } catch (e) {
      console.error("Leaflet initialization error:", e)
    }

    return () => {
      mounted = false
      if (resizeTimer) clearTimeout(resizeTimer)
      if (resizeObserver) resizeObserver.disconnect()
      if (map) {
        map.remove()
      }
      map = null
      mapRef.current = null
    }
  }, [])

  // Update markers when incidents change
  useEffect(() => {
    if (!markersRef.current) return
    markersRef.current.clearLayers()

    incidents.forEach((incident) => {
      const parsedLoc = parseLocation(incident.location, incident.locality)
      const lat = parsedLoc.lat ?? 12.3051
      const lng = parsedLoc.lng ?? 76.6551
      if (isNaN(lat) || isNaN(lng)) return

      const color = severityColors[incident.severity] || '#34d399'
      const marker = L.circleMarker([lat, lng], {
        radius: incident.severity === 'Critical' ? 10 : incident.severity === 'High' ? 8 : 6,
        fillColor: color,
        fillOpacity: 0.85,
        color: '#ffffff',
        weight: 2,
        className: 'shadow-sm drop-shadow-sm',
      })

      marker.bindPopup(`
        <div style="font-family: 'Roboto Mono', monospace; min-width: 220px; color: var(--color-graphite); background: var(--color-paper); padding: 16px; border: 1px solid var(--border); text-transform: uppercase;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:var(--foreground);font-weight:700;">${incident.id}</span>
            <span style="font-size:9px;background:var(--color-abyssal);color:var(--color-biolime);padding:2px 6px;font-weight:700;">ACTIVE</span>
          </div>
          <p style="margin:12px 0 0;font-size:14px;font-weight:700;color:var(--foreground);">${incident.type}</p>
          <p style="margin:4px 0 0;font-size:11px;">${parsedLoc.fullDisplay}</p>
          <div style="margin-top:12px;display:flex;gap:8px;font-size:10px;font-weight:600;padding-top:12px;border-top:1px solid var(--border);">
            <span>${incident.confidence}% CONF</span>
            <span>·</span>
            <span style="color:${color};">${incident.severity}</span>
          </div>
          <div style="margin-top:6px;font-size:10px;">
            ${incident.status}
          </div>
          <a href="/complaints/${incident.id}" style="display:block;margin-top:16px;text-align:center;padding:10px 0;background:var(--color-abyssal);color:var(--color-paper);text-decoration:none;font-size:11px;font-weight:700;transition:all 0.2s;border:1px solid var(--color-abyssal);">VIEW DETAILS</a>
        </div>
      `, {
        className: 'leaflet-light-popup',
        maxWidth: 250,
      })

      marker.addTo(markersRef.current!)
    })
  }, [incidents])

  return (
    <>
      <style>{`
        .leaflet-light-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .leaflet-light-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-light-popup .leaflet-popup-tip {
          background: #ffffff !important;
        }
      `}</style>
      {/* The parent must have position:relative and explicit height — provided by map/page.tsx */}
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
    </>
  )
}
