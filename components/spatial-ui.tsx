'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cx } from '@/lib/store'
import { usePathname } from 'next/navigation'

/* ── 1. SpatialCard ────────────────────────────────────────────────────────
   Premium card surface. Subtle lift on hover. NO 3D tilt (avoids pointer
   event and z-index conflicts with nested interactive elements like Leaflet).
*/
export function SpatialCard({
  children,
  className,
  onClick,
  href,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  href?: string
}) {
  const isInteractive = !!(onClick || href)

  const style = {
    transition: 'box-shadow 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
  }

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={cx(
          'bento-card',
          isInteractive && 'hover:-translate-y-[2px] hover:shadow-sm',
          className
        )}
        style={style}
      >
        {children}
      </a>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cx(
        'bento-card',
        isInteractive && 'cursor-pointer hover:-translate-y-[2px] hover:shadow-sm',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}

/* ── 2. DepthPanel ────────────────────────────────────────────────────────
   Simple elevated panel — NO 3D transforms to avoid Leaflet z-index issues.
   Uses box-shadow for depth effect instead.
*/
export function DepthPanel({
  children,
  className,
  zOffset = 4,
}: {
  children: React.ReactNode
  className?: string
  zOffset?: number
}) {
  const shadow = `0 ${zOffset}px ${zOffset * 4}px rgba(0,0,0,0.06), 0 ${zOffset / 2}px ${zOffset}px rgba(0,0,0,0.04)`
  return (
    <div className={cx('relative bg-[var(--color-paper)] border border-[var(--color-lichen)]', className)} style={{ boxShadow: shadow }}>
      {children}
    </div>
  )
}

/* ── 3. MagneticButton ─────────────────────────────────────────────────────
   Functional button with subtle scale press. Reliable click on first press.
   Removed magnetic tracking that could interfere with event dispatch.
*/
export function MagneticButton({
  children,
  className,
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx('relative', className)}
      style={{
        transition: 'transform 0.15s ease, opacity 0.15s ease',
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'
        }
      }}
      onMouseUp={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
      }}
    >
      {children}
    </button>
  )
}

/* ── 4. SignalDot ──────────────────────────────────────────────────────────
   Subtle lime pulse indicator.
*/
export function SignalDot({ className }: { className?: string }) {
  return (
    <span className={cx('relative flex size-2 items-center justify-center shrink-0', className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-biolime)] opacity-75 animate-pulse-dot" />
      <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-biolime)]" />
    </span>
  )
}

/* ── 5. EvidenceStack ──────────────────────────────────────────────────────
   Evidence media viewer. Preserves original image color and aspect ratio.
   Uses object-contain to avoid distortion.
*/
export function EvidenceStack({
  src,
  className,
  fallback = 'NO EVIDENCE',
}: {
  src?: string
  className?: string
  fallback?: string
}) {
  const isVideo = src?.toLowerCase().match(/\.(mp4|webm|mov)$/)

  return (
    <div className={cx('relative bg-[var(--color-tissue)] border border-[var(--color-lichen)] overflow-hidden', className)}>
      {src ? (
        isVideo ? (
          <video
            src={src}
            controls
            className="w-full h-full object-contain"
            style={{ background: '#000' }}
          />
        ) : (
          <img
            src={src}
            alt="Evidence"
            className="w-full h-full object-contain"
            style={{ background: 'var(--color-tissue)' }}
            onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              const p = t.parentElement
              if (p) {
                p.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-graphite);">${fallback}</div>`
              }
            }}
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center text-tech-label text-[var(--color-graphite)]">
          {fallback}
        </div>
      )}
    </div>
  )
}

/* ── 6. PageTransition ─────────────────────────────────────────────────────
   Lightweight opacity fade — no z-axis transforms to avoid stacking issues.
*/
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
