import { PencilRuler } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  inverted?: boolean
  showTagline?: boolean
  className?: string
}

export function AppLogo({
  size = 'md',
  inverted = false,
  showTagline = false,
  className,
}: AppLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PencilRuler
        className={cn(
          'shrink-0',
          inverted ? 'text-white' : 'text-brand-600',
          size === 'sm' && 'size-4',
          size === 'md' && 'size-5',
          size === 'lg' && 'size-6',
        )}
        strokeWidth={2.25}
      />
      <div className="min-w-0">
        <p
          className={cn(
            'font-bold tracking-tight',
            inverted ? 'text-white' : 'text-brand-700',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-xl',
          )}
        >
          PaperCue
        </p>
        {showTagline && (
          <p className={cn('text-xs', inverted ? 'text-white/70' : 'text-muted-foreground')}>
            AI Question Papers
          </p>
        )}
      </div>
    </div>
  )
}
