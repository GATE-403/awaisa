'use client'

import { Select } from '@awaisa/ui/Select'
import { formatPrice } from '@/entities/booking'
import type { ClientSubscription, OnlineSubscriptionPlan } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import type { PaymentChoice } from '../../model/useSubscriptionPayment'

interface SubscriptionPaymentRowProps {
  /** The row style of the group it sits in (label | value). */
  className?: string
  labelClassName?: string
  choice: PaymentChoice
  subscriptions: ClientSubscription[]
  plans: OnlineSubscriptionPlan[]
  onChange: (choice: PaymentChoice) => void
}

interface SubscriptionPaymentNoteProps {
  subscription: ClientSubscription | null
  plan: OnlineSubscriptionPlan | null
}

// Payment as a Settings row with a plain Select: at the salon, by one's own subscription here,
// or buying one with this visit - offered only when one of the last two exists.
export const SubscriptionPaymentRow = ({
  className,
  labelClassName,
  choice,
  subscriptions,
  plans,
  onChange,
}: SubscriptionPaymentRowProps) => {
  const t = useT()
  const items: { value: PaymentChoice; label: string }[] = [
    { value: 'salon', label: t('At the salon') },
    ...subscriptions.map((item) => ({
      value: `subscription:${item.id}` as const,
      label: t('By subscription · {count} left', { count: item.visitsLeft }),
    })),
    ...plans.map((plan) => ({
      value: `plan:${plan.id}` as const,
      label: t('New subscription · {price}', { price: formatPrice(plan.price) }),
    })),
  ]

  return (
    <div className={className}>
      <span className={labelClassName}>{t('Payment')}</span>
      <Select
        variant='plain'
        aria-label={t('Payment')}
        items={items}
        value={choice}
        onValueChange={(value) => value && onChange(value)}
      />
    </div>
  )
}

// What the choice means, said under the group: when the visit is drawn, or what is bought.
export const SubscriptionPaymentNote = ({ subscription, plan }: SubscriptionPaymentNoteProps) => {
  const t = useT()
  if (subscription) {
    return (
      <RowNote>
        {t('“{title}”: the visit is deducted once the specialist marks it', {
          title: subscription.title,
        })}
      </RowNote>
    )
  }
  if (!plan) return null
  const saving = plan.fullPrice !== null ? plan.fullPrice - plan.price : 0

  return (
    <RowNote>
      {[
        `“${plan.title}”: ${t.count(plan.visits, ['visit', 'visits'])}`,
        t.count(plan.validDays, ['day', 'days']),
        saving > 0 ? t('save {amount}', { amount: formatPrice(saving) }) : null,
        t('paid by card now, this visit is the first'),
      ]
        .filter(Boolean)
        .join(' · ')}
    </RowNote>
  )
}
