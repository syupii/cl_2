import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubscription,
  deleteSubscription,
  fetchSubscriptions,
  updateSubscription,
  type CreateSubscriptionRequest,
  type SubscriptionDTO,
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
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: SUBSCRIPTIONS_KEY })
      const previous = qc.getQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY)
      const tempId = `temp-${Date.now()}`
      qc.setQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY, (old = []) => [
        ...old,
        {
          id: tempId,
          service_name: body.service_name,
          plan_name: body.plan_name ?? null,
          price: body.price,
          currency: body.currency,
          billing_cycle: body.billing_cycle,
          next_billing_date: body.next_billing_date,
          trial_end_date: body.trial_end_date ?? null,
          category: body.category ?? null,
          payment_method: body.payment_method ?? null,
          notes: body.notes ?? null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          monthly_cost_jpy: body.price,
        } as SubscriptionDTO,
      ])
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SUBSCRIPTIONS_KEY, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSubscriptionRequest }) =>
      updateSubscription(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: SUBSCRIPTIONS_KEY })
      const previous = qc.getQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY)
      qc.setQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY, (old = []) =>
        old.map((s) =>
          s.id === id
            ? {
                ...s,
                service_name: body.service_name,
                plan_name: body.plan_name,
                price: body.price,
                currency: body.currency,
                billing_cycle: body.billing_cycle,
                next_billing_date: body.next_billing_date,
                trial_end_date: body.trial_end_date ?? null,
                category: body.category,
                payment_method: body.payment_method,
                notes: body.notes,
                status: body.status ?? s.status,
              } as SubscriptionDTO
            : s
        )
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SUBSCRIPTIONS_KEY, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteSubscription(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: SUBSCRIPTIONS_KEY })
      const previous = qc.getQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY)
      qc.setQueryData<SubscriptionDTO[]>(SUBSCRIPTIONS_KEY, (old = []) =>
        old.filter((s) => s.id !== id)
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(SUBSCRIPTIONS_KEY, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })
      qc.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}
