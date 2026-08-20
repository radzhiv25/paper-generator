import { useState } from 'react'
import { Check, KeyRound } from 'lucide-react'
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
  getByokProvider,
  setByokApiKey,
  setByokBaseUrl,
  setByokProvider,
  type ByokProvider,
} from '../../lib/settings'
import { isSupabaseConfigured } from '../../lib/supabase'

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState(getByokApiKey() ?? '')
  const [provider, setProvider] = useState<ByokProvider>(getByokProvider())
  const [customBaseUrl, setCustomBaseUrl] = useState(
    getByokBaseUrl() ?? 'http://localhost:11434/v1',
  )
  const [saved, setSaved] = useState(false)

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
            <Label htmlFor="api-key">API Key</Label>
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

          <Button type="button" onClick={handleSave} className="mt-4">
            {saved ? <Check /> : <KeyRound />}
            {saved ? 'Saved!' : 'Save API Key'}
          </Button>
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
