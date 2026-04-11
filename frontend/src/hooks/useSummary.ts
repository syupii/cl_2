import { useQuery } from '@tanstack/react-query'
import { fetchSummary } from '@/lib/api-client'

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
  })
}
