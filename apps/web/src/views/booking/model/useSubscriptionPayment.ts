'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { getMySubscriptionsAt, getOnlineSubscriptionPlans } from '@/shared/api/clientApi'
import type { ClientSubscription, OnlineSubscriptionPlan } from '@/shared/api/types'

/** How the visit is paid: at the salon, by the client's subscription, or by one bought with it. */
type PaymentChoice = 'salon' | `subscription:${string}` | `plan:${string}`

const covers = (planServiceId: string | null, serviceId: string | null) =>
  serviceId !== null && (planServiceId === null || planServiceId === serviceId)

/**
 * Payment in the booking form: the signed-in client's subscriptions here that cover the chosen
 * service, and the place's plans sold online for it (buy a subscription and book).
 */
export const useSubscriptionPayment = (slug: string, serviceId: string | null) => {
  const session = useSession()
  const [plans, setPlans] = useState<OnlineSubscriptionPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([])
  const [choice, setChoice] = useState<PaymentChoice>('salon')
  const isSignedIn = session.status === 'signedIn'

  useEffect(() => {
    const controller = new AbortController()
    getOnlineSubscriptionPlans(slug, controller.signal)
      .then(setPlans)
      .catch(() => setPlans([]))
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    if (!isSignedIn) return
    const controller = new AbortController()
    getMySubscriptionsAt(slug, controller.signal)
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]))
    return () => controller.abort()
  }, [slug, isSignedIn])

  const ownFitting = isSignedIn
    ? subscriptions.filter((item) => covers(item.serviceId, serviceId))
    : []
  const plansFitting = plans.filter((plan) => covers(plan.serviceId, serviceId))
  const subscription = ownFitting.find((item) => choice === `subscription:${item.id}`) ?? null
  const plan = plansFitting.find((item) => choice === `plan:${item.id}`) ?? null

  return {
    subscriptions: ownFitting,
    plans: plansFitting,
    isSignedIn,
    // A choice that no longer fits the service reads as at the salon.
    choice: subscription || plan ? choice : ('salon' as PaymentChoice),
    setChoice,
    subscription,
    plan,
    hasOptions: ownFitting.length > 0 || plansFitting.length > 0,
  }
}

export type { PaymentChoice }
