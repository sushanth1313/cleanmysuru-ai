'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStore, saveUser, type User } from '@/lib/store'
import { getErrorMessage } from '@/lib/utils'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { DepthPanel, MagneticButton, SignalDot } from '@/components/spatial-ui'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useStore()
  const [activeTab, setActiveTab] = useState<'CITIZEN' | 'ADMIN'>('CITIZEN')
  
  // Empty default credentials as requested
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Mouse tracking for subtle 2.5D depth
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springConfig = { damping: 40, stiffness: 30, mass: 2 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const mapLayerX = useTransform(smoothX, [-0.5, 0.5], [10, -10])
  const mapLayerY = useTransform(smoothY, [-0.5, 0.5], [10, -10])
  
  const textLayerX = useTransform(smoothX, [-0.5, 0.5], [5, -5])
  const textLayerY = useTransform(smoothY, [-0.5, 0.5], [5, -5])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const { left, top, width, height } = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - left) / width - 0.5
      const y = (e.clientY - top) / height - 0.5
      mouseX.set(x)
      mouseY.set(y)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  // Login Logic (UNTOUCHED functionality)
  const handleTabChange = (role: 'CITIZEN' | 'ADMIN') => {
    setActiveTab(role)
    setError('')
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await api.login({ email, password })

      if (data.token) {
        localStorage.setItem('cleanmysuru-token', data.token)
      }

      let userObj = data.user || data.data
      try {
        const meData = await api.getMe()
        if (meData?.user || meData?.data) {
          userObj = meData.user || meData.data
        }
      } catch (meErr) {
        console.warn('Session check failed, using login payload', meErr)
      }

      if (userObj && (userObj.email || userObj.name)) {
        const cleanUser: User = {
          id: userObj.id || userObj._id,
          name: typeof userObj.name === 'string' ? userObj.name : 'Civic User',
          email: typeof userObj.email === 'string' ? userObj.email : email,
          role: userObj.role === 'ADMIN' ? 'ADMIN' : 'CITIZEN',
        }

        login(cleanUser)
        saveUser(cleanUser)

        if (cleanUser.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/citizen')
        }
      } else {
        setError('Authentication succeeded but user profile was empty.')
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to sign in. Please verify credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-bone)] text-[var(--foreground)] overflow-hidden font-sans">
      
      {/* ── LEFT: CIVIC INTELLIGENCE LAB (55-60%) ─────────────────── */}
      <div 
        ref={containerRef}
        className="hidden lg:flex flex-col justify-between w-[55%] relative overflow-hidden bg-[var(--color-abyssal)] perspective-view"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#1b2728] to-[#121c1d] z-0" />

        {/* 2.5D Map Layer */}
        <motion.div 
          className="absolute inset-0 z-0 opacity-40 flex items-center justify-center"
          style={{ x: mapLayerX, y: mapLayerY, scale: 1.1 }}
        >
          {/* Civic / Street Map Abstract Graphic */}
          <svg className="w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <g stroke="var(--color-lichen)" strokeWidth="0.1" fill="none">
              <path d="M0,20 L40,30 L60,10 L100,25" />
              <path d="M20,100 L30,60 L70,50 L80,0" />
              <path d="M0,60 L50,70 L90,100" />
              <path d="M40,30 L50,70" strokeWidth="0.2" stroke="var(--color-biolime)" strokeDasharray="1,1" />
            </g>
            <g fill="var(--color-biolime)">
              <circle cx="40" cy="30" r="0.8" />
              <circle cx="50" cy="70" r="0.8" />
              <circle cx="70" cy="50" r="0.8" />
            </g>
          </svg>
        </motion.div>

        {/* Dynamic Scan Line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-biolime)] to-transparent z-0 opacity-20"
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />

        {/* Editorial Typography Plane */}
        <motion.div 
          className="relative z-10 px-16 py-16 h-full flex flex-col justify-between preserve-3d"
          style={{ x: textLayerX, y: textLayerY }}
        >
          {/* Top Branding */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[28px] tracking-tight font-medium flex items-center gap-1.5 leading-tight text-[var(--color-paper)]">
                CLEAN<span className="font-light">MYSURU</span>
                <span className="font-light text-[var(--color-biolime)] ml-1">AI</span>
              </span>
            </div>
            <div className="mt-4 text-[13px] font-bold tracking-widest text-[var(--color-lichen)] uppercase flex items-center gap-3">
              Civic Intelligence Platform
              <span className="inline-block size-1.5 bg-[var(--color-biolime)] rounded-full animate-pulse" />
              Mysuru City
            </div>
          </div>

          {/* Core Messaging */}
          <div className="max-w-2xl my-auto">
            <h1 className="text-[52px] xl:text-[64px] 2xl:text-[72px] font-medium leading-[1.05] tracking-tight text-[var(--color-paper)] mb-8">
              DETECT CIVIC WASTE<br />
              <span className="text-[var(--color-lichen)] opacity-80">BEFORE SOMEONE HAS TO REPORT IT.</span>
            </h1>
            <p className="text-[18px] xl:text-[20px] text-[var(--color-lichen)] leading-relaxed max-w-xl">
              AI-powered civic intelligence that identifies, verifies, and helps resolve environmental issues across Mysuru.
            </p>
          </div>

          {/* Bottom Trust Markers */}
          <div className="flex items-center gap-12 pt-10 border-t border-[var(--color-graphite)]/50">
            <div>
              <div className="text-[12px] font-bold tracking-widest uppercase text-[var(--color-graphite)] mb-2">Platform Status</div>
              <div className="flex items-center gap-2 text-[14px] font-semibold text-[var(--color-biolime)]">
                <SignalDot /> SYSTEMS ONLINE
              </div>
            </div>
            <div>
              <div className="text-[12px] font-bold tracking-widest uppercase text-[var(--color-graphite)] mb-2">Engine</div>
              <div className="text-[14px] font-semibold text-[var(--color-paper)]">Gemini Spatial Analysis</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT: AUTHENTICATION PANEL (40-45%) ─────────────────────────────── */}
      <div className="flex-1 lg:w-[45%] flex flex-col justify-center items-center px-6 py-12 relative z-10 bg-[var(--color-bone)]">
        
        {/* Mobile Branding */}
        <div className="flex lg:hidden flex-col items-center gap-2 mb-12">
          <span className="text-[24px] tracking-tight font-medium text-[var(--foreground)]">
            CLEAN<span className="font-light">MYSURU</span>
            <span className="font-light text-[var(--color-graphite)] ml-1">AI</span>
          </span>
          <span className="text-[11px] font-bold tracking-widest text-[var(--color-graphite)] uppercase">
            Civic Intelligence Platform
          </span>
        </div>

        {/* Authentication Card */}
        <div className="w-full max-w-[500px] bg-[var(--color-paper)] border border-[var(--color-lichen)] p-10 sm:p-12 shadow-sm rounded-2xl relative">
          
          <div className="mb-10 text-center">
            <h2 className="text-[28px] sm:text-[32px] font-medium text-[var(--foreground)] mb-2 tracking-tight">
              Welcome to CleanMysuru
            </h2>
            <p className="text-[16px] text-[var(--color-graphite)]">
              Sign in to your civic intelligence account.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex p-1 bg-[var(--color-tissue)] border border-[var(--color-lichen)] rounded-xl mb-10">
            <button
              type="button"
              onClick={() => handleTabChange('CITIZEN')}
              className={`flex-1 flex items-center justify-center py-3.5 rounded-lg text-[14px] font-bold tracking-wide transition-all ${
                activeTab === 'CITIZEN'
                  ? 'bg-[var(--color-paper)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--color-graphite)] hover:text-[var(--foreground)]'
              }`}
            >
              CITIZEN
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('ADMIN')}
              className={`flex-1 flex items-center justify-center py-3.5 rounded-lg text-[14px] font-bold tracking-wide transition-all ${
                activeTab === 'ADMIN'
                  ? 'bg-[var(--color-abyssal)] text-[var(--color-biolime)] shadow-sm'
                  : 'text-[var(--color-graphite)] hover:text-[var(--foreground)]'
              }`}
            >
              ADMIN
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[14px] font-medium flex items-start gap-3">
                <div className="mt-0.5 size-4 rounded-full bg-red-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">!</div>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--color-graphite)] pl-1">
                {activeTab === 'ADMIN' ? 'Administrator Email' : 'Email Address'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-14 rounded-xl bg-[var(--color-paper)] border border-[var(--color-lichen)] text-[var(--foreground)] text-[16px] px-5 placeholder:text-[var(--color-lichen)] transition-all focus:border-[var(--color-abyssal)] focus:ring-1 focus:ring-[var(--color-abyssal)] outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-bold uppercase tracking-widest text-[var(--color-graphite)] pl-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-14 rounded-xl bg-[var(--color-paper)] border border-[var(--color-lichen)] text-[var(--foreground)] text-[16px] px-5 placeholder:text-[var(--color-lichen)] transition-all focus:border-[var(--color-abyssal)] focus:ring-1 focus:ring-[var(--color-abyssal)] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[56px] rounded-xl bg-[var(--color-abyssal)] text-[var(--color-biolime)] text-[16px] font-bold tracking-widest uppercase transition-colors hover:bg-black mt-8 flex items-center justify-center gap-3 disabled:opacity-70 shadow-md relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              {loading ? (
                <>
                  <div className="size-5 border-2 border-[var(--color-biolime)] border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>SIGN IN</>
              )}
            </button>
          </form>

          {activeTab === 'CITIZEN' && (
            <div className="mt-12 text-center border-t border-[var(--color-lichen)] pt-8">
              <p className="text-[14px] text-[var(--color-graphite)]">
                Don't have a citizen account?{' '}
                <Link href="/register" className="font-bold text-[var(--foreground)] hover:text-[var(--color-abyssal)] hover:underline transition-all">
                  Register here
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
