'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon, Bell, Monitor, Database, Settings as SettingsIcon, AlertTriangle, Check, Trash2, Beaker } from 'lucide-react'
import { AppShell, SectionHeading } from '@/components/cleanmysuru-ui'
import { useStore } from '@/lib/store'

export default function SettingsPage() {
  const router = useRouter()
  const { user, settings, updateSettings, logout, clearDemoData, addToast } = useStore()
  
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'analysis' | 'data'>('account')

  // Notification state
  const [notifs, setNotifs] = useState(settings.notifications)
  const [isDemoMode, setIsDemoMode] = useState(settings.isDemoMode)
  
  // UI states
  const [isSaving, setIsSaving] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const handleSaveNotifications = () => {
    setIsSaving(true)
    setTimeout(() => {
      updateSettings({ ...settings, notifications: notifs })
      setIsSaving(false)
      addToast({ title: 'Settings saved', description: 'Notification preferences updated.', variant: 'success' })
    }, 600)
  }

  const handleSaveAnalysis = () => {
    setIsSaving(true)
    setTimeout(() => {
      updateSettings({ ...settings, isDemoMode })
      setIsSaving(false)
      addToast({ title: 'Analysis settings saved', description: `Demo mode is now ${isDemoMode ? 'ON' : 'OFF'}.`, variant: 'info' })
    }, 600)
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cleanmysuru-token')
      localStorage.removeItem('cleanmysuru-user')
    }
    logout()
    router.push('/login')
  }

  const handleClearData = () => {
    clearDemoData()
    setShowClearConfirm(false)
    addToast({ title: 'Demo data cleared', description: 'All simulated demo incidents have been removed.', variant: 'success' })
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: <UserIcon className="size-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" /> },
    { id: 'analysis', label: 'AI Analysis', icon: <Beaker className="size-4" /> },
    { id: 'data', label: 'Data', icon: <Database className="size-4" /> },
  ] as const

  return (
    <AppShell eyebrow="System preferences" title="Settings">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          title="Settings"
          description="Manage your account, notification preferences, and system behavior."
        />

        <div className="mt-8 flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-6">Profile Information</h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{user?.name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</label>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{user?.email}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</label>
                      <p className="mt-1 inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                        {typeof user?.role === 'string' ? user.role.replace('_', ' ') : 'Citizen'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                      <LogOut className="size-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-2">Notification Preferences</h3>
                  <p className="text-xs font-medium text-slate-500 mb-6">
                    Configure which events trigger alerts. <br/>
                    <span className="text-amber-600 font-bold">Note: Notification delivery via SMS/Email is mocked in this MVP.</span>
                  </p>

                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifs.incidentDetected}
                        onChange={(e) => setNotifs({ ...notifs, incidentDetected: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Incident detected</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Alert when a new incident is created via live upload.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifs.highSeverity}
                        onChange={(e) => setNotifs({ ...notifs, highSeverity: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">High severity incident</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Alert immediately for High or Critical incidents.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifs.needsVerification}
                        onChange={(e) => setNotifs({ ...notifs, needsVerification: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Needs verification</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Alert when an incident requires human review (e.g. low confidence).</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notifs.locationMismatch}
                        onChange={(e) => setNotifs({ ...notifs, locationMismatch: e.target.checked })}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">Location mismatch</p>
                        <p className="text-xs font-medium text-slate-500 mt-0.5">Alert when reported coordinates conflict with evidence EXIF/GPS data.</p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      onClick={() => setNotifs(settings.notifications)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={handleSaveNotifications}
                      disabled={isSaving}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900">Live Analysis vs Demo Mode</h3>
                    {settings.isDemoMode && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Demo Active</span>}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-6">
                    Toggle how the application handles new uploads in the <b>Detect</b> tab.
                  </p>

                  <div className="space-y-5">
                    <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-emerald-500 bg-emerald-50">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="analysisMode"
                          checked={true}
                          readOnly
                          className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-900">LIVE ANALYSIS — Always Active</p>
                          <p className="text-xs font-medium text-slate-600 mt-1 max-w-sm">
                            All uploads are processed by the real Gemini Vision AI. Evidence is analyzed against the actual uploaded file. No simulated or demo data enters the live workflow.
                          </p>
                        </div>
                      </div>
                    </label>

                    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Demo mode is disabled in production</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          Demo scenarios are exclusively for developer testing via the backend <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">isDemo=true</code> flag.
                          They are never exposed in the Citizen or Admin workflow.
                        </p>
                      </div>
                    </div>
                  </div>

                  {user?.role !== 'ADMIN' && (
                    <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 border border-amber-200">
                      <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Admin Privileges Required</p>
                        <p className="text-xs font-medium text-amber-700 mt-0.5">You are viewing these settings, but only Administrators can save changes to global AI behavior.</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      onClick={handleSaveAnalysis}
                      disabled={isSaving || user?.role !== 'ADMIN'}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-2">Data Management</h3>
                  <p className="text-xs font-medium text-slate-500 mb-6">
                    Manage local application data and simulated incidents.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-100 bg-rose-50/50">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Clear Demo Data</p>
                      <p className="text-xs font-medium text-slate-600 mt-1 max-w-sm">
                        Removes all incidents flagged with <code>sourceType = 'DEMO'</code> from your local storage. This will NOT delete Live uploads.
                      </p>
                    </div>
                    
                    {!showClearConfirm ? (
                      <button 
                        onClick={() => setShowClearConfirm(true)}
                        className="shrink-0 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        Clear Demo Data
                      </button>
                    ) : (
                      <div className="shrink-0 flex items-center gap-2">
                        <button 
                          onClick={() => setShowClearConfirm(false)}
                          className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleClearData}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition"
                        >
                          <Trash2 className="size-3.5" /> Confirm Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
