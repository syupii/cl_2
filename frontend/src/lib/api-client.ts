/**
 * Type-safe API client that attaches the Supabase JWT to every request.
 *
 * Usage pattern (with TanStack Query):
 *   const { data } = useQuery({ queryKey: ['subscriptions'], queryFn: () => apiGet('/subscriptions') })
 *
 * The types exported from src/types/api.ts (generated from swagger.json) are
 * used to type both request bodies and response shapes so any backend changes
 * break the build, not production.
 */

import { supabase } from './supabase'
import type { definitions } from '@/types/api'

// Re-export the generated API types under shorter aliases for use in
// components. The long package-path names from swag are an implementation
// detail; the aliases are the public surface.
export type SubscriptionDTO = definitions['internal_api.SubscriptionDTO']
export type CreateSubscriptionRequest = definitions['internal_api.CreateSubscriptionRequest']
export type UpdateSubscriptionRequest = definitions['internal_api.UpdateSubscriptionRequest']
export type TemplateDTO = definitions['internal_api.TemplateDTO']
export type PlanDTO = definitions['internal_api.PlanDTO']
export type SummaryResponse = definitions['internal_api.SummaryResponse']
export type CategoryBreakdown = definitions['internal_api.CategoryBreakdown']
export type MonthlyTrendPoint = definitions['internal_api.MonthlyTrendPoint']

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1'

/** Retrieves the Supabase access token or throws if the user is not signed in. */
async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 401 Unauthorized: セッション切れ → サインアウトしてログイン画面へ
  if (res.status === 401) {
    await supabase.auth.signOut()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  // 204 No Content や空ボディのレスポンスは JSON パースをスキップ
  const contentType = res.headers.get('content-type') ?? ''
  if (res.status === 204 || !contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return undefined as T
  }

  const text = await res.text()
  if (!text) {
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return undefined as T
  }

  const json = JSON.parse(text) as { success: boolean; data?: T; error?: string }

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `API error ${res.status}`)
  }
  return json.data as T
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function fetchSubscriptions(): Promise<{ subscriptions: SubscriptionDTO[] }> {
  return request('GET', '/subscriptions')
}

export function createSubscription(body: CreateSubscriptionRequest): Promise<SubscriptionDTO> {
  return request('POST', '/subscriptions', body)
}

export function updateSubscription(id: string, body: UpdateSubscriptionRequest): Promise<SubscriptionDTO> {
  return request('PUT', `/subscriptions/${id}`, body)
}

export function deleteSubscription(id: string): Promise<void> {
  return request('DELETE', `/subscriptions/${id}`)
}

// ── Templates ────────────────────────────────────────────────────────────────

export function fetchTemplates(): Promise<{ templates: TemplateDTO[] }> {
  return request('GET', '/templates')
}

export function updatePlanPrice(id: string, defaultPrice: string, currency: string): Promise<void> {
  return request('PUT', `/templates/plans/${id}`, { default_price: defaultPrice, currency })
}

// ── Summary ──────────────────────────────────────────────────────────────────

export function fetchSummary(): Promise<SummaryResponse> {
  return request('GET', '/summary')
}

// ── Payment Methods ───────────────────────────────────────────────────────────

export interface PaymentMethodDTO { id: string; name: string }

export function fetchPaymentMethods(): Promise<{ payment_methods: PaymentMethodDTO[] }> {
  return request('GET', '/payment-methods')
}

export function createPaymentMethod(name: string): Promise<PaymentMethodDTO> {
  return request('POST', '/payment-methods', { name })
}

export function deletePaymentMethod(id: string): Promise<void> {
  return request('DELETE', `/payment-methods/${id}`)
}
