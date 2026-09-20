'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, AlertTriangle, ArrowLeft, Clock, CheckCheck } from 'lucide-react'
import { AppShell, SectionHeading } from '@/components/cleanmysuru-ui'
import { api } from '@/lib/api'
import { useStore } from '@/lib/store'

export default function NotificationsPage() {
  const { user } = useStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await api.getNotifications()
      if (data) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error('Error marking as read', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all as read', err)
    }
  }

  const portalHref = user?.role === 'ADMIN' ? '/admin' : '/citizen'

  return (
    <AppShell eyebrow="Civic Notifications" title="System Alerts & Updates">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href={portalHref}
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition mb-2"
            >
              <ArrowLeft className="size-3.5" /> Return to {user?.role === 'ADMIN' ? 'Admin Portal' : 'Citizen Portal'}
            </Link>
            <h2 className="text-xl font-bold text-slate-900">Notifications & Alerts</h2>
            <p className="text-sm text-slate-500">
              Real-time civic status changes, cleaning completions, and verification notices.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <CheckCheck className="size-4 text-emerald-600" /> Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            <div className="size-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mr-3" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Bell className="size-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">No notifications yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              You will receive updates here whenever a complaint status changes or actions are taken by the city.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const isUnread = !item.read
              return (
                <div
                  key={item._id || item.id}
                  className={`relative flex items-start gap-4 p-5 rounded-2xl border transition-all ${
                    isUnread
                      ? 'border-emerald-200 bg-emerald-50/40 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                      item.type === 'CONFIRMATION_REQUIRED' || item.type === 'COMPLAINT_ACCEPTED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.type === 'COMPLAINT_REJECTED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {item.type === 'COMPLAINT_REJECTED' ? (
                      <AlertTriangle className="size-5" />
                    ) : item.type === 'CONFIRMATION_REQUIRED' ? (
                      <CheckCircle2 className="size-5" />
                    ) : (
                      <Bell className="size-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      {isUnread && (
                        <span className="size-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.message}</p>
                    
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.complaintId && (
                        <Link
                          href={`/incidents/${item.complaintId}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          View Complaint Details →
                        </Link>
                      )}
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      onClick={() => handleMarkAsRead(item._id || item.id)}
                      className="shrink-0 text-xs font-semibold text-slate-400 hover:text-emerald-700 p-1"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
