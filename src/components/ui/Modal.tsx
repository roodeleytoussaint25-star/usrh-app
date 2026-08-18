import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-modal-up">
      {/* Header sticky */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 bg-white flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
        >
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Contenu scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        onFocus={e => (e.target as HTMLElement).scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })}
      >
        {children}
      </div>
    </div>
  )
}
