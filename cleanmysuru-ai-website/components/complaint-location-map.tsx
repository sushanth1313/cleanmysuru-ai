'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapPinOff } from 'lucide-react'

interface ComplaintLocationMapProps {
  coords?: [number, number] | null | undefined
  coordinates?: [number, number] | null | undefined
  locality?: string
  height?: string
}

export default function ComplaintLocationMap({
  coords,
  coordinates,
  locality = 'Mysuru',
  height = '240px',
}: ComplaintLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const effectiveCoords = coords || coordinates
  const hasValidCoords =
    Array.isArray(effectiveCoords) &&
    effectiveCoords.length >= 2 &&
    typeof effectiveCoords[0] === 'number' &&
    typeof effectiveCoords[1] === 'number' &&
    !isNaN(effectiveCoords[0]) &&
    !isNaN(effectiveCoords[1]) &&
    effectiveCoords[0] !== 0 &&
    effectiveCoords[1] !== 0

  useEffect(() => {
    if (!hasValidCoords || !containerRef.current || mapRef.current) return

    const lat = effectiveCoords![0]
    const lng = effectiveCoords![1]

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const customIcon = L.divIcon({
      className: 'complaint-location-pin',
      html: `<div style="
        background: #e11d48;
        width: 26px;
        height: 26px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #ffffff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    })

    L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(`<strong>${locality}</strong><br><span style="font-size:11px;color:#64748b;">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>`)
      .openPopup()

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 150)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [hasValidCoords, coords, locality])

  if (!hasValidCoords) {
    return (
      <div
        className="w-full border hairline-border bg-[var(--color-tissue)] flex flex-col items-center justify-center p-6 text-[var(--color-graphite)] gap-2"
        style={{ height }}
      >
        <MapPinOff className="size-6" />
        <span className="text-tech-label text-[var(--foreground)]">EXACT LOCATION UNAVAILABLE</span>
        <span className="text-tech-label font-mono">STORED LOCATION: {locality}</span>
      </div>
    )
  }

  return (
    <div className="relative w-full border hairline-border bg-[var(--color-tissue)]" style={{ height }}>
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  )
}
