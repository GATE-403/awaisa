'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import {
  deleteSubscriptionPlan,
  getLoyalty,
  getPaymentConfig,
  issueCertificate,
  saveSubscriptionPlan,
  setBonusPercent,
  setCertificateSale,
} from '@/shared/api/clientApi'
import type { Catalog, LoyaltyOverview, SubscriptionPlan } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { CertificateAmountsSheet } from './CertificateAmountsSheet'
import { CertificateSheet } from './CertificateSheet'
import own from './LoyaltyTab.module.css'
import { PlanSheet } from './PlanSheet'

interface LoyaltyTabProps {
  slug: string
  catalog: Catalog
}

const PERCENTS = [3, 5, 7, 10, 15].map((value) => ({ value, label: `${value}%` }))

// «Лояльность»: what keeps clients coming back — bonuses, subscriptions, gift certificates.
// Everything is spent at the desk through the visit's outcome («Итог визита»).
export const LoyaltyTab = ({ slug, catalog }: LoyaltyTabProps) => {
  const toast = useToast()
  const [data, setData] = useState<LoyaltyOverview | null>(null)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | 'new' | null>(null)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isEditingAmounts, setIsEditingAmounts] = useState(false)
  const [canSellOnline, setCanSellOnline] = useState(false)

  const load = () =>
    getLoyalty(slug)
      .then(setData)
      .catch(() => undefined)

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per business
  useEffect(() => {
    void load()
  }, [slug])

  // Selling online needs an acquirer: without one the switch is not offered.
  useEffect(() => {
    const controller = new AbortController()
    getPaymentConfig(controller.signal)
      .then((config) => setCanSellOnline(config.isAvailable))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  const run = async (action: () => Promise<unknown>, title: string) => {
    try {
      await action()
      toast.show({ title, type: 'success' })
      await load()
      return true
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!data) return null

  const sale = data.certificateSale

  const handleOnlineChange = (isOnline: boolean) => {
    if (isOnline && sale.amounts.length === 0) {
      setIsEditingAmounts(true)
      return
    }
    void run(
      () => setCertificateSale(slug, { isOnline, amounts: sale.amounts }),
      isOnline ? 'Сертификаты продаются онлайн' : 'Онлайн-продажа выключена',
    )
  }

  return (
    <section className={styles.section} aria-label='Лояльность'>
      <SectionHeader
        title='Лояльность'
        description='Бонусы, абонементы и сертификаты списываются в «Итоге визита».'
      />

      <section className={sheet.group} aria-label='Бонусы'>
        <SectionCaption>Бонусы</SectionCaption>
        <div className={styles.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Начислять бонусы</span>
            <Switch
              checked={data.bonusPercent !== null}
              onCheckedChange={(checked) =>
                void run(
                  () => setBonusPercent(slug, checked ? 5 : null),
                  checked ? 'Бонусы включены' : 'Бонусы выключены',
                )
              }
            />
          </label>
          {data.bonusPercent !== null && (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>С каждой оплаты</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label='Процент бонусов'
                  items={PERCENTS}
                  value={data.bonusPercent}
                  onValueChange={(value) =>
                    value && void run(() => setBonusPercent(slug, value), 'Сохранено')
                  }
                />
              </span>
            </div>
          )}
        </div>
        <RowNote>
          {data.bonusPercent !== null
            ? `Клиент получает ${data.bonusPercent}% от оплаты деньгами и тратит их на следующих визитах: 1 бонус = 1 сом.`
            : 'Возвращайте клиенту часть оплаты бонусами: он придёт снова, чтобы их потратить.'}
        </RowNote>
      </section>

      <section className={sheet.group} aria-label='Абонементы'>
        <div className={sheet.groupHeader}>
          <SectionCaption isInset={false}>Абонементы</SectionCaption>
          <button type='button' className={sheet.groupLink} onClick={() => setEditingPlan('new')}>
            <Plus weight='bold' aria-hidden /> Новый
          </button>
        </div>
        {data.plans.length === 0 ? (
          <RowNote>
            Например, «5 стрижек за 4»: клиент платит сразу, визиты списываются в «Итоге визита».
          </RowNote>
        ) : (
          <ul className={styles.list}>
            {data.plans.map((plan) => (
              <li key={plan.id}>
                <button
                  type='button'
                  className={styles.serviceRow}
                  data-hidden={!plan.isActive || undefined}
                  onClick={() => setEditingPlan(plan)}
                >
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{plan.title}</span>
                    <span className={styles.rowMeta}>
                      {[
                        !plan.isActive && 'Не продаётся',
                        pluralize(plan.visits, ['визит', 'визита', 'визитов']),
                        plan.serviceName ?? 'любая услуга',
                        `${plan.validDays} дн.`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={styles.cellValue}>{formatPrice(plan.price)}</span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(canSellOnline || sale.isOnline) && (
        <section className={sheet.group} aria-label='Сертификаты онлайн'>
          <SectionCaption>Сертификаты онлайн</SectionCaption>
          <div className={styles.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Продавать сертификаты онлайн</span>
              <Switch checked={sale.isOnline} onCheckedChange={handleOnlineChange} />
            </label>
            {sale.isOnline && (
              <button type='button' className={sheet.row} onClick={() => setIsEditingAmounts(true)}>
                <span className={sheet.rowLabel}>Суммы</span>
                <span className={own.amounts}>
                  {sale.amounts.map((amount) => formatPrice(amount)).join(' · ')}
                </span>
                <CaretRight className={styles.chevron} weight='bold' aria-hidden />
              </button>
            )}
          </div>
          <RowNote>
            {sale.isOnline
              ? 'Клиенты покупают на странице места и платят картой. Сертификат появится ниже после оплаты, код придёт покупателю и получателю.'
              : 'Подарочный сертификат на странице места: клиент выбирает сумму, платит картой и получает код.'}
          </RowNote>
        </section>
      )}

      <section className={sheet.group} aria-label='Сертификаты'>
        <div className={sheet.groupHeader}>
          <SectionCaption isInset={false}>Сертификаты</SectionCaption>
          <button type='button' className={sheet.groupLink} onClick={() => setIsIssuing(true)}>
            <Plus weight='bold' aria-hidden /> Выпустить
          </button>
        </div>
        {data.certificates.length === 0 ? (
          <RowNote>
            Подарочный сертификат на сумму: клиент тратит его частями, остаток виден по коду.
          </RowNote>
        ) : (
          <ul className={styles.list}>
            {data.certificates.map((certificate) => (
              <li key={certificate.id} className={own.certificate}>
                <span className={own.code}>{certificate.code}</span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{certificate.recipient || 'Без имени'}</span>
                  <span className={styles.rowMeta}>
                    {certificate.expiresOn
                      ? `до ${certificate.expiresOn.split('-').reverse().join('.')}`
                      : 'бессрочный'}
                  </span>
                </span>
                <span className={styles.cellValue}>
                  {formatPrice(certificate.balance)}
                  {certificate.balance !== certificate.amount && (
                    <span className={own.of}> из {formatPrice(certificate.amount)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingPlan && (
        <PlanSheet
          key={editingPlan === 'new' ? 'new' : editingPlan.id}
          plan={editingPlan === 'new' ? null : editingPlan}
          services={catalog.services}
          onClose={() => setEditingPlan(null)}
          onSave={(input) =>
            run(
              () =>
                saveSubscriptionPlan(
                  slug,
                  input,
                  editingPlan === 'new' ? undefined : editingPlan.id,
                ),
              'Абонемент сохранён',
            )
          }
          onDelete={
            editingPlan === 'new'
              ? undefined
              : () => void run(() => deleteSubscriptionPlan(slug, editingPlan.id), 'Удалено')
          }
        />
      )}
      {isEditingAmounts && (
        <CertificateAmountsSheet
          amounts={sale.amounts}
          onClose={() => setIsEditingAmounts(false)}
          onSave={(amounts) =>
            run(
              () => setCertificateSale(slug, { isOnline: true, amounts }),
              sale.isOnline ? 'Суммы сохранены' : 'Сертификаты продаются онлайн',
            )
          }
        />
      )}
      {isIssuing && (
        <CertificateSheet
          onClose={() => setIsIssuing(false)}
          onIssue={async (input) => {
            try {
              const certificate = await issueCertificate(slug, input)
              toast.show({
                title: `Сертификат ${certificate.code}`,
                description: `${formatPrice(certificate.amount)} — назовите код клиенту`,
                type: 'success',
              })
              await load()
              return true
            } catch (error) {
              toast.show({
                title: 'Не получилось',
                description: getErrorMessage(error),
                type: 'error',
              })
              return false
            }
          }}
        />
      )}
    </section>
  )
}
