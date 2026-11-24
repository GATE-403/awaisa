'use client'

import { useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { orderSubscription } from '@/shared/api/clientApi'
import type { Business, OnlineSubscriptionPlan } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface SubscriptionSheetProps {
  business: Business
  plan: OnlineSubscriptionPlan
  onClose: () => void
}

// The purchase: what the plan gives as Settings rows, «Buy for N som» in the bar. It is bought on
// the client's own number, so a guest signs in by SMS first and comes back to this section.
export const SubscriptionSheet = ({ business, plan, onClose }: SubscriptionSheetProps) => {
  const session = useSession()
  const isSignedIn = session.status === 'signedIn'
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saving = plan.fullPrice !== null ? plan.fullPrice - plan.price : 0

  const handleBuy = async () => {
    if (!isSignedIn) {
      window.location.assign(`/login?next=${encodeURIComponent(`/${business.slug}#subscriptions`)}`)
      return
    }
    setIsPaying(true)
    setError(null)
    try {
      const { url } = await orderSubscription(business.slug, plan.id)
      // The test checkout is our own /pay page; a real acquirer has a page of its own.
      window.location.assign(url)
    } catch (buyError) {
      setError(getErrorMessage(buyError))
      setIsPaying(false)
    }
  }

  return (
    <Sheet
      title='Membership'
      onClose={onClose}
      action={{
        label: isSignedIn
          ? isPaying
            ? 'Paying…'
            : `Buy for ${formatPrice(plan.price)}`
          : 'Sign in to buy',
        disabled: isPaying,
        onClick: () => void handleBuy(),
      }}
    >
      <div className={sheet.form}>
        <section className={sheet.group} aria-label={plan.title}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Name</span>
              <span className={sheet.rowControl}>{plan.title}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Service</span>
              <span className={sheet.rowControl}>{plan.serviceName ?? 'Any'}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Visits</span>
              <span className={sheet.rowControl}>{plan.visits}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Valid for</span>
              <span className={sheet.rowControl}>
                {pluralize(plan.validDays, ['day', 'days'])} from payment
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Price</span>
              <span className={sheet.rowControl}>{formatPrice(plan.price)}</span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {saving > 0 && plan.fullPrice !== null
              ? `Separately ${formatPrice(plan.fullPrice)}, you save ${formatPrice(saving)}. `
              : ''}
            Paid by card. The membership shows in your profile right after payment, and visits are
            used when you come in.
          </p>
          {error && (
            <p className={sheet.groupFooter} role='alert'>
              {error}
            </p>
          )}
        </section>
      </div>
    </Sheet>
  )
}
