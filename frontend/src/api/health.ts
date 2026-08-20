import { apiFetch } from './client'

export interface HealthInfo {
  status: string
  llm_provider: string
  llm_model?: string
}

export async function fetchHealth(): Promise<HealthInfo> {
  return apiFetch<HealthInfo>('/health')
}
