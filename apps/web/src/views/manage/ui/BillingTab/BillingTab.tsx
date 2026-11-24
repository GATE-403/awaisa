'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Check } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
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
import { type Translate, useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
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

const amountFormat = new Intl.NumberFormat('ru-RU')

const formatDay = (t: Translate, iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(iso))

const formatPrice = (t: Translate, value: number) =>
  t('{amount} som', { amount: amountFormat.format(value) })

/** «Пробный период до 21 декабря», «Оплачен до …», «Бессрочно», «Бесплатно». */
const describeStatus = (t: Translate, access: PlanAccess) => {
  const until = access.endsAt ? formatDay(t, access.endsAt) : ''
  const texts: Record<PlanAccess['status'], string> = {
    lifetime: t('for good'),
    active: t('paid until {day}', { day: until }),
    trial: t('trial until {day}', { day: until }),
    free: t('free'),
    expired: access.upgradeTitle
      ? t('«{plan}» ended {day}', { plan: access.upgradeTitle, day: until })
      : t('ended {day}', { day: until }),
  }
  return texts[access.status]
}

const of = (t: Translate, used: number, limit: number | null) =>
  limit === null ? String(used) : t('{used} of {limit}', { used, limit })

/** One line of what a plan gives: masters, branches and SMS. */
const describePlan = (t: Translate, plan: BillingPlan) => {
  const masters =
    plan.maxMasters === null
      ? t('unlimited specialists')
      : t('up to {masters}', {
          masters: t.count(plan.maxMasters, ['specialist', 'specialists']),
        })
  const branches =
    plan.maxBranches === null
      ? t('unlimited branches')
      : t.count(plan.maxBranches, ['branch', 'branches'])
  const sms =
    plan.smsPerMonth === null
      ? t('unlimited SMS')
      : plan.smsPerMaster > 0
        ? t('{count} SMS per specialist', { count: plan.smsPerMaster })
        : t('{count} SMS a month', { count: plan.smsPerMonth })
  return `${masters} · ${branches} · ${sms}`
}

const planPrice = (t: Translate, plan: BillingPlan) =>
  plan.monthlyPrice === 0
    ? t('Free')
    : t('{price} a month', { price: formatPrice(t, plan.monthlyPrice) })

// «Настройки → Тариф»: what the business is on and until when, what it uses of it, paying for
// the paid plan (a month or a year) and SMS packs through the same checkout as deposits.
export const BillingTab = ({ slug }: BillingTabProps) => {
  const toast = useToast()
  const t = useT()
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
        toast.show({
          title: t('Something went wrong'),
          description: getErrorMessage(error),
          type: 'error',
        })
      })
    return () => controller.abort()
  }, [slug, toast, t])

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
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
      setIsPaying(false)
    }
  }

  const extend = async (input: BillingExtendInput) => {
    try {
      setBilling(await extendBilling(slug, input))
      toast.show({ title: t('Plan extended'), type: 'success' })
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }

  return (
    <section className={styles.section} aria-label={t('Plan')}>
      <SectionHeader
        title={t('Plan')}
        description={
          <span className={own.status}>
            <strong>{access.title}</strong> · {describeStatus(t, access)}
          </span>
        }
      />

      <section className={sheet.group} aria-label={t('Now')}>
        <SectionCaption>{t('Now')}</SectionCaption>
        <div className={styles.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Specialists')}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.masters,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxMasters ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Branches')}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.branches,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxBranches ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('SMS this month')}</span>
            <span className={styles.cellValue}>{of(t, usage.smsSent, usage.smsAllowance)}</span>
          </div>
        </div>
        {usage.smsExtra > 0 && (
          <RowNote>{t('{count} more SMS from packs', { count: usage.smsExtra })}</RowNote>
        )}
        {access.status === 'expired' && (
          <RowNote>
            {t(
              'Bookings, the schedule and the page work. The cash desk, analytics, loyalty and mailings open after payment.',
            )}
          </RowNote>
        )}
      </section>

      {isPayable && paidPlan && price && (
        // An offer, not a form: the plan and its price large on a soft wash of the accent, the
        // period beside it, one button («совсем плохой дизайн надо переделать»: a full-width
        // switch over a sentence and a full-width button read as a wall).
        <section className={own.offer} aria-label={t('Pay')}>
          <div className={own.offerHead}>
            <div className={own.offerTitle}>
              <h3 className={own.planName}>{paidPlan.title}</h3>
              <p className={own.offerMeta}>
                {t('{masters} included, {extra} for each more', {
                  masters: t.count(paidPlan.includedMasters, ['specialist', 'specialists']),
                  extra: formatPrice(t, paidPlan.extraMasterPrice),
                })}
              </p>
            </div>
            <SegmentedControl<Period>
              label={t('Term')}
              size='sm'
              value={period}
              onChange={setPeriod}
              items={[
                { value: '1', label: t('Month') },
                { value: '12', label: t('Year') },
              ]}
            />
          </div>
          <p className={own.price}>
            <span className={own.amount}>{formatPrice(t, price.amount)}</span>
            <span className={own.per}>{period === '12' ? t('a year') : t('a month')}</span>
            {period === '12' && <span className={own.gift}>{t('2 months free')}</span>}
          </p>
          {billing.isPaymentAvailable ? (
            <Button
              className={own.pay}
              size='lg'
              disabled={isPaying}
              onClick={() =>
                void pay({ kind: 'plan', planKey: paidPlan.key, months: Number(period) })
              }
            >
              {t('Pay {amount}', { amount: formatPrice(t, price.amount) })}
            </Button>
          ) : (
            <p className={own.offerMeta}>
              {t('Online payment is not available yet: write to us and we will extend it by hand.')}
            </p>
          )}
          {access.endsAt && access.status !== 'expired' && (
            <p className={own.offerMeta}>
              {t('It extends after {day}.', { day: formatDay(t, access.endsAt) })}
            </p>
          )}
        </section>
      )}

      <section className={sheet.group} aria-label={t('Plans')}>
        <SectionCaption>{t('Plans')}</SectionCaption>
        <ul className={styles.list}>
          {billing.plans.map((plan) => (
            <li key={plan.key} className={own.plan}>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {plan.title}
                  {plan.trialDays > 0 && (
                    <span className={styles.badge}>
                      {t('{count} days free', { count: plan.trialDays })}
                    </span>
                  )}
                </span>
                <span className={own.planMeta}>{plan.description}</span>
                <span className={own.planMeta}>{describePlan(t, plan)}</span>
              </span>
              <span className={styles.cellValue}>{planPrice(t, plan)}</span>
              {plan.key === access.planKey ? (
                <Check className={own.check} aria-label={t('Your plan')} />
              ) : (
                <span className={own.check} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {billing.isPaymentAvailable && billing.smsPacks.length > 0 && (
        <section className={sheet.group} aria-label={t('SMS packs')}>
          <SectionCaption>{t('SMS packs')}</SectionCaption>
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
                    <span className={styles.cellValue}>{formatPrice(t, pack.price)}</span>
                    <CaretRight className={styles.chevron} aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <RowNote>{t('Used once the month’s SMS run out, and never expire.')}</RowNote>
        </section>
      )}

      {billing.orders.length > 0 && (
        <section className={sheet.group} aria-label={t('Payments')}>
          <SectionCaption>{t('Payments')}</SectionCaption>
          <ul className={styles.list}>
            {billing.orders.map((order) => (
              <li key={order.id} className={sheet.row}>
                <span className={styles.rowBody}>
                  <span>{order.title}</span>
                  <span className={styles.rowMeta}>{formatDay(t, order.paidAt)}</span>
                </span>
                <span className={styles.cellValue}>{formatPrice(t, order.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPlatformAdmin && paidPlan && (
        <section className={sheet.group} aria-label={t('For Awaisa')}>
          <SectionCaption>{t('For Awaisa')}</SectionCaption>
          <div className={styles.list}>
            <Menu
              label={t('Extend by hand')}
              align='start'
              className={`${sheet.row} ${own.menuRow}`}
              trigger={
                <>
                  <span>{t('Extend by hand')}</span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </>
              }
            >
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 1 })}>
                {t('«{plan}» for a month', { plan: paidPlan.title })}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 12 })}>
                {t('«{plan}» for a year', { plan: paidPlan.title })}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, isLifetime: true })}>
                {t('«{plan}» for good', { plan: paidPlan.title })}
              </MenuItem>
            </Menu>
          </div>
        </section>
      )}
    </section>
  )
}
