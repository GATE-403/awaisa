'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import type { PlanFeature } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { usePlanAccess } from '@/views/manage/model/usePlanAccess'

interface PlanLockProps {
  slug: string
  feature: PlanFeature
}

// What each paid section gives, in one line: why it is worth the plan.
const FEATURE_TEXT: Record<PlanFeature, string> = {
  cashdesk: 'Shifts, product sales and expenses: the till balances itself.',
  inventory: 'Materials are written off with every visit.',
  analytics: 'Revenue, specialist workload and where clients come from.',
  loyalty: 'Bonuses, passes and certificates bring clients back.',
  promotions: 'Discounts by the hour, for a first visit and promo codes.',
  mailings: "SMS campaigns to clients who haven't been in a while.",
  import: 'Clients and bookings from Altegio or YCLIENTS in one file.',
  payroll: 'Specialist pay is calculated automatically.',
  team: 'Administrators run the schedule without access to money.',
  deposits: 'Prepayment for online bookings.',
  fiscal: 'Fiscal receipts for visits and sales go to the tax service by themselves.',
}

// A section the business's plan does not open: one `EmptyState`, the plan that opens it and the
// way there (the owner), or who can open it (an administrator).
export const PlanLock = ({ slug, feature }: PlanLockProps) => {
  const t = useT()
  const access = usePlanAccess()
  const isOwner = useCanSeeMoney()
  const plan = access?.upgradeTitle

  return (
    <EmptyState
      title={plan ? t('Available on the "{plan}" plan', { plan }) : t('Not available on your plan')}
      text={
        isOwner
          ? t(FEATURE_TEXT[feature])
          : `${t(FEATURE_TEXT[feature])} ${t('The owner changes the plan.')}`
      }
      action={
        isOwner && (
          <ButtonLink render={<NextLink href={`/manage/${slug}?tab=billing`} />}>
            {t('Open the plan')}
          </ButtonLink>
        )
      }
    />
  )
}
