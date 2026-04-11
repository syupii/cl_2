import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubscription,
  fetchSubscriptions,
  updateSubscription,
  type CreateSubscriptionRequest,
  type UpdateSubscriptionRequest,
} from '@/lib/api-client'

export const SUBSCRIPTIONS_KEY = ['subscriptions'] as const

export function useSubscriptions() {
  return useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: async () => {
      const res = await fetchSubscriptions()
      return res.subscriptions ?? []
    },
  })
}

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSubscriptionRequest) => createSubscription(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY }) },
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSubscriptionRequest }) =>
      updateSubscription(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
      // Also bust summary since status/price change affects the totals.
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
