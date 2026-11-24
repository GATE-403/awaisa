'use client'

import { Input } from '@awaisa/ui/Input'
import { Menu, MenuItem, MenuSeparator } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { CaretUpDown, Check, Plus } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getMasterPay, setMasterPay } from '@/shared/api/clientApi'
import type {
  MasterPayScheme,
  PayRateKind,
  SalaryKind,
  Service,
  Specialist,
} from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskAmountInput } from '@/shared/lib/inputMasks'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './MasterPaySheet.module.css'

interface MasterPaySheetProps {
  slug: string
  master: Pick<Specialist, 'id' | 'name' | 'serviceIds'>
  services: Service[]
  onClose: () => void
}

type RateDraft = { serviceId: string; kind: PayRateKind; value: string }
type Draft = {
  percent: string
  rates: RateDraft[]
  salaryKind: SalaryKind | 'none'
  salary: string
  minimum: string
  productsPercent: string
}

const SALARY_ITEMS: { value: SalaryKind | 'none'; label: string }[] = [
  { value: 'none', label: 'No' },
  { value: 'month', label: 'Per month' },
  { value: 'day', label: 'Per working day' },
]

const UNIT: Record<PayRateKind, string> = { percent: '%', fixed: 'som' }

const digits = (value: string) => value.replace(/\D/g, '')
const toNumber = (value: string) => (digits(value) === '' ? null : Number(digits(value)))
const toText = (value: number | null) => (value === null ? '' : maskAmountInput(String(value)))

const toDraft = (scheme: MasterPayScheme): Draft => ({
  percent: scheme.percent === null ? '' : String(scheme.percent),
  rates: scheme.rates.map((rate) => ({
    serviceId: rate.serviceId,
    kind: rate.kind,
    value: rate.kind === 'fixed' ? toText(rate.value) : String(rate.value),
  })),
  salaryKind: scheme.salary?.kind ?? 'none',
  salary: toText(scheme.salary?.amount ?? null),
  minimum: toText(scheme.minimum),
  productsPercent: scheme.productsPercent === null ? '' : String(scheme.productsPercent),
})

const toScheme = (draft: Draft): MasterPayScheme => {
  const salary = toNumber(draft.salary)
  return {
    percent: toNumber(draft.percent),
    // A rate left empty means "same as the specialist's".
    rates: draft.rates.flatMap((rate) => {
      const value = toNumber(rate.value)
      return value === null ? [] : [{ serviceId: rate.serviceId, kind: rate.kind, value }]
    }),
    salary:
      draft.salaryKind === 'none' || salary === null
        ? null
        : { kind: draft.salaryKind, amount: salary },
    minimum: toNumber(draft.minimum),
    productsPercent: toNumber(draft.productsPercent),
  }
}

// How a master is paid, in one sheet of Settings rows: the percent of the services, other rates
// for some services, the percent of the products they sell, a salary per month or per working day, and a minimum per month. The parts
// add up; the pay is never below the minimum.
export const MasterPaySheet = ({ slug, master, services, onClose }: MasterPaySheetProps) => {
  const toast = useToast()
  const t = useT()
  const [saved, setSaved] = useState<MasterPayScheme | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const offered = services.filter((service) => master.serviceIds.includes(service.id))
  const serviceName = new Map(services.map((service) => [service.id, service.name]))
  const free = draft
    ? offered.filter((service) => !draft.rates.some((rate) => rate.serviceId === service.id))
    : []
  const percentError = draft && (toNumber(draft.percent) ?? 0) > 100
  const productsError = draft && (toNumber(draft.productsPercent) ?? 0) > 100
  const rateError = draft?.rates.some(
    (rate) => rate.kind === 'percent' && (toNumber(rate.value) ?? 0) > 100,
  )
  const isDirty =
    saved !== null && draft !== null && JSON.stringify(toScheme(draft)) !== JSON.stringify(saved)

  // biome-ignore lint/correctness/useExhaustiveDependencies: the toast manager is not a reason to reload
  useEffect(() => {
    const controller = new AbortController()
    getMasterPay(slug, master.id, controller.signal)
      .then((loaded) => {
        setSaved(loaded)
        setDraft(toDraft(loaded))
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          toast.show({
            title: t('Something went wrong'),
            description: getErrorMessage(error),
            type: 'error',
          })
        }
      })
    return () => controller.abort()
  }, [slug, master.id])

  const update = (patch: Partial<Draft>) =>
    setDraft((current) => current && { ...current, ...patch })

  const updateRate = (serviceId: string, patch: Partial<RateDraft>) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          rates: current.rates.map((rate) =>
            rate.serviceId === serviceId ? { ...rate, ...patch } : rate,
          ),
        },
    )

  const addRate = (serviceId: string) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          rates: [...current.rates, { serviceId, kind: 'percent', value: '' }],
        },
    )

  const removeRate = (serviceId: string) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          rates: current.rates.filter((rate) => rate.serviceId !== serviceId),
        },
    )

  const handleDone = async () => {
    if (!draft || !isDirty) {
      onClose()
      return
    }
    if (percentError || rateError || productsError) return
    setIsSaving(true)
    try {
      await setMasterPay(slug, master.id, toScheme(draft))
      toast.show({ title: t('Pay for {name} saved', { name: master.name }), type: 'success' })
      onClose()
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title={t('Pay')}
      onClose={onClose}
      action={{
        label: isDirty ? t('Save') : t('Done'),
        onClick: handleDone,
        disabled: isSaving,
      }}
    >
      {!draft && <Skeleton className={styles.skeleton} />}
      {draft && (
        <div className={sheet.form}>
          <section className={sheet.group} aria-labelledby='pay-services'>
            <SectionCaption id='pay-services'>{t('From services')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Specialist’s percent')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label={t('Specialist’s percent')}
                    placeholder={t('Not set')}
                    value={draft.percent}
                    onValueChange={(value) => update({ percent: digits(value).slice(0, 3) })}
                  />
                  {draft.percent !== '' && <span className={sheet.suffix}>%</span>}
                </span>
              </label>
              {draft.rates.map((rate) => {
                const name = serviceName.get(rate.serviceId) ?? t('Service')
                return (
                  <div key={rate.serviceId} className={sheet.row}>
                    <span className={styles.rateName}>{name}</span>
                    <span className={styles.rateControl}>
                      <Input
                        variant='plain'
                        inputMode='numeric'
                        aria-label={t('{name}: rate', { name })}
                        placeholder={draft.percent === '' ? '0' : draft.percent}
                        value={rate.value}
                        onValueChange={(value) =>
                          updateRate(rate.serviceId, {
                            value:
                              rate.kind === 'fixed'
                                ? maskAmountInput(digits(value))
                                : digits(value).slice(0, 3),
                          })
                        }
                      />
                      <Menu
                        label={t('{unit}, {name}: percent or amount per visit', {
                          unit: t(UNIT[rate.kind]),
                          name,
                        })}
                        className={styles.unit}
                        trigger={
                          <>
                            {t(UNIT[rate.kind])}
                            <CaretUpDown aria-hidden className={styles.unitGlyph} />
                          </>
                        }
                      >
                        <MenuItem
                          icon={rate.kind === 'percent' ? <Check aria-hidden /> : undefined}
                          onClick={() => updateRate(rate.serviceId, { kind: 'percent', value: '' })}
                        >
                          {t('Percent of payment')}
                        </MenuItem>
                        <MenuItem
                          icon={rate.kind === 'fixed' ? <Check aria-hidden /> : undefined}
                          onClick={() => updateRate(rate.serviceId, { kind: 'fixed', value: '' })}
                        >
                          {t('Amount per visit')}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem variant='danger' onClick={() => removeRate(rate.serviceId)}>
                          {t('Remove rate')}
                        </MenuItem>
                      </Menu>
                    </span>
                  </div>
                )
              })}
              {free.length > 0 && (
                <Menu
                  label={t('Another rate for a service')}
                  align='start'
                  className={`${sheet.row} ${styles.addRate}`}
                  trigger={
                    <>
                      <Plus aria-hidden className={styles.addGlyph} />
                      {t('Another rate for a service')}
                    </>
                  }
                >
                  {free.map((service) => (
                    <MenuItem key={service.id} onClick={() => addRate(service.id)}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
            <p className={sheet.groupFooter}>
              {percentError || rateError
                ? t('The percent cannot be more than 100.')
                : t(
                    'The percent is of what was paid in money, as in “Analytics”: discounts, certificates, passes and bonuses lower it. Without a payment mark: of the discounted price.',
                  )}
            </p>
          </section>

          <section className={sheet.group} aria-labelledby='pay-products'>
            <SectionCaption id='pay-products'>{t('From products')}</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Percent of sales')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label={t('Percent of sales')}
                    placeholder={t('No')}
                    value={draft.productsPercent}
                    onValueChange={(value) =>
                      update({ productsPercent: digits(value).slice(0, 3) })
                    }
                  />
                  {draft.productsPercent !== '' && <span className={sheet.suffix}>%</span>}
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {productsError
                ? t('The percent cannot be more than 100.')
                : t(
                    'Of the products the specialist sold in “Till” (the “Sold by” field). Cancelled sales do not count.',
                  )}
            </p>
          </section>

          <section className={sheet.group} aria-labelledby='pay-salary'>
            <SectionCaption id='pay-salary'>{t('Salary and minimum')}</SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Salary')}</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label={t('Salary')}
                    items={SALARY_ITEMS.map((item) => ({ ...item, label: t(item.label) }))}
                    value={draft.salaryKind}
                    onValueChange={(value) =>
                      update({ salaryKind: (value as SalaryKind | 'none' | null) ?? 'none' })
                    }
                  />
                </span>
              </div>
              {draft.salaryKind !== 'none' && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>{t('Amount')}</span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      inputMode='numeric'
                      aria-label={t('Salary amount')}
                      placeholder='0'
                      value={draft.salary}
                      onValueChange={(value) => update({ salary: maskAmountInput(digits(value)) })}
                    />
                    <span className={sheet.suffix}>{t('som')}</span>
                  </span>
                </label>
              )}
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t('Minimum per month')}</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label={t('Minimum per month')}
                    placeholder={t('No')}
                    value={draft.minimum}
                    onValueChange={(value) => update({ minimum: maskAmountInput(digits(value)) })}
                  />
                  {draft.minimum !== '' && <span className={sheet.suffix}>{t('som')}</span>}
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {draft.salaryKind === 'day'
                ? `${t('Working days come from the specialist’s schedule: days off and leave are not paid.')} `
                : draft.salaryKind === 'month'
                  ? `${t('A partial month is counted by its days.')} `
                  : ''}
              {t('If less than the minimum is earned in a month, the minimum is paid.')}
            </p>
          </section>
        </div>
      )}
    </Sheet>
  )
}
