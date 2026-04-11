import { useQuery } from '@tanstack/react-query'
import { fetchTemplates } from '@/lib/api-client'

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetchTemplates()
      return res.templates ?? []
    },
    // Templates are master data; cache for the full session.
    staleTime: Infinity,
  })
}
