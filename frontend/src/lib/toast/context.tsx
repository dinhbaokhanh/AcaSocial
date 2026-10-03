'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import styles from './toast.module.css'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: ToastKind; title: string; detail?: string }
type ToastApi = { success: (title: string, detail?: string) => void; error: (title: string, detail?: string) => void; info: (title: string, detail?: string) => void }

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const sequence = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, title: string, detail?: string) => {
    const id = ++sequence.current
    setItems((current) => [...current.slice(-3), { id, kind, title, detail }])
    timers.current.set(id, setTimeout(() => dismiss(id), 4200))
  }, [dismiss])

  const value = useMemo<ToastApi>(() => ({
    success: (title, detail) => push('success', title, detail),
    error: (title, detail) => push('error', title, detail),
    info: (title, detail) => push('info', title, detail),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport} aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <div key={item.id} className={`${styles.toast} ${styles[item.kind]}`} role={item.kind === 'error' ? 'alert' : 'status'}>
            <span className={styles.mark} aria-hidden="true">{item.kind === 'success' ? '✓' : item.kind === 'error' ? '!' : 'i'}</span>
            <div className={styles.copy}>
              <strong>{item.title}</strong>
              {item.detail && <p>{item.detail}</p>}
            </div>
            <button type="button" className={styles.dismiss} onClick={() => dismiss(item.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
