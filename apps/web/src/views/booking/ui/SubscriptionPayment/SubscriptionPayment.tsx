'use client'

import { Select } from '@awaisa/ui/Select'
import { ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { ClientSubscription, OnlineSubscriptionPlan } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
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
  const format = useFormat()
  const { t } = useLingui()
  const items: { value: PaymentChoice; label: string }[] = [
    { value: 'salon', label: t`At the salon` },
    ...subscriptions.map((item) => ({
      value: `subscription:${item.id}` as const,
      label: t`By subscription · ${ph({ count: item.visitsLeft })} left`,
    })),
    ...plans.map((plan) => ({
      value: `plan:${plan.id}` as const,
      label: t`New subscription · ${ph({ price: format.price(plan.price) })}`,
    })),
  ]

  return (
    <div className={className}>
      <span className={labelClassName}>{t`Payment`}</span>
      <Select
        variant='plain'
        aria-label={t`Payment`}
        items={items}
        value={choice}
        onValueChange={(value) => value && onChange(value)}
      />
    </div>
  )
}

// What the choice means, said under the group: when the visit is drawn, or what is bought.
export const SubscriptionPaymentNote = ({ subscription, plan }: SubscriptionPaymentNoteProps) => {
  const format = useFormat()
  const { t } = useLingui()
  if (subscription) {
    return (
      <RowNote>
        {t`“${ph({ title: subscription.title })}”: the visit is deducted once the specialist marks it`}
      </RowNote>
    )
  }
  if (!plan) return null
  const saving = plan.fullPrice !== null ? plan.fullPrice - plan.price : 0

  return (
    <RowNote>
      {[
        `“${plan.title}”: ${t`${plural(plan.visits, { one: '# visit', other: '# visits' })}`}`,
        t`${plural(plan.validDays, { one: '# day', other: '# days' })}`,
        saving > 0 ? t`save ${ph({ amount: format.price(saving) })}` : null,
        t`paid by card now, this visit is the first`,
      ]
        .filter(Boolean)
        .join(' · ')}
    </RowNote>
  )
}
