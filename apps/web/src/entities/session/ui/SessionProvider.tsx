'use client'

import type { ReactNode } from 'react'
import type { Customer } from '@/shared/api/types'
import { InitialSession, toState } from '../model/useSession'

interface SessionProviderProps {
  /** What the server read for this request: the customer, or null for a guest. */
  customer: Customer | null
  children: ReactNode
}

export const SessionProvider = ({ customer, children }: SessionProviderProps) => (
  <InitialSession value={toState(customer)}>{children}</InitialSession>
)
