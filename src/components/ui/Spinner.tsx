interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 16, md: 24, lg: 36 }

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const s = sizeMap[size]
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin text-[#3DAA35] ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" strokeDashoffset="0" />
    </svg>
  )
}
