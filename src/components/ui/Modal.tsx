import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl w-full max-w-lg"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Poignée visuelle mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#D4CAB8] rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-[#E8E0D0] sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-[#1A1210]">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F0EBE0] hover:bg-[#E8E0D0] transition-colors"
          >
            <X size={16} className="text-[#78726A]" />
          </button>
        </div>
        <div className="px-5 py-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
