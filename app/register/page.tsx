'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Mail, Lock, User as UserIcon, UserPlus, Phone } from 'lucide-react'
import { getErrorMessage } from '@/lib/utils'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await api.register(formData)
      if (data.token) {
        localStorage.setItem('cleanmysuru-token', data.token)
      }
      router.push('/login?registered=true')
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to register citizen account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#f8fafc] text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white mb-4 shadow-md ring-2 ring-emerald-500/20">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-8 text-amber-300">
            <path d="M12 2L9 7H15L12 2Z" />
            <path d="M4 9C4 9 7 8 10 11L12 9L14 11C17 8 20 9 20 9C20 14 17 17 12 22C7 17 4 14 4 9Z" fillOpacity="0.85" />
            <circle cx="12" cy="13" r="2.2" fill="#ffffff" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Citizen Registration</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Create your verified citizen account for CleanMysuru AI
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-xs">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <Input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Gowda"
                  className="pl-10 h-10.5 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <Input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ramesh@example.com"
                  className="pl-10 h-10.5 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number (Optional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="pl-10 h-10.5 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
                <Input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="pl-10 h-10.5 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xs transition"
              >
                {loading ? (
                  <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="size-4 mr-2" />
                    Create Citizen Account
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-emerald-600 hover:text-emerald-700">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
