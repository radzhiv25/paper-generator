import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLogo } from '../AppLogo'
import { ThemeToggle } from '../ThemeToggle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 pb-2 md:px-6">
      <nav
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between rounded-2xl border px-3 py-2.5 transition-all duration-300 ease-out md:px-5 md:py-3',
          scrolled
            ? 'border-border/60 bg-background/80 shadow-[0_10px_40px_rgb(0_0_0_/_0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-background/70 dark:shadow-[0_10px_40px_rgb(0_0_0_/_0.45)]'
            : 'border-transparent bg-transparent shadow-none',
        )}
      >
        <Link to="/" className="min-w-0 shrink">
          <AppLogo size="md" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            to="/auth"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}
          >
            Sign in
          </Link>
          <Link to="/auth" className={cn(buttonVariants({ size: 'sm' }))}>
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
