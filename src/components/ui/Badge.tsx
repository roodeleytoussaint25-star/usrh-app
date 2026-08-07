type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#F0EBE0] text-[#78726A]',
  success: 'bg-green-100 text-green-700',
  danger:  'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-[#F59E0B]',
  info:    'bg-[#EEF7EE] text-[#2D6B2D]',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        font-[JetBrains_Mono,monospace] text-[11px] font-semibold tracking-wide
        px-2 py-0.5 rounded-full
        ${variantClasses[variant]} ${className}
      `}
    >
      {children}
    </span>
  )
}
