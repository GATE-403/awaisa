'use client'

import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '@/entities/booking'
import { getErrorMessage } from '@/shared/api/apiError'
import { getFiscalSettings, listFailedReceipts, saveFiscalSettings } from '@/shared/api/clientApi'
import type { FiscalReceipt, FiscalSettings, FiscalSettingsInput } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
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

const WHEN_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
}
// Browsers have no Kyrgyz month names, so Kyrgyz keeps the Russian ones.
const whenFormats = {
  ru: new Intl.DateTimeFormat('ru-RU', WHEN_OPTIONS),
  en: new Intl.DateTimeFormat('en-GB', WHEN_OPTIONS),
}

const DRIVER_NOTE: Record<FiscalSettings['driver'], string> = {
  log: 'Тестовый режим: чеки нумеруются здесь и не уходят в ГНС.',
  ekassa: 'Чеки уходят в вашу кассу eKassa, а через неё в ГНС.',
  off: '',
}

// «Настройки → Касса»: fiscal receipts for products sold and visits paid in money. One switch,
// the business's details as Settings rows that open one sheet, and receipts the provider refused.
export const FiscalTab = ({ slug }: FiscalTabProps) => {
  const toast = useToast()
  const t = useT()
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
      toast.show({ title: t('Не сохранилось'), description: getErrorMessage(error), type: 'error' })
      return false
    }
  }

  if (!settings) return null

  const header = (
    <SectionHeader
      title={t('Касса')}
      description={t('Фискальные чеки на товары и оплату визитов.')}
    />
  )
  if (settings.driver === 'off') {
    return (
      <section className={styles.section} aria-label={t('Касса')}>
        {header}
        <EmptyState
          title={t('Чеки пока не подключены')}
          text={t('Продажи и визиты записываются в «Кассе» как раньше, без фискальных чеков.')}
        />
      </section>
    )
  }

  const { driver: _driver, hasPassword: _hasPassword, ...current } = settings
  const taxes = describeTaxes(settings, t)
  const toggle = (checked: boolean) => {
    if (checked && !settings.inn) {
      setEditing('enable')
      return
    }
    void save({ ...current, isEnabled: checked }, t(checked ? 'Чеки включены' : 'Чеки выключены'))
  }

  const rows = [
    { label: t('ИНН'), value: settings.inn ?? t('Указать') },
    { label: t('Режим'), value: regimeLabel(settings.taxRegime, t) },
    { label: t('НДС'), value: taxes.vat },
    { label: t('НсП'), value: taxes.salesTax },
    ...(settings.driver === 'ekassa'
      ? [{ label: 'eKassa', value: settings.login ?? t('Подключить') }]
      : []),
  ]

  return (
    <section className={styles.section} aria-label={t('Касса')}>
      {header}

      <section className={sheet.group} aria-label={t('Чеки')}>
        <SectionCaption>{t('Чеки')}</SectionCaption>
        <div className={styles.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Выдавать чеки')}</span>
            <Switch checked={settings.isEnabled} onCheckedChange={toggle} />
          </label>
        </div>
        <RowNote>
          {settings.isEnabled
            ? [
                t(
                  'Чек выходит сам после продажи и после «Пришёл» с оплатой деньгами; отмена продажи даёт чек возврата.',
                ),
                DRIVER_NOTE[settings.driver] ? t(DRIVER_NOTE[settings.driver]) : '',
              ]
                .filter(Boolean)
                .join(' ')
            : t(
                'Включите, чтобы продажи и оплаченные визиты получали фискальный чек со ссылкой и QR для клиента.',
              )}
        </RowNote>
      </section>

      <section className={sheet.group} aria-label={t('Реквизиты')}>
        <SectionCaption>{t('Реквизиты')}</SectionCaption>
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
                <CaretRight className={styles.chevron} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {failed.length > 0 && (
        <section className={sheet.group} aria-label={t('Не прошли')}>
          <SectionCaption>{t('Не прошли · {count}', { count: failed.length })}</SectionCaption>
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
                      {t(
                        receipt.kind === 'refund'
                          ? 'Возврат'
                          : receipt.saleId
                            ? 'Продажа'
                            : 'Визит',
                      )}
                      {' · '}
                      {whenFormats[t.language === 'en' ? 'en' : 'ru'].format(
                        new Date(receipt.createdAt),
                      )}
                    </span>
                    <span className={styles.rowMeta}>{receipt.error}</span>
                  </span>
                  <span className={styles.cellValue}>{formatPrice(receipt.total)}</span>
                  <CaretRight className={styles.chevron} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <RowNote>
            {t('Касса не приняла их 20 раз подряд. Откройте чек и отправьте снова.')}
          </RowNote>
        </section>
      )}

      {editing && (
        <FiscalSheet
          settings={settings}
          isEnabling={editing === 'enable'}
          onClose={() => setEditing(null)}
          onSave={(input) => save(input, t(editing === 'enable' ? 'Чеки включены' : 'Сохранено'))}
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
