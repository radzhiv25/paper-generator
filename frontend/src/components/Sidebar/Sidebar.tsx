import { FileText, Home, LayoutTemplate, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AppLogo } from '../AppLogo'
import { useAuth } from '../../state/AuthContext'
import type { AppView } from '../../state/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

const navItems: { id: AppView; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'recent', label: 'Recent', icon: FileText },
]

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-panel">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
        <AppLogo size="sm" showTagline />
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activeView === item.id
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full justify-start gap-2',
                active && 'bg-brand-50 font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-700',
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('settings')}
          className={cn(
            'mb-2 w-full justify-start gap-2',
            activeView === 'settings' &&
              'bg-brand-50 font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-700',
          )}
        >
          <Settings className="size-4" />
          Settings
        </Button>
        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="truncate text-sm font-medium">{user?.name ?? 'Guest'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              void signOut().then(() => navigate('/', { replace: true }))
            }}
            className="mt-1 h-auto p-0 text-xs text-brand-600"
          >
            <LogOut className="size-3" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  )
}

export { Sidebar as default }
