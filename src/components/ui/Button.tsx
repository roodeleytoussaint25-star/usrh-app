import React from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<string, string> = {
  primary:   'bg-[#3DAA35] text-[#2D6B2D] font-bold hover:bg-[#2D8B2D] disabled:bg-[#8DC88D]',
  secondary: 'bg-[#F0EBE0] text-[#4A4540] hover:bg-[#E0D8CC] disabled:bg-[#FAF7F2]',
  danger:    'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  ghost:     'border border-[#3DAA35] text-[#2D6B2D] hover:bg-[#EEF7EE] disabled:opacity-50',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
