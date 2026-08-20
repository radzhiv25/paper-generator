import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  label: string
  shortcut?: string
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}

export function Tooltip({
  label,
  shortcut,
  side = 'top',
  children,
  className,
}: TooltipProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPosition({
      top: side === 'top' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
  }, [side])

  const show = () => {
    updatePosition()
    setVisible(true)
  }

  const hide = () => setVisible(false)

  return (
    <>
      <div
        ref={anchorRef}
        className={cn('inline-flex', className)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              transform: side === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              zIndex: 9999,
            }}
            className="pointer-events-none whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-gray-800"
          >
            <span>{label}</span>
            {shortcut && (
              <kbd className="ml-2 rounded border border-white/20 bg-white/10 px-1 py-0.5 font-sans text-[10px] text-white/80">
                {shortcut}
              </kbd>
            )}
            <span
              className={cn(
                'absolute left-1/2 size-2 -translate-x-1/2 rotate-45 bg-gray-900 dark:bg-gray-800',
                side === 'top' ? 'top-full -mt-1' : 'bottom-full -mb-1',
              )}
              aria-hidden
            />
          </div>,
          document.body,
        )}
    </>
  )
}

interface ToolbarGroupProps {
  label?: string
  children: ReactNode
}

export function ToolbarGroup({ label, children }: ToolbarGroupProps) {
  return (
    <div className="doc-toolbar-group flex shrink-0 items-center gap-0.5">
      {label && (
        <span className="mr-0.5 hidden text-[10px] font-semibold uppercase tracking-wider text-muted-foreground 2xl:inline">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
