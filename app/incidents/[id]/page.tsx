'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Legacy compatibility redirect: /incidents/:id -> /complaints/:id
 * Maintains backwards compatibility with any existing external links while ensuring
 * single canonical complaint-detail implementation at /complaints/:id.
 */
export default function LegacyIncidentRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (id) {
      router.replace(`/complaints/${id}`)
    }
  }, [id, router])

  return (
    <div className="flex h-screen items-center justify-center text-xs text-slate-400 gap-2">
      <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
      <span>Redirecting to canonical complaint record...</span>
    </div>
  )
}
