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
    label: days === YEAR_DAYS ? t('Год') : t('{days} дней', { days }),
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
      title={t(plan ? 'Абонемент' : 'Новый абонемент')}
      onClose={onClose}
      action={{ label: t('Сохранить'), form: FORM_ID, disabled: !isValid || isSaving }}
    >
      <form id={FORM_ID} className={sheet.form} onSubmit={handleSubmit}>
        <section className={sheet.group} aria-label={t('Абонемент')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Название')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Название абонемента')}
                  placeholder={t('5 стрижек за 4')}
                  value={title}
                  onValueChange={setTitle}
                />
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Услуга')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Услуга абонемента')}
                  items={[
                    { value: 'any', label: t('Любая') },
                    ...services.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                  value={serviceId}
                  onValueChange={(value) => value && setServiceId(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Визитов')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Визитов')}
                  inputMode='numeric'
                  value={visits}
                  onValueChange={(value) => setVisits(value.replace(/\D/g, '').slice(0, 3))}
                />
              </span>
            </label>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Цена')}</span>
              <span className={sheet.rowControl}>
                <Input
                  variant='plain'
                  aria-label={t('Цена абонемента, сом')}
                  inputMode='numeric'
                  placeholder='0'
                  value={maskAmountInput(price)}
                  onValueChange={(value) => setPrice(value.replace(/\D/g, ''))}
                />
                <span className={sheet.suffix}>{t('сом')}</span>
              </span>
            </label>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Действует')}</span>
              <span className={sheet.rowControl}>
                <Select
                  variant='plain'
                  aria-label={t('Срок действия')}
                  items={validity}
                  value={validDays}
                  onValueChange={(value) => value && setValidDays(value)}
                />
              </span>
            </div>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Продаётся')}</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
            {canPayOnline && isActive && (
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Продавать онлайн')}</span>
                <Switch checked={isOnline} onCheckedChange={setIsOnline} />
              </label>
            )}
          </div>
          {fullPrice !== null && price !== '' && Number(price) < fullPrice && (
            <p className={sheet.groupFooter}>
              {t(
                'По отдельности {visits} визитов стоят {full} сом - клиент экономит {saving} сом.',
                {
                  visits: Number(visits),
                  full: fullPrice.toLocaleString('ru-RU'),
                  saving: (fullPrice - Number(price)).toLocaleString('ru-RU'),
                },
              )}
            </p>
          )}
          {canPayOnline && isActive && isOnline && (
            <p className={sheet.groupFooter}>
              {t(
                'Клиенты купят его на странице места и при записи, оплатив картой. Абонемент появится у клиента после оплаты.',
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
            {t('Удалить абонемент')}
          </HoldButton>
        )}
      </form>
    </Sheet>
  )
}
