import type { CostEstimate } from '../editor/schema'

export function formatCost(estimate: CostEstimate): string {
  if (estimate.estimated_cost_usd === 0) return 'Free (local)'
  if (estimate.estimated_cost_usd < 0.01) {
    return `< $0.01`
  }
  return `$${estimate.estimated_cost_usd.toFixed(3)}`
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `~${(tokens / 1000).toFixed(1)}k tokens`
  }
  return `~${tokens} tokens`
}
