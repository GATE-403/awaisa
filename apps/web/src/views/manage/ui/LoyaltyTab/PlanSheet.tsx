'use client'

import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { type FormEvent, useEffect, useState } from 'react'
import { getPaymentConfig } from '@/shared/api/clientApi'
import type { Service, SubscriptionPlan, SubscriptionPlanInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'

interface PlanSheetProps {
  plan: SubscriptionPlan | null
  services: Service[]
  onClose: () => void
  onSave: (input: SubscriptionPlanInput) => Promise<boolean>
  onDelete?: () => void
}

const FORM_ID = 'plan-form'

const VALIDITY_DAYS = [30, 60, 90, 180, 365]
const YEAR_DAYS = 365

export const PlanSheet = ({ plan, services, onClose, onSave, onDelete }: PlanSheetProps) => {
  const t = useT()
  const [title, setTitle] = useState(plan?.title ?? '')
  const [serviceId, setServiceId] = useState<string>(plan?.serviceId ?? 'any')
  const [visits, setVisits] = useState(String(plan?.visits ?? 5))
  const [price, setPrice] = useState(plan ? String(plan.price) : '')
  const [validDays, setValidDays] = useState(plan?.validDays ?? 90)
  const [isActive, setIsActive] = useState(plan?.isActive ?? true)
  const [isOnline, setIsOnline] = useState(plan?.isOnline ?? false)
  // Sold online only through the acquirer: without one the switch is not drawn.
  const [canPayOnline, setCanPayOnline] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isValid = title.trim() !== '' && Number(visits) >= 1 && price !== ''
  const service = services.find((item) => item.id === serviceId)
  const fullPrice = service ? service.price * Number(visits || 0) : null
  const validity = VALIDITY_DAYS.map((days) => ({
    value: days,
    label: days === YEAR_DAYS ? t('Year') : t('{days} days', { days }),
  }))

  useEffect(() => {
    const controller = new AbortController()
    getPaymentConfig(controller.signal)
      .then((config) => setCanPayOnline(config.isAvailable))
      .catch(() => setCanPayOnline(false))
    return () => controller.abort()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    setIsSaving(true)
    const saved = await onSave({
      title: title.trim(),
      serviceId: serviceId === 'any' ? null : serviceId,
      visits: Number(visits),
      price: Number(price),
      validDays,
      isActive,
      isOnline: isOnline && canPayOnline,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  return (
    <Sheet
      title={t(plan ? 'Pass' : 'New pass')}
      onClose={onClose}
      action={{ label: t('Save'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Pass')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Name')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Pass name')}
                  placeholder={t('5 haircuts for 4')}
                  value={title}
                  onValueChange={setTitle}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Service')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Pass service')}
                  items={[
                    { value: 'any', label: t('Any') },
                    ...services.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                  value={serviceId}
                  onValueChange={(value) => value && setServiceId(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Visits')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Visits')}
                  inputMode='numeric'
                  value={visits}
                  onValueChange={(value) => setVisits(value.replace(/\D/g, '').slice(0, 3))}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Price')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Pass price, som')}
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('som')}</span>
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Valid for')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Validity')}
                  items={validity}
                  value={validDays}
                  onValueChange={(value) => value && setValidDays(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('On sale')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
            {canPayOnline && isActive && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Sell online')}</span>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} />
              </label>
            )}
          </div>
          {fullPrice !== null && price !== '' && Number(price) < fullPrice && (
            <p className={sheet.groupFooter}>
              {t('Separately, {visits} visits cost {full} som: the client saves {saving} som.', {
                visits: Number(visits),
                full: fullPrice.toLocaleString('ru-RU'),
                saving: (fullPrice - Number(price)).toLocaleString('ru-RU'),
              })}
            </p>
          )}
          {canPayOnline && isActive && isOnline && (
            <p className={sheet.groupFooter}>
              {t(
                'Clients buy it on the place’s page and when booking, paying by card. The pass is theirs once paid.',
              )}
            </p>
          )}
        </section>
        {onDelete && (
          <HoldButton
            onConfirm={() => {
              onDelete()
              onClose()
            }}
          >
            {t('Delete pass')}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
