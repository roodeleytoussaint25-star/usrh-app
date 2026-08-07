import { useState, useRef } from 'react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

export function Tooltip({ text, children, side = 'bottom', delay = 600 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setVisible(false)
  }

  const posClass = {
    top:    'bottom-full mb-1.5 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-1.5 left-1/2 -translate-x-1/2',
    left:   'right-full mr-1.5 top-1/2 -translate-y-1/2',
    right:  'left-full ml-1.5 top-1/2 -translate-y-1/2',
  }[side]

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={`absolute z-50 whitespace-nowrap bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded-md pointer-events-none ${posClass}`}>
          {text}
        </div>
      )}
    </div>
  )
}
