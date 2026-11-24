'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight, Plus } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { formatAmount, formatPrice } from '@/entities/booking'
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
import { refreshBusiness } from '@/shared/api/revalidate'
import type { Catalog, LoyaltyOverview, SubscriptionPlan } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
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

// "Loyalty": what keeps clients coming back - bonuses, subscriptions, gift certificates.
// Everything is spent at the desk through the visit's outcome ("Visit outcome").
export const LoyaltyTab = ({ slug, catalog }: LoyaltyTabProps) => {
  const t = useT()
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
      // Plans sold online show on the public page: refresh it at once.
      void refreshBusiness(slug)
      toast.show({ title: t(title), type: 'success' })
      await load()
      return true
    } catch (error) {
      toast.show({ title: t('Not saved'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!data) return null

  const sale = data.certificateSale

  // The place's page shows the block: it must not wait for its cache to run out.
  const saveSale = async (input: { isOnline: boolean; amounts: number[] }) => {
    await setCertificateSale(slug, input)
    void refreshBusiness(slug)
  }

  const handleOnlineChange = (isOnline: boolean) => {
    if (isOnline && sale.amounts.length === 0) {
      setIsEditingAmounts(true)
      return
    }
    void run(
      () => saveSale({ isOnline, amounts: sale.amounts }),
      isOnline ? 'Certificates are on sale online' : 'Online sales turned off',
    )
  }

  return (
    <section className={styles.section} aria-label={t('Loyalty')}>
      <SectionHeader
        title={t('Loyalty')}
        description={t('Bonuses, passes and certificates are redeemed in “Visit outcome”.')}
      />

      <section className={sheet.group} aria-label={t('Bonuses')}>
        <SectionCaption>{t('Bonuses')}</SectionCaption>
        <div className={styles.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Give bonuses')}</span>
            <Switch
              checked={data.bonusPercent !== null}
              onCheckedChange={(checked) =>
                void run(
                  () => setBonusPercent(slug, checked ? 5 : null),
                  checked ? 'Bonuses on' : 'Bonuses off',
                )
              }
            />
          </label>
          {data.bonusPercent !== null && (
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('From each payment')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Bonus percentage')}
                  items={PERCENTS}
                  value={data.bonusPercent}
                  onValueChange={(value) =>
                    value && void run(() => setBonusPercent(slug, value), 'Saved')
                  }
                />
              </span>
            </div>
          )}
        </div>
        <RowNote>
          {data.bonusPercent !== null
            ? t(
                'Clients get {percent}% of what they pay in money and spend it on later visits: 1 bonus = 1 som.',
                { percent: data.bonusPercent },
              )
            : t(
                'Give clients part of their payment back as bonuses: they’ll come back to spend them.',
              )}
        </RowNote>
      </section>

      <section className={sheet.group} aria-label={t('Passes')}>
        <div className={sheet.groupHeader}>
          <SectionCaption isInset={false}>{t('Passes')}</SectionCaption>
          <button type='button' className={sheet.groupLink} onClick={() => setEditingPlan('new')}>
            <Plus aria-hidden /> {t('New')}
          </button>
        </div>
        {data.plans.length === 0 ? (
          <RowNote>
            {t(
              'For example, “5 haircuts for 4”: the client pays up front, visits are redeemed in “Visit outcome”.',
            )}
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
                        !plan.isActive && t('Not on sale'),
                        plan.isActive && plan.isOnline && t('Online'),
                        t.count(plan.visits, ['visit', 'visits']),
                        plan.serviceName ?? t('any service'),
                        t('{days} days', { days: plan.validDays }),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <span className={styles.cellValue}>{formatPrice(plan.price)}</span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(canSellOnline || sale.isOnline) && (
        <section className={sheet.group} aria-label={t('Certificates online')}>
          <SectionCaption>{t('Certificates online')}</SectionCaption>
          <div className={styles.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Sell certificates online')}</span>
              <Switch checked={sale.isOnline} onCheckedChange={handleOnlineChange} />
            </label>
            {sale.isOnline && (
              <button
                type='button'
                className={`${sheet.row} ${own.amountsRow}`}
                onClick={() => setIsEditingAmounts(true)}
              >
                <span className={sheet.rowLabel}>{t('Amounts')}</span>
                <span className={own.amounts}>
                  {sale.amounts.map((amount) => formatAmount(amount)).join(' · ')} {t('som')}
                </span>
                <CaretRight className={styles.chevron} aria-hidden />
              </button>
            )}
          </div>
          <RowNote>
            {t(
              sale.isOnline
                ? 'Clients buy on the place’s page and pay by card. The certificate appears below once paid; the code goes to the buyer and the recipient.'
                : 'A gift certificate on the place’s page: the client picks an amount, pays by card and gets a code.',
            )}
          </RowNote>
        </section>
      )}

      <section className={sheet.group} aria-label={t('Certificates')}>
        <div className={sheet.groupHeader}>
          <SectionCaption isInset={false}>{t('Certificates')}</SectionCaption>
          <button type='button' className={sheet.groupLink} onClick={() => setIsIssuing(true)}>
            <Plus aria-hidden /> {t('Issue')}
          </button>
        </div>
        {data.certificates.length === 0 ? (
          <RowNote>
            {t(
              'A gift certificate for an amount: the client spends it in parts, the balance shows by its code.',
            )}
          </RowNote>
        ) : (
          <ul className={styles.list}>
            {data.certificates.map((certificate) => (
              <li key={certificate.id} className={own.certificate}>
                <span className={own.code}>{certificate.code}</span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{certificate.recipient || t('No name')}</span>
                  <span className={styles.rowMeta}>
                    {certificate.expiresOn
                      ? t('until {date}', {
                          date: certificate.expiresOn.split('-').reverse().join('.'),
                        })
                      : t('no expiry')}
                  </span>
                </span>
                <span className={styles.cellValue}>
                  {formatPrice(certificate.balance)}
                  {certificate.balance !== certificate.amount && (
                    <span className={own.of}>
                      {' '}
                      {t('of {amount}', { amount: formatPrice(certificate.amount) })}
                    </span>
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
              'Pass saved',
            )
          }
          onDelete={
            editingPlan === 'new'
              ? undefined
              : () => void run(() => deleteSubscriptionPlan(slug, editingPlan.id), 'Deleted')
          }
        />
      )}
      {isEditingAmounts && (
        <CertificateAmountsSheet
          amounts={sale.amounts}
          onClose={() => setIsEditingAmounts(false)}
          onSave={(amounts) =>
            run(
              () => saveSale({ isOnline: true, amounts }),
              sale.isOnline ? 'Amounts saved' : 'Certificates are on sale online',
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
                title: t('Certificate {code}', { code: certificate.code }),
                description: t('{amount}: tell the client the code', {
                  amount: formatPrice(certificate.amount),
                }),
                type: 'success',
              })
              await load()
              return true
            } catch (error) {
              toast.show({
                title: t('Something went wrong'),
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
