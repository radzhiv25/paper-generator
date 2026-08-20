export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'papercue-theme'

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

export function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = getStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function persistTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
}

export function initTheme() {
  applyTheme(getPreferredTheme())
}
