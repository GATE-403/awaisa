'use client'

import { ph, plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { orderSubscription } from '@/shared/api/clientApi'
import type { Business, OnlineSubscriptionPlan } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { localizePath } from '@/shared/i18n/locales'
import { useLocale } from '@/shared/i18n/navigation'
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
  const format = useFormat()
  const { t } = useLingui()
  const session = useSession()
  const locale = useLocale()
  const isSignedIn = session.status === 'signedIn'
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saving = plan.fullPrice !== null ? plan.fullPrice - plan.price : 0

  const handleBuy = async () => {
    if (!isSignedIn) {
      window.location.assign(
        localizePath(
          `/login?next=${encodeURIComponent(`/${business.slug}#subscriptions`)}`,
          locale,
        ),
      )
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
      title={t`Membership`}
      onClose={onClose}
      action={{
        label: isSignedIn
          ? isPaying
            ? t`Paying…`
            : t`Buy for ${ph({ price: format.price(plan.price) })}`
          : t`Sign in to buy`,
        disabled: isPaying,
        onClick: () => void handleBuy(),
      }}
    >
      <div className={sheet.form}>
        <section className={sheet.group} aria-label={plan.title}>
          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Name</Trans>
              </span>
              <span className={sheet.rowControl}>{plan.title}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Service</Trans>
              </span>
              <span className={sheet.rowControl}>{plan.serviceName ?? 'Any'}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Visits</Trans>
              </span>
              <span className={sheet.rowControl}>{plan.visits}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Valid for</Trans>
              </span>
              <span className={sheet.rowControl}>
                {t`${plural(plan.validDays, { one: '# day', other: '# days' })} from payment`}
              </span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>
                <Trans>Price</Trans>
              </span>
              <span className={sheet.rowControl}>{format.price(plan.price)}</span>
            </div>
          </div>
          <p className={sheet.groupFooter}>
            {saving > 0 && plan.fullPrice !== null
              ? `${t`Separately ${ph({ full: format.price(plan.fullPrice) })}, you save ${ph({ saving: format.price(saving) })}.`} `
              : ''}
            <Trans>
              Paid by card. The membership shows in your profile right after payment, and visits are
              used when you come in.
            </Trans>
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
