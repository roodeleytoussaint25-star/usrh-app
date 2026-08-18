import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0)
  const raf = useRef<number | null>(null)
  const start = useRef<number | null>(null)
  const from = useRef(0)

  useEffect(() => {
    from.current = value
    start.current = null
    if (raf.current) cancelAnimationFrame(raf.current)

    const step = (ts: number) => {
      if (!start.current) start.current = ts
      const elapsed = ts - start.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from.current + (target - from.current) * eased))
      if (progress < 1) raf.current = requestAnimationFrame(step)
    }

    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return value
}
