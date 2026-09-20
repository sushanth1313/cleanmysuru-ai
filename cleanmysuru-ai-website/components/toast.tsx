'use client'

import { useStore, cx } from '@/lib/store'
import { getErrorMessage } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, AlertTriangle, X, Info } from 'lucide-react'

const icons = {
  success: Check,
  warning: AlertTriangle,
  error: X,
  info: Info,
}

const styles = {
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  error: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  info: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
}

export function ToastContainer() {
  const { toasts, removeToast } = useStore()
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.variant]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cx(
                'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-lg',
                styles[toast.variant],
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-[200px]">
                <p className="text-sm font-medium">{getErrorMessage(toast.title)}</p>
                {toast.description && (
                  <p className="mt-1 text-xs opacity-70">{getErrorMessage(toast.description)}</p>
                )}
              </div>
              <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-50 hover:opacity-100">
                <X className="size-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
