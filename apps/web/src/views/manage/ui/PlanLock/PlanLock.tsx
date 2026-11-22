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
  cashdesk: 'Смены, продажи товаров и расходы: касса сходится сама.',
  inventory: 'Остатки материалов списываются с каждым визитом.',
  analytics: 'Выручка, загрузка мастеров и откуда приходят клиенты.',
  loyalty: 'Бонусы, абонементы и сертификаты возвращают клиентов.',
  promotions: 'Скидки по часам, первому визиту и промокоды.',
  mailings: 'SMS-рассылки тем, кто давно не был.',
  import: 'Клиенты и записи из Altegio или YCLIENTS одним файлом.',
  payroll: 'Зарплата мастеров считается сама.',
  team: 'Администраторы ведут расписание без доступа к деньгам.',
  deposits: 'Предоплата при онлайн-записи.',
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
      title={plan ? t('Доступно на тарифе «{plan}»', { plan }) : t('Недоступно на вашем тарифе')}
      text={
        isOwner
          ? t(FEATURE_TEXT[feature])
          : `${t(FEATURE_TEXT[feature])} ${t('Тариф меняет владелец.')}`
      }
      action={
        isOwner && (
          <ButtonLink render={<NextLink href={`/manage/${slug}?tab=billing`} />}>
            {t('Открыть тариф')}
          </ButtonLink>
        )
      }
    />
  )
}
