import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPaymentMethods, createPaymentMethod, deletePaymentMethod } from '@/lib/api-client'

const PM_KEY = ['payment-methods'] as const

export function usePaymentMethods() {
  return useQuery({
    queryKey: PM_KEY,
    queryFn: async () => {
      const res = await fetchPaymentMethods()
      return res.payment_methods ?? []
    },
  })
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createPaymentMethod(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PM_KEY }) },
  })
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePaymentMethod(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PM_KEY }) },
  })
}
