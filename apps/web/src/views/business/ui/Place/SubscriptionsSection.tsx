'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { formatPrice } from '@/entities/booking'
import type { Business, OnlineSubscriptionPlan } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import styles from './Place.module.css'
import { SubscriptionSheet } from './SubscriptionSheet'
import own from './Subscriptions.module.css'

interface SubscriptionsSectionProps {
  business: Business
  plans: OnlineSubscriptionPlan[]
}

// «Memberships»: the plans the owner sells online, as rows right on the page (what, for how long,
// the price and what it saves); a row opens the purchase.
export const SubscriptionsSection = ({ business, plans }: SubscriptionsSectionProps) => {
  const [chosen, setChosen] = useState<OnlineSubscriptionPlan | null>(null)
  if (plans.length === 0) return null

  return (
    <section id='subscriptions' className={styles.section} aria-labelledby='place-subscriptions'>
      <div className={styles.sectionHead}>
        <h2 id='place-subscriptions' className={styles.sectionTitle}>
          Memberships
        </h2>
        <span className={styles.sectionCount}>{plans.length}</span>
      </div>
      <ul className={own.list}>
        {plans.map((plan) => {
          const saving = plan.fullPrice !== null ? plan.fullPrice - plan.price : 0
          return (
            <li key={plan.id}>
              <button type='button' className={own.row} onClick={() => setChosen(plan)}>
                <span className={own.body}>
                  <span className={own.title}>{plan.title}</span>
                  <span className={own.meta}>
                    {[
                      pluralize(plan.visits, ['visit', 'visits']),
                      plan.serviceName ?? 'any service',
                      pluralize(plan.validDays, ['day', 'days']),
                    ].join(' · ')}
                  </span>
                </span>
                <span className={own.money}>
                  <span className={own.price}>{formatPrice(plan.price)}</span>
                  {saving > 0 && <span className={own.saving}>save {formatPrice(saving)}</span>}
                </span>
                <CaretRight className={own.chevron} aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      {chosen && (
        <SubscriptionSheet business={business} plan={chosen} onClose={() => setChosen(null)} />
      )}
    </section>
  )
}
