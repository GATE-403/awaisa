'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
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
import { type Format, type Translate, useFormat } from '@/shared/i18n'
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

const formatDay = (format: Format, iso: string) =>
  format.date(iso, { day: 'numeric', month: 'long' })

/** "Trial until 21 December", "Paid until …", "No end date", "Free". */
const describeStatus = (t: Translate, format: Format, access: PlanAccess) => {
  const until = access.endsAt ? formatDay(format, access.endsAt) : ''
  const texts: Record<PlanAccess['status'], string> = {
    lifetime: t(msg`for good`),
    active: t(msg`paid until ${ph({ day: until })}`),
    trial: t(msg`trial until ${ph({ day: until })}`),
    free: t(msg`free`),
    expired: access.upgradeTitle
      ? t(msg`“${ph({ plan: access.upgradeTitle })}” ended ${ph({ day: until })}`)
      : t(msg`ended ${ph({ day: until })}`),
  }
  return texts[access.status]
}

const of = (t: Translate, used: number, limit: number | null) =>
  limit === null ? String(used) : t(msg`${used} of ${limit}`)

/** One line of what a plan gives: masters, branches and SMS. */
const describePlan = (t: Translate, plan: BillingPlan) => {
  const masters =
    plan.maxMasters === null
      ? t(msg`unlimited specialists`)
      : t(
          msg`${plural(plan.maxMasters, { one: 'up to # specialist', other: 'up to # specialists' })}`,
        )
  const branches =
    plan.maxBranches === null
      ? t(msg`unlimited branches`)
      : t(msg`${plural(plan.maxBranches, { one: '# branch', other: '# branches' })}`)
  const sms =
    plan.smsPerMonth === null
      ? t(msg`unlimited SMS`)
      : plan.smsPerMaster > 0
        ? t(msg`${ph({ count: plan.smsPerMaster })} SMS per specialist`)
        : t(msg`${ph({ count: plan.smsPerMonth })} SMS a month`)
  return `${masters} · ${branches} · ${sms}`
}

const planPrice = (t: Translate, format: Format, plan: BillingPlan) =>
  plan.monthlyPrice === 0
    ? t(msg`Free`)
    : t(msg`${ph({ price: format.price(plan.monthlyPrice) })} a month`)

// "Settings → Plan": what the business is on and until when, what it uses of it, paying for
// the paid plan (a month or a year) and SMS packs through the same checkout as deposits.
export const BillingTab = ({ slug }: BillingTabProps) => {
  const format = useFormat()
  const toast = useToast()
  const { t } = useLingui()
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
          title: t`Something went wrong`,
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
        title: t`Something went wrong`,
        description: getErrorMessage(error),
        type: 'error',
      })
      setIsPaying(false)
    }
  }

  const extend = async (input: BillingExtendInput) => {
    try {
      setBilling(await extendBilling(slug, input))
      toast.show({ title: t`Plan extended`, type: 'success' })
    } catch (error) {
      toast.show({
        title: t`Something went wrong`,
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }

  return (
    <section className={styles.section} aria-label={t`Plan`}>
      <SectionHeader
        title={t`Plan`}
        description={
          <span className={own.status}>
            <strong>{access.title}</strong> · {describeStatus(t, format, access)}
          </span>
        }
      />

      <section className={sheet.group} aria-label={t`Now`}>
        <SectionCaption>{t`Now`}</SectionCaption>
        <div className={styles.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Specialists`}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.masters,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxMasters ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t`Branches`}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.branches,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxBranches ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t`SMS this month`}</span>
            <span className={styles.cellValue}>{of(t, usage.smsSent, usage.smsAllowance)}</span>
          </div>
        </div>
        {usage.smsExtra > 0 && (
          <RowNote>{t`${ph({ count: usage.smsExtra })} more SMS from packs`}</RowNote>
        )}
        {access.status === 'expired' && (
          <RowNote>
            {t`Bookings, the schedule and the page work. The cash desk, analytics, loyalty and mailings open after payment.`}
          </RowNote>
        )}
      </section>

      {isPayable && paidPlan && price && (
        // An offer, not a form: the plan and its price large on a soft wash of the accent, the
        // period beside it, one button ("really bad design, needs redoing": a full-width
        // switch over a sentence and a full-width button read as a wall).
        <section className={own.offer} aria-label={t`Pay`}>
          <div className={own.offerHead}>
            <div className={own.offerTitle}>
              <h3 className={own.planName}>{paidPlan.title}</h3>
              <p className={own.offerMeta}>
                {t`${plural(paidPlan.includedMasters, { one: '# specialist included', other: '# specialists included' })}, ${ph({ extra: format.price(paidPlan.extraMasterPrice) })} for each more`}
              </p>
            </div>
            <SegmentedControl<Period>
              label={t`Term`}
              size='sm'
              value={period}
              onChange={setPeriod}
              items={[
                { value: '1', label: t`Month` },
                { value: '12', label: t`Year` },
              ]}
            />
          </div>
          <p className={own.price}>
            <span className={own.amount}>{format.price(price.amount)}</span>
            <span className={own.per}>{period === '12' ? t`a year` : t`a month`}</span>
            {period === '12' && <span className={own.gift}>{t`2 months free`}</span>}
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
              {t`Pay ${ph({ amount: format.price(price.amount) })}`}
            </Button>
          ) : (
            <p className={own.offerMeta}>
              {t`Online payment is not available yet: write to us and we will extend it by hand.`}
            </p>
          )}
          {access.endsAt && access.status !== 'expired' && (
            <p className={own.offerMeta}>
              {t`It extends after ${ph({ day: formatDay(format, access.endsAt) })}.`}
            </p>
          )}
        </section>
      )}

      <section className={sheet.group} aria-label={t`Plans`}>
        <SectionCaption>{t`Plans`}</SectionCaption>
        <ul className={styles.list}>
          {billing.plans.map((plan) => (
            <li key={plan.key} className={own.plan}>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {plan.title}
                  {plan.trialDays > 0 && (
                    <span className={styles.badge}>
                      {t`${ph({ count: plan.trialDays })} days free`}
                    </span>
                  )}
                </span>
                <span className={own.planMeta}>{plan.description}</span>
                <span className={own.planMeta}>{describePlan(t, plan)}</span>
              </span>
              <span className={styles.cellValue}>{planPrice(t, format, plan)}</span>
              {plan.key === access.planKey ? (
                <Check className={own.check} aria-label={t`Your plan`} />
              ) : (
                <span className={own.check} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {billing.isPaymentAvailable && billing.smsPacks.length > 0 && (
        <section className={sheet.group} aria-label={t`SMS packs`}>
          <SectionCaption>{t`SMS packs`}</SectionCaption>
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
                    <span className={styles.cellValue}>{format.price(pack.price)}</span>
                    <CaretRight className={styles.chevron} aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <RowNote>{t`Used once the month’s SMS run out, and never expire.`}</RowNote>
        </section>
      )}

      {billing.orders.length > 0 && (
        <section className={sheet.group} aria-label={t`Payments`}>
          <SectionCaption>{t`Payments`}</SectionCaption>
          <ul className={styles.list}>
            {billing.orders.map((order) => (
              <li key={order.id} className={sheet.row}>
                <span className={styles.rowBody}>
                  <span>{order.title}</span>
                  <span className={styles.rowMeta}>{formatDay(format, order.paidAt)}</span>
                </span>
                <span className={styles.cellValue}>{format.price(order.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isPlatformAdmin && paidPlan && (
        <section className={sheet.group} aria-label={t`For Awaisa`}>
          <SectionCaption>{t`For Awaisa`}</SectionCaption>
          <div className={styles.list}>
            <Menu
              label={t`Extend by hand`}
              align='start'
              className={`${sheet.row} ${own.menuRow}`}
              trigger={
                <>
                  <span>{t`Extend by hand`}</span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </>
              }
            >
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 1 })}>
                {t`“${ph({ plan: paidPlan.title })}” for a month`}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 12 })}>
                {t`“${ph({ plan: paidPlan.title })}” for a year`}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, isLifetime: true })}>
                {t`“${ph({ plan: paidPlan.title })}” for good`}
              </MenuItem>
            </Menu>
          </div>
        </section>
      )}
    </section>
  )
}
