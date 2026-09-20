'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileCheck2,
  HeartPulse,
  Landmark,
  Layers,
  Leaf,
  Lightbulb,
  LocateFixed,
  Mail,
  MapPin,
  Megaphone,
  Radio,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Zap
} from 'lucide-react'
import {
  CivicFooter,
  ComplianceDisclaimer,
  EvidenceViewer,
  Logo
} from '@/components/cleanmysuru-ui'
import { usePathname } from 'next/navigation'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* ── Top Navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md lg:px-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-3.5">
          <Logo />

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/" className="text-emerald-700 relative py-1">
              Home
              <span className="absolute bottom-0 left-0 w-full h-[2.5px] rounded-t-sm bg-emerald-600"></span>
            </Link>
            <Link href="/citizen" className="hover:text-emerald-700 transition-colors py-1">Citizen Portal</Link>
            <Link href="/admin" className="hover:text-emerald-700 transition-colors py-1">Admin Portal</Link>
            <Link href="/detect" className="hover:text-emerald-700 transition-colors py-1">Raise Complaint</Link>
            <Link href="/map" className="hover:text-emerald-700 transition-colors py-1">City Map</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Citizen Login
            </Link>
            <Link
              href="/login?role=ADMIN"
              className="inline-flex items-center justify-center rounded-full bg-[#091e42] hover:bg-slate-800 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-24">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f0fdf4] via-[#f8fafc] to-[#f8fafc] pointer-events-none" />
        
        {/* Right side Mysore Palace Photo */}
        <div className="absolute top-0 right-0 h-full w-1/2 hidden lg:block opacity-90">
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/80 to-transparent z-10" />
          <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-[#f8fafc] to-transparent z-10" />
          <img src="/mysore_palace_day.jpg" alt="Mysore Palace" className="w-full h-full object-cover object-left-top mask-image-linear-right" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }} />
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-20">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
                Report. Connect. <span className="text-emerald-600">Resolve.</span>
              </h1>
              
              <p className="mt-4 text-lg font-bold text-slate-700 sm:text-xl">
                AI-Powered Civic Waste Detection & Municipal Operations for a Better Mysuru
              </p>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 font-medium">
                Report government-related issues in Mysuru and let our AI identify the right department and responsible officer. Together, we can build a cleaner, safer and more developed Mysuru.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/detect"
                  className="flex items-center gap-2 rounded-full bg-[#16a34a] hover:bg-[#15803d] px-7 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <ScanLine className="size-4.5" />
                  Raise Complaint (Citizen)
                  <ArrowRight className="size-4 ml-1" />
                </Link>

                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-7 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all hover:shadow-md"
                >
                  <ShieldCheck className="size-4.5 text-sky-600" />
                  Admin Portal (Review &amp; Clean)
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative hidden lg:block">
              {/* Floating Cursive Script */}
              <div className="absolute -top-10 right-4 text-right transform rotate-[-2deg]">
                <p className="font-script text-4xl font-bold text-slate-800 drop-shadow-sm">
                  A Better Mysuru<br/>Starts with You
                </p>
                <svg className="w-32 h-4 text-emerald-500 ml-auto mt-1" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0,10 Q50,20 100,5" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Pills ──────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-700">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                <ScanLine className="size-4" />
              </span>
              AI-Powered Routing
            </div>
            <div className="hidden sm:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600">
                <ShieldCheck className="size-4" />
              </span>
              Verified Government Officers
            </div>
            <div className="hidden lg:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-purple-200 bg-purple-50 text-purple-600">
                <Mail className="size-4" />
              </span>
              Multi-channel Contact (Email/SMS)
            </div>
            <div className="hidden xl:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </span>
              Track Until Resolution
            </div>
            <div className="hidden xl:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                <TrendingUp className="size-4" />
              </span>
              Your Voice for a Better City
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Metrics ────────────────────────────────────────────── */}
      <section className="bg-[#f8fafc] pt-12 pb-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <FileCheck2 className="size-7" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">12,458</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">Complaints Registered</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="size-7" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">9,872</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">Resolved Issues</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <Users className="size-7" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">18</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">Government Sectors</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
              <div className="flex size-14 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
                <Sparkles className="size-7 fill-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">4.6/5</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">Citizen Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Civic Sectors Grid ─────────────────────────────────────── */}
      <section className="bg-[#f8fafc] py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Government Sectors</h2>
              <p className="mt-1 text-slate-600">Report issues across multiple government departments.</p>
            </div>
            <Link href="/detect" className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0">
              View all Sectors <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: Truck, title: 'Roads & Infrastructure', color: 'text-slate-600' },
              { icon: Trash2, title: 'Municipal Services & Sanitation', color: 'text-emerald-600' },
              { icon: Zap, title: 'Electricity & Street Lighting', color: 'text-amber-500' },
              { icon: Leaf, title: 'Environment & Pollution', color: 'text-green-600' },
              { icon: Stethoscope, title: 'Healthcare & Hospitals', color: 'text-blue-500' },
              { icon: Users, title: 'Women & Child Development', color: 'text-rose-500' },
              { icon: HeartPulse, title: 'Old Age Welfare', color: 'text-orange-500' },
              { icon: Landmark, title: 'School Education', color: 'text-red-500' },
              { icon: MapPin, title: 'Water Supply', color: 'text-sky-500' },
              { icon: Search, title: 'Transport', color: 'text-indigo-500' },
              { icon: Layers, title: 'Higher Education & Colleges', color: 'text-purple-600' },
              { icon: ScanLine, title: 'More Sectors', color: 'text-sky-600' },
            ].map((sector) => (
              <div key={sector.title} className="flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group">
                <sector.icon className={`size-10 ${sector.color} group-hover:scale-110 transition-transform duration-300`} />
                <h3 className="mt-4 text-sm font-bold text-slate-800 leading-snug">{sector.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="bg-[#f8fafc] py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">How It Works</h2>
            <p className="mt-1 text-slate-600">A simple process to get your issue resolved.</p>
          </div>

          <div className="mt-12 flex flex-col md:flex-row items-start justify-between gap-6 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-6 left-12 right-12 h-0.5 bg-slate-200 border-dashed z-0" />
            
            {[
              { num: 1, color: 'bg-sky-600', icon: FileCheck2, title: 'Submit Complaint', desc: 'Describe your issue, add location and upload photos (if any).' },
              { num: 2, color: 'bg-emerald-500', icon: ScanLine, title: 'AI Analysis', desc: 'Our AI identifies the relevant department and officer.' },
              { num: 3, color: 'bg-orange-500', icon: Megaphone, title: 'Notify Officer', desc: 'We send the complaint via email or SMS to the concerned officer.' },
              { num: 4, color: 'bg-purple-600', icon: TrendingUp, title: 'Track Progress', desc: 'Monitor the status until it is resolved.' },
              { num: 5, color: 'bg-emerald-600', icon: CheckCircle2, title: 'Get Resolution', desc: 'Provide feedback and help us build a better Mysuru.' },
            ].map((step, idx) => (
              <div key={step.num} className="flex flex-col items-center text-center relative z-10 w-full md:flex-1">
                <div className="flex items-center gap-4 md:flex-col">
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${step.color} text-white shadow-md font-bold text-lg ring-4 ring-[#f8fafc]`}>
                    {step.num}
                  </div>
                  <div className="hidden md:flex mt-4 size-14 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-700">
                    <step.icon className="size-6" />
                  </div>
                  <div className="md:mt-4 text-left md:text-center">
                    <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Banner CTA ─────────────────────────────────────────────── */}
      <section className="py-12 px-6 lg:px-10">
        <div className="mx-auto max-w-7xl relative overflow-hidden rounded-3xl bg-[#0b192c] text-white shadow-lg border border-slate-800">
          <div className="absolute inset-0">
            <img src="/mysore_city_panorama.jpg" alt="Mysore City" className="w-full h-full object-cover opacity-30 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/95 via-[#0f172a]/80 to-transparent" />
          </div>
          <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                Be the Change for a Better Mysuru
              </h2>
              <p className="mt-4 text-slate-300 font-medium md:text-lg drop-shadow-sm">
                Your complaints help improve public services and create a cleaner, safer and more developed city for everyone.
              </p>
            </div>
            <Link
              href="/detect"
              className="shrink-0 flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] px-8 py-4 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <Megaphone className="size-5" />
              Register a Complaint →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <CivicFooter />
    </div>
  )
}
