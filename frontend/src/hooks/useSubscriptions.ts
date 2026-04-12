import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubscription,
  deleteSubscription,
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
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
