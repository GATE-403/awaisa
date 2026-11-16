'use client'

import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import { useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClientLoyalty, getLoyalty, sellSubscription } from '@/shared/api/clientApi'
import type { ClientLoyalty, SubscriptionPlan } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface ClientLoyaltySectionProps {
  slug: string
  phone: string
}

const formatDate = (date: string) => date.split('-').reverse().join('.')

// The client's bonuses, subscriptions and certificates; a subscription is sold right here.
export const ClientLoyaltySection = ({ slug, phone }: ClientLoyaltySectionProps) => {
  const toast = useToast()
  const [loyalty, setLoyalty] = useState<ClientLoyalty | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])

  useEffect(() => {
    const controller = new AbortController()
    getClientLoyalty(slug, phone, controller.signal)
      .then(setLoyalty)
      .catch(() => undefined)
    getLoyalty(slug, controller.signal)
      .then((overview) => setPlans(overview.plans.filter((plan) => plan.isActive)))
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug, phone])

  const sell = async (planId: string) => {
    try {
      setLoyalty(await sellSubscription(slug, phone, planId))
      toast.show({ title: 'Абонемент оформлен', type: 'success' })
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  if (!loyalty) return null
  const hasAnything =
    loyalty.bonusPercent !== null ||
    loyalty.bonusBalance > 0 ||
    loyalty.subscriptions.length > 0 ||
    loyalty.certificates.length > 0 ||
    plans.length > 0
  if (!hasAnything) return null

  return (
    <section className={sheet.group} aria-label='Лояльность'>
      <SectionCaption>Лояльность</SectionCaption>
      <div className={sheet.list}>
        {(loyalty.bonusPercent !== null || loyalty.bonusBalance > 0) && (
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Бонусы</span>
            <span>{formatPrice(loyalty.bonusBalance)}</span>
          </div>
        )}
        {loyalty.subscriptions.map((subscription) => (
          <div key={subscription.id} className={sheet.row}>
            <span className={sheet.rowLabel}>{subscription.title}</span>
            <span>
              {pluralize(subscription.visitsLeft, ['визит', 'визита', 'визитов'])} · до{' '}
              {formatDate(subscription.expiresOn)}
            </span>
          </div>
        ))}
        {loyalty.certificates.map((certificate) => (
          <div key={certificate.id} className={sheet.row}>
            <span className={sheet.rowLabel}>Сертификат {certificate.code}</span>
            <span>{formatPrice(certificate.balance)}</span>
          </div>
        ))}
        {plans.length > 0 && (
          <div className={sheet.row}>
            <span className={sheet.rowLabel}>Продать абонемент</span>
            <span className={sheet.rowControl}>
              <Select
                variant='plain'
                aria-label='Продать абонемент'
                placeholder='Выбрать'
                items={plans.map((plan) => ({
                  value: plan.id,
                  label: `${plan.title} · ${formatPrice(plan.price)}`,
                }))}
                value={null}
                onValueChange={(value) => value && void sell(value)}
              />
            </span>
          </div>
        )}
      </div>
    </section>
  )
}
