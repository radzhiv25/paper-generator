import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { ThemeToggle } from '../ThemeToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '../../state/AuthContext'
import { isSupabaseConfigured } from '../../lib/supabase'

export function AuthScreen() {
  const { signIn, signUp, signInAsGuest, loading, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/app" replace />
  }

  const goApp = () => navigate('/app', { replace: true })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password, name)
      }
      goApp()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGuest = () => {
    signInAsGuest()
    goApp()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="grid h-full min-h-0 bg-background lg:grid-cols-[1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-700 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255_/_0.12),transparent_50%)]" />
        <Link to="/" className="relative z-10">
          <AppLogo size="lg" inverted />
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
            Write the paper. Let AI handle the first draft.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Structured sections, targeted edits, and a linked answer key — backed by your syllabus PDF.
          </p>
          <div className="mt-10 rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Sample header</p>
            <p className="mt-2 text-lg font-medium text-white">Physics — Class XII</p>
            <p className="mt-1 text-sm text-white/70">80 marks · 3 hours · Sections A–C</p>
            <div className="mt-4 space-y-2">
              <div className="h-2 w-5/6 rounded-full bg-white/25" />
              <div className="h-2 w-full rounded-full bg-white/15" />
              <div className="h-2 w-2/3 rounded-full bg-white/15" />
            </div>
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/45">PaperCue · AI question papers</p>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-full flex-col">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link to="/" className="lg:hidden">
            <AppLogo size="md" />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center px-6 pb-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-[22rem]">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'login' ? 'Sign in' : 'Create an account'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue to your papers dashboard.
            </p>

            {!isSupabaseConfigured && (
              <Alert className="mt-6 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                <AlertDescription>
                  Supabase not configured — guest mode available.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="mt-2 w-full" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Sign up'}
              </Button>
            </form>

            <Button
              type="button"
              variant="link"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="mt-4 w-full text-brand-600"
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <Button type="button" variant="outline" size="lg" onClick={handleGuest} className="w-full">
              Continue as guest
            </Button>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline-offset-4 hover:text-foreground hover:underline">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
