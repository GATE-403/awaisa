'use client'

import { createContext, useContext } from 'react'
import type { PlanAccess, PlanFeature } from '@/shared/api/types'

// The business's plan in the cabinet (from `GET /manage/:slug`): sections it does not open show
// «Доступно на тарифе …». The API refuses them too (402); this keeps the cabinet from offering them.
const PlanAccessContext = createContext<PlanAccess | null>(null)

const usePlanAccess = () => useContext(PlanAccessContext)

/** Whether the plan opens a feature; true while the plan is not known yet. */
const useHasFeature = (feature: PlanFeature) => {
  const access = usePlanAccess()
  return access === null || access.features.includes(feature)
}

export { PlanAccessContext, useHasFeature, usePlanAccess }
