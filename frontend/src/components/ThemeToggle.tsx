import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '../state/ThemeContext'

interface ThemeToggleProps {
  className?: string
}

const iconTransition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1] as const,
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative size-8 shrink-0 overflow-hidden rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: -80, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 80, scale: 0.35, opacity: 0 }}
            transition={iconTransition}
          >
            <Moon className="size-4" strokeWidth={1.75} />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 80, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -80, scale: 0.35, opacity: 0 }}
            transition={iconTransition}
          >
            <Sun className="size-4" strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
