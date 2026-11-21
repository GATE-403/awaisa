'use client'

import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getFiscalSettings, listFailedReceipts, saveFiscalSettings } from '@/shared/api/clientApi'
import type { FiscalReceipt, FiscalSettings, FiscalSettingsInput } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from '@/views/manage/ui/manageForms.module.css'
import { ReceiptSheet } from '@/views/manage/ui/ReceiptSheet/ReceiptSheet'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { FiscalSheet } from './FiscalSheet'
import { describeTaxes, regimeLabel } from './fiscalFormat'

interface FiscalTabProps {
  slug: string
}

const whenFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

const DRIVER_NOTE: Record<FiscalSettings['driver'], string> = {
  log: 'Тестовый режим: чеки нумеруются здесь и не уходят в ГНС.',
  ekassa: 'Чеки уходят в вашу кассу eKassa, а через неё в ГНС.',
  off: '',
}

// «Настройки → Касса»: fiscal receipts for products sold and visits paid in money. One switch,
// the business's details as Settings rows that open one sheet, and receipts the provider refused.
export const FiscalTab = ({ slug }: FiscalTabProps) => {
  const toast = useToast()
  const [settings, setSettings] = useState<FiscalSettings | null>(null)
  const [failed, setFailed] = useState<FiscalReceipt[]>([])
  const [editing, setEditing] = useState<'edit' | 'enable' | null>(null)
  const [openReceipt, setOpenReceipt] = useState<FiscalReceipt | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [next, refused] = await Promise.all([
        getFiscalSettings(slug, signal),
        listFailedReceipts(slug, signal),
      ])
      setSettings(next)
      setFailed(refused)
    },
    [slug],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [load])

  const save = async (input: FiscalSettingsInput, title: string) => {
    try {
      setSettings(await saveFiscalSettings(slug, input))
      toast.show({ title, type: 'success' })
      return true
    } catch (error) {
      toast.show({ title: 'Не сохранилось', description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!settings) return null

  const header = (
    <SectionHeader title='Касса' description='Фискальные чеки на товары и оплату визитов.' />
  )
  if (settings.driver === 'off') {
    return (
      <section className={styles.section} aria-label='Касса'>
        {header}
        <EmptyState
          title='Чеки пока не подключены'
          text='Продажи и визиты записываются в «Кассе» как раньше, без фискальных чеков.'
        />
      </section>
    )
  }

  const { driver: _driver, hasPassword: _hasPassword, ...current } = settings
  const taxes = describeTaxes(settings)
  const toggle = (checked: boolean) => {
    if (checked && !settings.inn) {
      setEditing('enable')
      return
    }
    void save({ ...current, isEnabled: checked }, checked ? 'Чеки включены' : 'Чеки выключены')
  }

  const rows = [
    { label: 'ИНН', value: settings.inn ?? 'Указать' },
    { label: 'Режим', value: regimeLabel(settings.taxRegime) },
    { label: 'НДС', value: taxes.vat },
    { label: 'НсП', value: taxes.salesTax },
    ...(settings.driver === 'ekassa'
      ? [{ label: 'eKassa', value: settings.login ?? 'Подключить' }]
      : []),
  ]

  return (
    <section className={styles.section} aria-label='Касса'>
      {header}

      <section className={sheet.group} aria-label='Чеки'>
        <SectionCaption>Чеки</SectionCaption>
        <div className={styles.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Выдавать чеки</span>
            <Switch checked={settings.isEnabled} onCheckedChange={toggle} />
          </label>
        </div>
        <RowNote>
          {settings.isEnabled
            ? `Чек выходит сам после продажи и после «Пришёл» с оплатой деньгами; отмена продажи даёт чек возврата. ${DRIVER_NOTE[settings.driver]}`
            : 'Включите, чтобы продажи и оплаченные визиты получали фискальный чек со ссылкой и QR для клиента.'}
        </RowNote>
      </section>

      <section className={sheet.group} aria-label='Реквизиты'>
        <SectionCaption>Реквизиты</SectionCaption>
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.label}>
              <button
                type='button'
                className={styles.serviceRow}
                onClick={() => setEditing('edit')}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{row.label}</span>
                </span>
                <span className={styles.cellValue}>{row.value}</span>
                <CaretRight className={styles.chevron} weight='bold' aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {failed.length > 0 && (
        <section className={sheet.group} aria-label='Не прошли'>
          <SectionCaption>Не прошли · {failed.length}</SectionCaption>
          <ul className={styles.list}>
            {failed.map((receipt) => (
              <li key={receipt.id}>
                <button
                  type='button'
                  className={styles.serviceRow}
                  onClick={() => setOpenReceipt(receipt)}
                >
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>
                      {receipt.kind === 'refund' ? 'Возврат' : receipt.saleId ? 'Продажа' : 'Визит'}
                      {' · '}
                      {whenFormat.format(new Date(receipt.createdAt))}
                    </span>
                    <span className={styles.rowMeta}>{receipt.error}</span>
                  </span>
                  <span className={styles.cellValue}>{formatPrice(receipt.total)}</span>
                  <CaretRight className={styles.chevron} weight='bold' aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <RowNote>Касса не приняла их 20 раз подряд. Откройте чек и отправьте снова.</RowNote>
        </section>
      )}

      {editing && (
        <FiscalSheet
          settings={settings}
          isEnabling={editing === 'enable'}
          onClose={() => setEditing(null)}
          onSave={(input) => save(input, editing === 'enable' ? 'Чеки включены' : 'Сохранено')}
        />
      )}

      {openReceipt && (
        <ReceiptSheet
          slug={slug}
          receipt={openReceipt}
          onClose={() => setOpenReceipt(null)}
          onChange={() => void load()}
        />
      )}
    </section>
  )
}
