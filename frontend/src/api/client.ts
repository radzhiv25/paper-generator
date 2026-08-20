import { getByokApiKey, resolveByokBaseUrl } from '../lib/settings'
import { getApiBase } from './config'

export class ApiError extends Error {
  status: number
  body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

let mockMode = false

export function setMockMode(enabled: boolean): void {
  mockMode = enabled
}

export function getMockMode(): boolean {
  return mockMode
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new ApiError(
      `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      body,
    )
  }
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return res.blob() as Promise<T>
}

function applyByokHeaders(headers: Headers, path: string): void {
  const byokKey = getByokApiKey()
  if (!byokKey) return
  const needsByok =
    path.includes('/generate') || /\/questions\/[^/]+$/.test(path)
  if (!needsByok) return
  headers.set('X-BYOK-API-Key', byokKey)
  const baseUrl = resolveByokBaseUrl()
  if (baseUrl) {
    headers.set('X-BYOK-Base-URL', baseUrl)
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${getApiBase()}${path}`
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  applyByokHeaders(headers, path)

  try {
    const res = await fetch(url, { ...options, headers })
    return parseResponse<T>(res)
  } catch (err) {
    if (err instanceof ApiError) throw err
    mockMode = true
    throw err
  }
}

export async function apiFetchWithFallback<T>(
  path: string,
  options: RequestInit,
  fallback: () => T | Promise<T>,
): Promise<T> {
  try {
    return await apiFetch<T>(path, options)
  } catch (err) {
    // Only fall back when the backend is unreachable — not on API error responses.
    if (err instanceof ApiError) throw err
    mockMode = true
    return fallback()
  }
}
