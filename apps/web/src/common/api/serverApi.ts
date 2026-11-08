import 'server-only'
import { cache } from 'react'
import { API_URL } from '@/config/api'
import { toApiError } from './apiError'
import type { Catalog } from './types'

const getCatalog = cache(async (): Promise<Catalog> => {
  const response = await fetch(`${API_URL}/catalog`)
  if (!response.ok) throw await toApiError(response)

  return response.json()
})

export { getCatalog }
