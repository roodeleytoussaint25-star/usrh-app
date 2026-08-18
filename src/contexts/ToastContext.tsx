import React, { createContext, useContext, useState, useCallback } from 'react'

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info' }

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>(null!)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const colors = {
    success: 'bg-[#1B2A8A] border-green-500',
    error: 'bg-[#1B2A8A] border-[#A01020]',
    info: 'bg-[#1B2A8A] border-white/20',
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${colors[t.type]} border-l-4 text-white text-sm px-4 py-3 rounded-xl shadow-lg animate-fade-in max-w-xs`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
