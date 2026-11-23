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

const LOCALES: Record<Translate['language'], string> = { ru: 'ru-RU', ky: 'ky-KG', en: 'en-GB' }
const amountFormat = new Intl.NumberFormat('ru-RU')

const formatDay = (t: Translate, iso: string) =>
  new Intl.DateTimeFormat(LOCALES[t.language], {
    day: 'numeric',
    month: 'long',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(iso))

const formatPrice = (t: Translate, value: number) =>
  t('{amount} сом', { amount: amountFormat.format(value) })

/** «Пробный период до 21 декабря», «Оплачен до …», «Бессрочно», «Бесплатно». */
const describeStatus = (t: Translate, access: PlanAccess) => {
  const until = access.endsAt ? formatDay(t, access.endsAt) : ''
  const texts: Record<PlanAccess['status'], string> = {
    lifetime: t('бессрочно'),
    active: t('оплачен до {day}', { day: until }),
    trial: t('пробный период до {day}', { day: until }),
    free: t('бесплатно'),
    expired: access.upgradeTitle
      ? t('«{plan}» закончился {day}', { plan: access.upgradeTitle, day: until })
      : t('закончился {day}', { day: until }),
  }
  return texts[access.status]
}

const of = (t: Translate, used: number, limit: number | null) =>
  limit === null ? String(used) : t('{used} из {limit}', { used, limit })

/** One line of what a plan gives: masters, branches and SMS. */
const describePlan = (t: Translate, plan: BillingPlan) => {
  const masters =
    plan.maxMasters === null
      ? t('мастера без ограничений')
      : t('до {masters}', {
          masters: t.count(plan.maxMasters, ['мастера', 'мастеров', 'мастеров']),
        })
  const branches =
    plan.maxBranches === null
      ? t('филиалы без ограничений')
      : t.count(plan.maxBranches, ['филиал', 'филиала', 'филиалов'])
  const sms =
    plan.smsPerMonth === null
      ? t('SMS без ограничений')
      : plan.smsPerMaster > 0
        ? t('{count} SMS на мастера', { count: plan.smsPerMaster })
        : t('{count} SMS в месяц', { count: plan.smsPerMonth })
  return `${masters} · ${branches} · ${sms}`
}

const planPrice = (t: Translate, plan: BillingPlan) =>
  plan.monthlyPrice === 0
    ? t('Бесплатно')
    : t('{price} в месяц', { price: formatPrice(t, plan.monthlyPrice) })

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
          title: t('Не получилось'),
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
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
      setIsPaying(false)
    }
  }

  const extend = async (input: BillingExtendInput) => {
    try {
      setBilling(await extendBilling(slug, input))
      toast.show({ title: t('Тариф продлён'), type: 'success' })
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.section} aria-label={t('Тариф')}>
      <SectionHeader
        title={t('Тариф')}
        description={
          <span className={own.status}>
            <strong>{access.title}</strong> · {describeStatus(t, access)}
          </span>
        }
      />

      <section className={sheet.group} aria-label={t('Сейчас')}>
        <SectionCaption>{t('Сейчас')}</SectionCaption>
        <div className={styles.list}>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Мастера')}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.masters,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxMasters ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Филиалы')}</span>
            <span className={styles.cellValue}>
              {of(
                t,
                usage.branches,
                billing.plans.find((plan) => plan.key === access.planKey)?.maxBranches ?? null,
              )}
            </span>
          </div>
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>{t('SMS в этом месяце')}</span>
            <span className={styles.cellValue}>{of(t, usage.smsSent, usage.smsAllowance)}</span>
          </div>
        </div>
        {usage.smsExtra > 0 && (
          <RowNote>{t('Ещё {count} SMS из пакетов', { count: usage.smsExtra })}</RowNote>
        )}
        {access.status === 'expired' && (
          <RowNote>
            {t(
              'Записи, расписание и страница работают. Касса, аналитика, лояльность и рассылки откроются после оплаты.',
            )}
          </RowNote>
        )}
      </section>

      {isPayable && paidPlan && price && (
        // An offer, not a form: the plan and its price large on a soft wash of the accent, the
        // period beside it, one button («совсем плохой дизайн надо переделать»: a full-width
        // switch over a sentence and a full-width button read as a wall).
        <section className={own.offer} aria-label={t('Оплатить')}>
          <div className={own.offerHead}>
            <div className={own.offerTitle}>
              <h3 className={own.planName}>{paidPlan.title}</h3>
              <p className={own.offerMeta}>
                {t('{masters} включено, ещё {extra} за каждого', {
                  masters: t.count(paidPlan.includedMasters, ['мастер', 'мастера', 'мастеров']),
                  extra: formatPrice(t, paidPlan.extraMasterPrice),
                })}
              </p>
            </div>
            <SegmentedControl<Period>
              label={t('Срок')}
              size='sm'
              value={period}
              onChange={setPeriod}
              items={[
                { value: '1', label: t('Месяц') },
                { value: '12', label: t('Год') },
              ]}
            />
          </div>
          <p className={own.price}>
            <span className={own.amount}>{formatPrice(t, price.amount)}</span>
            <span className={own.per}>{period === '12' ? t('в год') : t('в месяц')}</span>
            {period === '12' && <span className={own.gift}>{t('2 месяца в подарок')}</span>}
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
              {t('Оплатить {amount}', { amount: formatPrice(t, price.amount) })}
            </Button>
          ) : (
            <p className={own.offerMeta}>
              {t('Онлайн-оплата пока недоступна: напишите нам, продлим вручную.')}
            </p>
          )}
          {access.endsAt && access.status !== 'expired' && (
            <p className={own.offerMeta}>
              {t('Продлится после {day}.', { day: formatDay(t, access.endsAt) })}
            </p>
          )}
        </section>
      )}

      <section className={sheet.group} aria-label={t('Тарифы')}>
        <SectionCaption>{t('Тарифы')}</SectionCaption>
        <ul className={styles.list}>
          {billing.plans.map((plan) => (
            <li key={plan.key} className={own.plan}>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>
                  {plan.title}
                  {plan.trialDays > 0 && (
                    <span className={styles.badge}>
                      {t('{count} дней бесплатно', { count: plan.trialDays })}
                    </span>
                  )}
                </span>
                <span className={own.planMeta}>{plan.description}</span>
                <span className={own.planMeta}>{describePlan(t, plan)}</span>
              </span>
              <span className={styles.cellValue}>{planPrice(t, plan)}</span>
              {plan.key === access.planKey ? (
                <Check className={own.check} aria-label={t('Ваш тариф')} />
              ) : (
                <span className={own.check} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {billing.isPaymentAvailable && billing.smsPacks.length > 0 && (
        <section className={sheet.group} aria-label={t('Пакеты SMS')}>
          <SectionCaption>{t('Пакеты SMS')}</SectionCaption>
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
          <RowNote>{t('Тратятся, когда SMS месяца закончились, и не сгорают.')}</RowNote>
        </section>
      )}

      {billing.orders.length > 0 && (
        <section className={sheet.group} aria-label={t('Оплаты')}>
          <SectionCaption>{t('Оплаты')}</SectionCaption>
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
        <section className={sheet.group} aria-label={t('Для Awaisa')}>
          <SectionCaption>{t('Для Awaisa')}</SectionCaption>
          <div className={styles.list}>
            <Menu
              label={t('Продлить вручную')}
              align='start'
              className={`${sheet.row} ${own.menuRow}`}
              trigger={
                <>
                  <span>{t('Продлить вручную')}</span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </>
              }
            >
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 1 })}>
                {t('«{plan}» на месяц', { plan: paidPlan.title })}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, months: 12 })}>
                {t('«{plan}» на год', { plan: paidPlan.title })}
              </MenuItem>
              <MenuItem onClick={() => void extend({ planKey: paidPlan.key, isLifetime: true })}>
                {t('«{plan}» бессрочно', { plan: paidPlan.title })}
              </MenuItem>
            </Menu>
          </div>
        </section>
      )}
    </section>
  )
}
