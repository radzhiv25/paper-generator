const BYOK_KEY = 'paper-generator-byok-api-key'
const BYOK_PROVIDER_KEY = 'paper-generator-byok-provider'
const BYOK_BASE_URL_KEY = 'paper-generator-byok-base-url'

export type ByokProvider = 'openai' | 'anthropic' | 'openrouter' | 'custom'

const PROVIDER_BASE_URLS: Record<Exclude<ByokProvider, 'custom'>, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

export function getByokApiKey(): string | null {
  return localStorage.getItem(BYOK_KEY)
}

export function setByokApiKey(key: string): void {
  localStorage.setItem(BYOK_KEY, key)
}

export function clearByokApiKey(): void {
  localStorage.removeItem(BYOK_KEY)
}

export function getByokProvider(): ByokProvider {
  return (localStorage.getItem(BYOK_PROVIDER_KEY) as ByokProvider) ?? 'openrouter'
}

export function setByokProvider(provider: ByokProvider): void {
  localStorage.setItem(BYOK_PROVIDER_KEY, provider)
}

export function getByokBaseUrl(): string | null {
  return localStorage.getItem(BYOK_BASE_URL_KEY)
}

export function setByokBaseUrl(url: string): void {
  localStorage.setItem(BYOK_BASE_URL_KEY, url)
}

export function clearByokBaseUrl(): void {
  localStorage.removeItem(BYOK_BASE_URL_KEY)
}

/** Resolved OpenAI-compatible base URL for the selected BYOK provider. */
export function resolveByokBaseUrl(): string | null {
  const provider = getByokProvider()
  if (provider === 'custom') {
    return getByokBaseUrl()?.trim() || null
  }
  return PROVIDER_BASE_URLS[provider]
}

export function hasByokKey(): boolean {
  return Boolean(getByokApiKey())
}

const BYOK_MODEL_KEY = 'paper-generator-byok-model'
export function getByokModel(): string { return localStorage.getItem(BYOK_MODEL_KEY) ?? '' }
export function setByokModel(v: string): void { localStorage.setItem(BYOK_MODEL_KEY, v) }
