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
}

const SALARY_ITEMS: { value: SalaryKind | 'none'; label: string }[] = [
  { value: 'none', label: 'Нет' },
  { value: 'month', label: 'В месяц' },
  { value: 'day', label: 'За рабочий день' },
]

const UNIT: Record<PayRateKind, string> = { percent: '%', fixed: 'сом' }

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
})

const toScheme = (draft: Draft): MasterPayScheme => {
  const salary = toNumber(draft.salary)
  return {
    percent: toNumber(draft.percent),
    // A rate left empty means «как у мастера».
    rates: draft.rates.flatMap((rate) => {
      const value = toNumber(rate.value)
      return value === null ? [] : [{ serviceId: rate.serviceId, kind: rate.kind, value }]
    }),
    salary:
      draft.salaryKind === 'none' || salary === null
        ? null
        : { kind: draft.salaryKind, amount: salary },
    minimum: toNumber(draft.minimum),
  }
}

// How a master is paid, in one sheet of Settings rows: the percent of the services, other rates
// for some services, a salary per month or per working day, and a minimum per month. The parts
// add up; the pay is never below the minimum.
export const MasterPaySheet = ({ slug, master, services, onClose }: MasterPaySheetProps) => {
  const toast = useToast()
  const [saved, setSaved] = useState<MasterPayScheme | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const offered = services.filter((service) => master.serviceIds.includes(service.id))
  const serviceName = new Map(services.map((service) => [service.id, service.name]))
  const free = draft
    ? offered.filter((service) => !draft.rates.some((rate) => rate.serviceId === service.id))
    : []
  const percentError = draft && (toNumber(draft.percent) ?? 0) > 100
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
          toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
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
    if (percentError || rateError) return
    setIsSaving(true)
    try {
      await setMasterPay(slug, master.id, toScheme(draft))
      toast.show({ title: `Зарплата ${master.name} сохранена`, type: 'success' })
      onClose()
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title='Зарплата'
      onClose={onClose}
      action={{ label: isDirty ? 'Сохранить' : 'Готово', onClick: handleDone, disabled: isSaving }}
    >
      {!draft && <Skeleton className={styles.skeleton} />}
      {draft && (
        <div className={sheet.form}>
          <section className={sheet.group} aria-labelledby='pay-services'>
            <SectionCaption id='pay-services'>С услуг</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Процент мастера</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label='Процент мастера'
                    placeholder='Не задан'
                    value={draft.percent}
                    onValueChange={(value) => update({ percent: digits(value).slice(0, 3) })}
                  />
                  {draft.percent !== '' && <span className={sheet.suffix}>%</span>}
                </span>
              </label>
              {draft.rates.map((rate) => {
                const name = serviceName.get(rate.serviceId) ?? 'Услуга'
                return (
                  <div key={rate.serviceId} className={sheet.row}>
                    <span className={styles.rateName}>{name}</span>
                    <span className={styles.rateControl}>
                      <Input
                        variant='plain'
                        inputMode='numeric'
                        aria-label={`${name}: ставка`}
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
                        label={`${UNIT[rate.kind]}, ${name}: процент или сумма за визит`}
                        className={styles.unit}
                        trigger={
                          <>
                            {UNIT[rate.kind]}
                            <CaretUpDown aria-hidden className={styles.unitGlyph} />
                          </>
                        }
                      >
                        <MenuItem
                          icon={rate.kind === 'percent' ? <Check aria-hidden /> : undefined}
                          onClick={() => updateRate(rate.serviceId, { kind: 'percent', value: '' })}
                        >
                          Процент от оплаты
                        </MenuItem>
                        <MenuItem
                          icon={rate.kind === 'fixed' ? <Check aria-hidden /> : undefined}
                          onClick={() => updateRate(rate.serviceId, { kind: 'fixed', value: '' })}
                        >
                          Сумма за визит
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem variant='danger' onClick={() => removeRate(rate.serviceId)}>
                          Убрать ставку
                        </MenuItem>
                      </Menu>
                    </span>
                  </div>
                )
              })}
              {free.length > 0 && (
                <Menu
                  label='Другая ставка для услуги'
                  align='start'
                  className={`${sheet.row} ${styles.addRate}`}
                  trigger={
                    <>
                      <Plus aria-hidden className={styles.addGlyph} />
                      Другая ставка для услуги
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
                ? 'Процент не может быть больше 100.'
                : 'Процент считается от оплаченного деньгами, как в «Аналитике»: скидки, сертификаты, абонементы и бонусы его уменьшают. Без отметки об оплате: от цены со скидкой.'}
            </p>
          </section>

          <section className={sheet.group} aria-labelledby='pay-salary'>
            <SectionCaption id='pay-salary'>Оклад и минимум</SectionCaption>
            <div className={sheet.list}>
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Оклад</span>
                <span className={sheet.rowControl}>
                  <Select
                    variant='plain'
                    aria-label='Оклад'
                    items={SALARY_ITEMS}
                    value={draft.salaryKind}
                    onValueChange={(value) =>
                      update({ salaryKind: (value as SalaryKind | 'none' | null) ?? 'none' })
                    }
                  />
                </span>
              </div>
              {draft.salaryKind !== 'none' && (
                <label className={sheet.row}>
                  <span className={sheet.rowLabel}>Сумма</span>
                  <span className={sheet.rowControl}>
                    <Input
                      variant='plain'
                      inputMode='numeric'
                      aria-label='Сумма оклада'
                      placeholder='0'
                      value={draft.salary}
                      onValueChange={(value) => update({ salary: maskAmountInput(digits(value)) })}
                    />
                    <span className={sheet.suffix}>сом</span>
                  </span>
                </label>
              )}
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Минимум в месяц</span>
                <span className={sheet.rowControl}>
                  <Input
                    variant='plain'
                    inputMode='numeric'
                    aria-label='Минимум в месяц'
                    placeholder='Нет'
                    value={draft.minimum}
                    onValueChange={(value) => update({ minimum: maskAmountInput(digits(value)) })}
                  />
                  {draft.minimum !== '' && <span className={sheet.suffix}>сом</span>}
                </span>
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {draft.salaryKind === 'day'
                ? 'Рабочие дни берутся из графика мастера: выходные и отпуск не оплачиваются. '
                : draft.salaryKind === 'month'
                  ? 'За неполный месяц считается его часть по дням. '
                  : ''}
              Если за месяц заработано меньше минимума, выплачивается минимум.
            </p>
          </section>
        </div>
      )}
    </Sheet>
  )
}
