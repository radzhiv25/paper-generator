import { useState } from 'react'
import { Check, CheckCircle2, KeyRound, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  clearByokApiKey,
  clearByokBaseUrl,
  getByokApiKey,
  getByokBaseUrl,
  getByokModel,
  getByokProvider,
  setByokApiKey,
  setByokBaseUrl,
  setByokModel,
  setByokProvider,
  type ByokProvider,
} from '../../lib/settings'
import { isSupabaseConfigured } from '../../lib/supabase'

// Models curated for CBSE paper generation quality
const PROVIDER_MODEL_PRESETS: Record<ByokProvider, { id: string; label: string; note?: string }[]> = {
  openrouter: [
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', note: 'Best value' },
    { id: 'openai/gpt-4o', label: 'GPT-4o', note: 'Best quality' },
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
    { id: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku', note: 'Fast & cheap' },
    { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5', note: 'Cheapest' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'Best value' },
    { id: 'gpt-4o', label: 'GPT-4o', note: 'Best quality' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', note: 'Best quality' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', note: 'Fast & cheap' },
  ],
  custom: [],
}

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState(getByokApiKey() ?? '')
  const [provider, setProvider] = useState<ByokProvider>(getByokProvider())
  const [customBaseUrl, setCustomBaseUrl] = useState(
    getByokBaseUrl() ?? 'http://localhost:11434/v1',
  )
  const [byokModel, setByokModelState] = useState(getByokModel())
  const [saved, setSaved] = useState(false)
  // Track what's actually persisted in localStorage (source of truth)
  const [savedKey, setSavedKey] = useState(getByokApiKey() ?? '')
  const [savedModel, setSavedModel] = useState(getByokModel())

  const keyIsSaved = savedKey.trim().length > 0
  const hasPendingChanges = apiKey.trim() !== savedKey.trim() || byokModel.trim() !== savedModel.trim()

  const handleSave = () => {
    if (apiKey.trim()) {
      setByokApiKey(apiKey.trim())
    } else {
      clearByokApiKey()
    }
    setByokProvider(provider)
    if (provider === 'custom' && customBaseUrl.trim()) {
      setByokBaseUrl(customBaseUrl.trim())
    } else {
      clearByokBaseUrl()
    }
    setByokModel(byokModel.trim())
    setSavedKey(apiKey.trim())
    setSavedModel(byokModel.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-8">
      <div className="mx-auto w-full max-w-lg">
        <h2 className="text-2xl font-semibold">Settings</h2>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-600" />
            <h3 className="text-sm font-semibold">Bring Your Own Key (BYOK)</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Keys stay in this browser and are sent to your backend only for generation
            requests. Set <code className="text-xs">LLM_PROVIDER=byok</code> in{' '}
            <code className="text-xs">backend/.env</code> to use BYOK.
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as ByokProvider)}
            >
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="custom">Custom (local / LM Studio / etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === 'custom' && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="base-url">Base URL</Label>
              <Input
                id="base-url"
                type="url"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                OpenAI-compatible endpoint (Ollama, LM Studio, vLLM, etc.)
              </p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="api-key">API Key</Label>
              {keyIsSaved ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Key saved · {savedKey.slice(0, 8)}…
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <XCircle className="size-3.5" />
                  No key saved
                </span>
              )}
            </div>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'openrouter'
                  ? 'sk-or-…'
                  : provider === 'custom'
                    ? 'optional for local servers'
                    : 'sk-…'
              }
              className="font-mono"
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="byok-model">Model</Label>
            <Input
              id="byok-model"
              type="text"
              value={byokModel}
              onChange={(e) => setByokModelState(e.target.value)}
              placeholder="e.g. openai/gpt-4o"
              className="font-mono"
            />
            {PROVIDER_MODEL_PRESETS[provider]?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_MODEL_PRESETS[provider].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setByokModelState(preset.id)}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300 ${
                      byokModel === preset.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'border-border bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="font-medium">{preset.label}</span>
                    {preset.note && (
                      <span className="rounded bg-background px-1 text-[10px] text-muted-foreground">
                        {preset.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button type="button" onClick={handleSave}>
              {saved ? <Check /> : <KeyRound />}
              {saved ? 'Saved!' : 'Save'}
            </Button>
            {hasPendingChanges && !saved && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            )}
          </div>
        </section>

        <Separator className="my-10" />

        <section>
          <h3 className="text-sm font-semibold">Authentication</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSupabaseConfigured
              ? 'Supabase auth is configured via environment variables.'
              : 'Supabase not configured — using local guest mode. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable.'}
          </p>
        </section>

        <Separator className="my-10" />

        <section>
          <h3 className="text-sm font-semibold">API</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Backend:{' '}
            <code className="rounded bg-muted px-1 text-xs">
              {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}
            </code>
          </p>
        </section>
      </div>
    </div>
  )
}
