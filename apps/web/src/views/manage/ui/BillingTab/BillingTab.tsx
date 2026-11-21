'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Check } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { checkoutBilling, extendBilling, getBilling } from '@/shared/api/clientApi'
import type {
  BillingCheckoutInput,
  BillingExtendInput,
  BillingPlan,
  BusinessBilling,
  PlanAccess,
} from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { pluralize } from '@/shared/lib/plural'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import own from './BillingTab.module.css'

interface BillingTabProps {
  slug: string
}

type Period = '1' | '12'

const dayFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})

const formatDay = (iso: string) => dayFormat.format(new Date(iso))

/** «Пробный период до 21 декабря», «Оплачен до …», «Бессрочно», «Бесплатно». */
const describeStatus = (access: PlanAccess) => {
  const until = access.endsAt ? formatDay(access.endsAt) : ''
  const texts: Record<PlanAccess['status'], string> = {
    lifetime: 'бессрочно',
    active: `оплачен до ${until}`,
    trial: `пробный период до ${until}`,
    free: 'бесплатно',
    expired: access.upgradeTitle
      ? `«${access.upgradeTitle}» закончился ${until}`
      : `закончился ${until}`,
  }
  return texts[access.status]
}

const of = (used: number, limit: number | null) =>
  limit === null ? String(used) : `${used} из ${limit}`

/** One line of what a plan gives: masters, branches and SMS. */
const describePlan = (plan: BillingPlan) => {
  const masters =
    plan.maxMasters === null
      ? 'мастера без ограничений'
      : `до ${pluralize(plan.maxMasters, ['мастера', 'мастеров', 'мастеров'])}`
  const branches =
    plan.maxBranches === null
      ? 'филиалы без ограничений'
      : `${pluralize(plan.maxBranches, ['филиал', 'филиала', 'филиалов'])}`
  const sms =
    plan.smsPerMonth === null
      ? 'SMS без ограничений'
      : plan.smsPerMaster > 0
        ? `${plan.smsPerMaster} SMS на мастера`
        : `${plan.smsPerMonth} SMS в месяц`
  return `${masters} · ${branches} · ${sms}`
}

const planPrice = (plan: BillingPlan) =>
  plan.monthlyPrice === 0 ? 'Бесплатно' : `${formatPrice(plan.monthlyPrice)} в месяц`

// «Настройки → Тариф»: what the business is on and until when, what it uses of it, paying for
// the paid plan (a month or a year) and SMS packs through the same checkout as deposits.
export const BillingTab = ({ slug }: BillingTabProps) => {
  const toast = useToast()
  const session = useSession()
  const [billing, setBilling] = useState<BusinessBilling | null>(null)
  const [period, setPeriod] = useState<Period>('1')
  const [isPaying, setIsPaying] = useState(false)
  const isPlatformAdmin = session.customer?.isAdmin ?? false

  useEffect(() => {
    const controller = new AbortController()
    getBilling(slug, controller.signal)
      .then(setBilling)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
      })
    return () => controller.abort()
  }, [slug, toast])

  if (!billing) return null

  const { access, usage } = billing
  const paidPlan = billing.plans.find((plan) => plan.key === billing.paidPlanKey) ?? null
  const price = billing.prices.find((item) => String(item.months) === period) ?? null
  const isPayable = paidPlan !== null && price !== null && access.status !== 'lifetime'

  const pay = async (input: BillingCheckoutInput) => {
    setIsPaying(true)
    try {
      const { url } = await checkoutBilling(slug, input)
      window.location.assign(url)
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
      setIsPaying(false)
    }
  }

  const extend = async (input: BillingExtendInput) => {
    try {
      setBilling(await extendBilling(slug, input))
      toast.show({ title: 'Тариф продлён', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.section} aria-label='Тариф'>
      <SectionHeader
        title='Тариф'
        description={
          <span className={own.status}>
            <strong>{access.title}</strong> · {describeStatus(access)}
          </span>
        }
      />

      <section className={sheet.group} aria-label='Сейчас'>
        <SectionCaption>Сейчас</SectionCaption>
        <div className={styles.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Мастера</span>
            <span className={styles.cellValue}>
              {of(
                usage.masters,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxMasters ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Филиалы</span>
            <span className={styles.cellValue}>
              {of(
                usage.branches,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxBranches ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>SMS в этом месяце</span>
            <span className={styles.cellValue}>{of(usage.smsSent, usage.smsAllowance)}</span>
          </div>
        </div>
        {usage.smsExtra > 0 && <RowNote>Ещё {usage.smsExtra} SMS из пакетов</RowNote>}
        {access.status === 'expired' && (
          <RowNote>
            Записи, расписание и страница работают. Касса, аналитика, лояльность и рассылки
            откроются после оплаты.
          </RowNote>
        )}
      </section>

      {isPayable && paidPlan && price && (
        <section className={sheet.group} aria-label='Оплатить'>
          <SectionCaption>Оплатить «{paidPlan.title}»</SectionCaption>
          <SegmentedControl<Period>
            label='Срок'
            size='sm'
            value={period}
            onChange={setPeriod}
            items={[
              { value: '1', label: 'Месяц' },
              { value: '12', label: 'Год' },
            ]}
          />
          <RowNote>
            {formatPrice(paidPlan.monthlyPrice)} в месяц за{' '}
            {pluralize(paidPlan.includedMasters, ['мастера', 'мастеров', 'мастеров'])}, ещё{' '}
            {formatPrice(paidPlan.extraMasterPrice)} за каждого следующего
            {period === '12' ? '. Год по цене десяти месяцев' : ''}
            {access.endsAt && access.status !== 'expired'
              ? `. Продлится после ${formatDay(access.endsAt)}`
              : ''}
          </RowNote>
          {billing.isPaymentAvailable ? (
            <Button
              className={own.pay}
              size='lg'
              disabled={isPaying}
              onClick={() =>
                void pay({ kind: 'plan', planKey: paidPlan.key, months: Number(period) })
              }
            >
              Оплатить {formatPrice(price.amount)}
            </Button>
          ) : (
            <RowNote>Онлайн-оплата пока недоступна: напишите нам, продлим вручную.</RowNote>
          )}
        </section>
      )}

      <section className={sheet.group} aria-label='Тарифы'>
        <SectionCaption>Тарифы</SectionCaption>
        <ul className={styles.list}>
          {billing.plans.map((plan) => (
            <li key={plan.key} className={own.plan}>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {plan.title}
                  {plan.trialDays > 0 && (
                    <span className={styles.badge}>{plan.trialDays} дней бесплатно</span>
                  )}
                </span>
                <span className={own.planMeta}>{plan.description}</span>
                <span className={own.planMeta}>{describePlan(plan)}</span>
              </span>
              <span className={styles.cellValue}>{planPrice(plan)}</span>
              {plan.key === access.planKey ? (
                <Check className={own.check} weight='bold' aria-label='Ваш тариф' />
              ) : (
                <span className={own.check} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {billing.isPaymentAvailable && billing.smsPacks.length > 0 && (
        <section className={sheet.group} aria-label='Пакеты SMS'>
          <SectionCaption>Пакеты SMS</SectionCaption>
          <ul className={styles.list}>
            {billing.smsPacks.map((pack) => (
              <li key={pack.key}>
                <button
                  type='button'
                  className={`${sheet.row} ${own.packRow}`}
                  disabled={isPaying}
                  onClick={() => void pay({ kind: 'sms', packKey: pack.key })}
                >
                  <span className={own.packTitle}>{pack.size} SMS</span>
                  <span className={sheet.rowControl}>
                    <span className={styles.cellValue}>{formatPrice(pack.price)}</span>
                    <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <RowNote>Тратятся, когда SMS месяца закончились, и не сгорают.</RowNote>
        </section>
      )}

      {billing.orders.length > 0 && (
        <section className={sheet.group} aria-label='Оплаты'>
          <SectionCaption>Оплаты</SectionCaption>
          <ul className={styles.list}>
            {billing.orders.map((order) => (
              <li key={order.id} className={sheet.row}>
                <span className={styles.rowBody}>
                  <span>{order.title}</span>
                  <span className={styles.rowMeta}>{formatDay(order.paidAt)}</span>
                </span>
                <span className={styles.cellValue}>{formatPrice(order.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPlatformAdmin && paidPlan && (
        <section className={sheet.group} aria-label='Для Awaisa'>
          <SectionCaption>Для Awaisa</SectionCaption>
          <div className={styles.list}>
            <Menu
              label='Продлить вручную'
              align='start'
              className={`${sheet.row} ${own.menuRow}`}
              trigger={
                <>
                  <span>Продлить вручную</span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </>
              }
            >
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 1 })}>
                «{paidPlan.title}» на месяц
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 12 })}>
                «{paidPlan.title}» на год
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, isLifetime: true })}>
                «{paidPlan.title}» бессрочно
              </MenuItem>
            </Menu>
          </div>
        </section>
      )}
    </section>
  )
}
