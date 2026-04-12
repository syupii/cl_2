import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTemplates, updatePlanPrice } from '@/lib/api-client'

export const TEMPLATES_KEY = ['templates'] as const

export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const res = await fetchTemplates()
      return res.templates ?? []
    },
    staleTime: Infinity,
  })
}

export function useUpdatePlanPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, price, currency }: { id: string; price: string; currency: string }) =>
      updatePlanPrice(id, price, currency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY })
    },
  })
}
