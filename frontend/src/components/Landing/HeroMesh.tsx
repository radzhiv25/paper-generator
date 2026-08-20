import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function HeroMesh() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const orbs = root.querySelectorAll<HTMLElement>('.hero-orb')
    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          x: i % 2 === 0 ? 40 : -50,
          y: i % 2 === 0 ? 28 : -36,
          scale: 1.08 + i * 0.04,
          duration: 7 + i * 1.4,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: i * 0.35,
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-orb absolute -top-24 left-1/4 size-[28rem] rounded-full bg-[radial-gradient(circle,rgb(124_58_237_/_0.35),transparent_68%)] blur-2xl" />
      <div className="hero-orb absolute top-20 right-0 size-[22rem] rounded-full bg-[radial-gradient(circle,rgb(59_130_246_/_0.28),transparent_70%)] blur-2xl" />
      <div className="hero-orb absolute bottom-0 left-10 size-[18rem] rounded-full bg-[radial-gradient(circle,rgb(244_114_182_/_0.22),transparent_70%)] blur-2xl" />
    </div>
  )
}
