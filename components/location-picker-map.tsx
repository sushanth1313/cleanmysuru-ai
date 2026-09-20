'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationPickerMapProps {
  selectedCoords: { lat: number; lng: number } | null
  onLocationSelect: (lat: number, lng: number) => void
  height?: string
}

export default function LocationPickerMap({
  selectedCoords,
  onLocationSelect,
  height = '280px',
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Default fallback center: Mysuru Palace / City Center
  const defaultCenter: [number, number] = [12.3051, 76.6551]

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialCenter = selectedCoords
      ? [selectedCoords.lat, selectedCoords.lng] as [number, number]
      : defaultCenter

    let mounted = true
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    let resizeObserver: ResizeObserver | null = null
    let map: L.Map | null = null

    try {
      map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: selectedCoords ? 15 : 13,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Custom marker icon
      const customIcon = L.divIcon({
        className: 'custom-location-pin',
        html: `<div style="
          background: var(--color-biolime);
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 1px solid var(--color-abyssal);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: var(--color-abyssal);
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      })

      if (selectedCoords) {
        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map)

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationSelect(pos.lat, pos.lng)
        })

        markerRef.current = marker
      }

      // Map click to place/move marker
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng
        onLocationSelect(lat, lng)

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          if (!map) return
          const marker = L.marker([lat, lng], {
            icon: customIcon,
            draggable: true,
          }).addTo(map)

          marker.on('dragend', () => {
            const pos = marker.getLatLng()
            onLocationSelect(pos.lat, pos.lng)
          })

          markerRef.current = marker
        }
      })

      mapRef.current = map
      
      resizeTimer = setTimeout(() => {
        if (mounted && map && containerRef.current) {
          map.invalidateSize()
        }
      }, 150)

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
      markerRef.current = null
    }
  }, [])

  // Sync marker and pan when external selectedCoords change
  useEffect(() => {
    if (!mapRef.current) return
    if (selectedCoords && typeof selectedCoords.lat === 'number' && typeof selectedCoords.lng === 'number') {
      const { lat, lng } = selectedCoords
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        const customIcon = L.divIcon({
          className: 'custom-location-pin',
          html: `<div style="
            background: var(--color-biolime);
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 1px solid var(--color-abyssal);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background: var(--color-abyssal);
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        })

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(mapRef.current)

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          onLocationSelect(pos.lat, pos.lng)
        })

        markerRef.current = marker
      }
      mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15), { animate: true })
      setTimeout(() => mapRef.current?.invalidateSize(), 200)
    }
  }, [selectedCoords])

  return (
    <div className="relative w-full border hairline-border bg-[var(--color-tissue)]" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      <div className="absolute bottom-3 left-3 z-[400] bg-[var(--color-abyssal)] px-3 py-2 border hairline-border text-tech-label text-[var(--color-biolime)] flex items-center gap-2">
        <span className="size-1.5 bg-[var(--color-biolime)] animate-pulse" />
        CLICK MAP OR DRAG PIN TO FINE-TUNE SPOT
      </div>
    </div>
  )
}
