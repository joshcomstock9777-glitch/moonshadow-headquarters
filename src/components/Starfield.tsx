import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  size: number
  alpha: number
  twinkle: number
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let stars: Star[] = []
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor((w * h) / 6000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 0.8 + 0.2,
        size: Math.random() * 1.4 + 0.2,
        alpha: Math.random() * 0.6 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const t = performance.now() / 1000
      for (const s of stars) {
        const tw = Math.sin(s.twinkle + t * (0.5 + s.z)) * 0.3 + 0.7
        const a = s.alpha * tw
        ctx.beginPath()
        ctx.fillStyle = `rgba(220, 224, 236, ${a})`
        ctx.arc(s.x, s.y, s.size * s.z, 0, Math.PI * 2)
        ctx.fill()
        s.y += 0.05 * s.z
        if (s.y > h + 2) {
          s.y = -2
          s.x = Math.random() * w
        }
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      aria-hidden="true"
    />
  )
}
