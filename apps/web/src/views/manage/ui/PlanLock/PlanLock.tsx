'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import type { PlanFeature } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { usePlanAccess } from '@/views/manage/model/usePlanAccess'

interface PlanLockProps {
  slug: string
  feature: PlanFeature
}

// What each paid section gives, in one line: why it is worth the plan.
const FEATURE_TEXT: Record<PlanFeature, MessageDescriptor> = {
  cashdesk: msg`Shifts, product sales and expenses: the till balances itself.`,
  inventory: msg`Materials are written off with every visit.`,
  analytics: msg`Revenue, specialist workload and where clients come from.`,
  loyalty: msg`Bonuses, passes and certificates bring clients back.`,
  promotions: msg`Discounts by the hour, for a first visit and promo codes.`,
  mailings: msg`SMS campaigns to clients who haven't been in a while.`,
  import: msg`Clients and bookings from Altegio or YCLIENTS in one file.`,
  payroll: msg`Specialist pay is calculated automatically.`,
  team: msg`Administrators run the schedule without access to money.`,
  deposits: msg`Prepayment for online bookings.`,
  fiscal: msg`Fiscal receipts for visits and sales go to the tax service by themselves.`,
}

// A section the business's plan does not open: one `EmptyState`, the plan that opens it and the
// way there (the owner), or who can open it (an administrator).
export const PlanLock = ({ slug, feature }: PlanLockProps) => {
  const { t } = useLingui()
  const access = usePlanAccess()
  const isOwner = useCanSeeMoney()
  const plan = access?.upgradeTitle

  return (
    <EmptyState
      title={plan ? t`Available on the “${plan}” plan` : t`Not available on your plan`}
      text={
        isOwner
          ? t(FEATURE_TEXT[feature])
          : `${t(FEATURE_TEXT[feature])} ${t`The owner changes the plan.`}`
      }
      action={
        isOwner && (
          <ButtonLink render={<NextLink href={`/manage/${slug}?tab=billing`} />}>
            {t`Open the plan`}
          </ButtonLink>
        )
      }
    />
  )
}
