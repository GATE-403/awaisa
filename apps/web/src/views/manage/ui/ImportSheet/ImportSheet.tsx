'use client'

import { Button } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { FileArrowUp } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { importBookings, importClients } from '@/shared/api/clientApi'
import type { ImportReport } from '@/shared/api/types'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { decodeCsv, findColumn, parseCsv } from '@/views/manage/lib/csv'

interface ImportSheetProps {
  slug: string
  onClose: () => void
  onImported: () => void
}

type Kind = 'clients' | 'bookings'

type Field = { key: string; label: MessageDescriptor; names: string[]; isRequired?: boolean }

// Header names as Altegio, YCLIENTS and hand-made tables write them.
const FIELDS: Record<Kind, Field[]> = {
  clients: [
    { key: 'name', label: msg`Name`, names: ['имя', 'фио', 'клиент', 'name'] },
    {
      key: 'phone',
      label: msg`Phone`,
      names: ['телефон', 'phone', 'тел', 'мобильный'],
      isRequired: true,
    },
    { key: 'birthday', label: msg`Birthday`, names: ['дата рождения', 'день рождения', 'birth'] },
    { key: 'note', label: msg`Note`, names: ['комментарий', 'примечание', 'заметка', 'comment'] },
  ],
  bookings: [
    {
      key: 'date',
      label: msg`Date`,
      names: ['дата', 'дата визита', 'дата записи', 'date'],
      isRequired: true,
    },
    { key: 'time', label: msg`Time`, names: ['время', 'начало', 'time'] },
    {
      key: 'service',
      label: msg`Service`,
      names: ['услуга', 'услуги', 'service'],
      isRequired: true,
    },
    {
      key: 'master',
      label: msg`Specialist`,
      names: ['сотрудник', 'мастер', 'исполнитель', 'specialist', 'staff'],
      isRequired: true,
    },
    { key: 'name', label: msg`Client`, names: ['клиент', 'имя', 'фио', 'client', 'name'] },
    { key: 'phone', label: msg`Phone`, names: ['телефон', 'phone', 'тел'], isRequired: true },
    { key: 'comment', label: msg`Comment`, names: ['комментарий', 'примечание', 'comment'] },
  ],
}

const KINDS: { value: Kind; label: MessageDescriptor }[] = [
  { value: 'clients', label: msg`Clients` },
  { value: 'bookings', label: msg`Bookings` },
]

const NONE = '-1'

// Moving from Altegio or YCLIENTS: the owner exports clients or upcoming bookings as CSV, we
// guess the columns from the headers, the owner checks them and the rows go in at once.
export const ImportSheet = ({ slug, onClose, onImported }: ImportSheetProps) => {
  const { t } = useLingui()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<Kind>('clients')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [columns, setColumns] = useState<Record<string, number>>({})
  const [remind, setRemind] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportReport | null>(null)
  const [headers, ...data] = rows
  const fields = FIELDS[kind]
  const isMapped = fields.every((field) => !field.isRequired || (columns[field.key] ?? -1) >= 0)
  const options = [
    { value: NONE, label: t`No` },
    ...(headers ?? []).map((header, index) => ({
      value: String(index),
      label: header || t`Column ${ph({ number: index + 1 })}`,
    })),
  ]

  const guessColumns = (nextKind: Kind, nextHeaders: string[]) =>
    setColumns(
      Object.fromEntries(
        FIELDS[nextKind].map((field) => [field.key, findColumn(nextHeaders, field.names)]),
      ),
    )

  const changeKind = (nextKind: Kind) => {
    setKind(nextKind)
    setResult(null)
    if (headers) guessColumns(nextKind, headers)
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const parsed = parseCsv(decodeCsv(await file.arrayBuffer()))
    setFileName(file.name)
    setRows(parsed)
    setResult(null)
    guessColumns(kind, parsed[0] ?? [])
  }

  const toRecords = () =>
    data.map((row) =>
      Object.fromEntries(fields.map((field) => [field.key, row[columns[field.key] ?? -1] ?? ''])),
    )

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const records = toRecords()
      const report =
        kind === 'clients'
          ? await importClients(slug, records)
          : await importBookings(slug, records, remind)
      setResult(report)
      if (report.imported > 0) onImported()
    } catch (error) {
      toast.show({ title: t`Not loaded`, description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Sheet
      title={t`Import`}
      onClose={onClose}
      action={
        result
          ? { label: t`Done`, onClick: onClose }
          : {
              label: t`Load`,
              onClick: () => void handleImport(),
              disabled: data.length === 0 || !isMapped || isImporting,
            }
      }
    >
      <div className={sheet.form}>
        <SegmentedControl
          label={t`What to load`}
          value={kind}
          items={KINDS.map((item) => ({ ...item, label: t(item.label) }))}
          onChange={changeKind}
        />

        <section className={sheet.group} aria-label={t`File`}>
          <div className={sheet.list}>
            <button type='button' className={sheet.row} onClick={() => fileInput.current?.click()}>
              <span className={sheet.rowLabel}>
                {fileName
                  ? `${fileName} · ${t`${plural(data.length, { one: '# row', other: '# rows' })}`}`
                  : t`Choose a CSV file`}
              </span>
              <FileArrowUp aria-hidden className={sheet.suffix} />
            </button>
            <input
              ref={fileInput}
              type='file'
              accept='.csv,text/csv,text/plain'
              hidden
              aria-label={t`CSV file`}
              onChange={(event) => void handleFile(event)}
            />
          </div>
          <p className={sheet.groupFooter}>
            {kind === 'clients'
              ? t`In Altegio or YCLIENTS: Clients → Export. Save the table as CSV.`
              : t`Future bookings only: export the booking log from today and save it as CSV.`}
          </p>
        </section>

        {headers && !result && (
          <section className={sheet.group} aria-label={t`Columns`}>
            <SectionCaption>{t`Columns`}</SectionCaption>
            <div className={sheet.list}>
              {fields.map((field) => (
                <div key={field.key} className={sheet.row}>
                  <span className={sheet.rowLabel}>{t(field.label)}</span>
                  <span className={sheet.rowControl}>
                    <Select
                      variant='plain'
                      aria-label={t`Column: ${ph({ name: t(field.label) })}`}
                      items={options}
                      value={String(columns[field.key] ?? -1)}
                      onValueChange={(value) =>
                        setColumns((current) => ({ ...current, [field.key]: Number(value ?? -1) }))
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {isMapped
                ? t`First row: ${ph({
                    values: Object.values(toRecords()[0] ?? {})
                      .filter(Boolean)
                      .join(' · '),
                  })}`
                : t`Pick the columns: ${ph({
                    fields: fields
                      .filter((field) => field.isRequired && (columns[field.key] ?? -1) < 0)
                      .map((field) => t(field.label).toLowerCase())
                      .join(', '),
                  })}.`}
            </p>
          </section>
        )}

        {kind === 'bookings' && headers && !result && (
          <section className={sheet.group} aria-label={t`Reminders`}>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>{t`Remind clients by SMS`}</span>
                <Switch checked={remind} onCheckedChange={setRemind} />
              </label>
            </div>
            <p className={sheet.groupFooter}>
              {t`No confirmations are sent: the clients are already booked. Services and specialists are matched by name.`}
            </p>
          </section>
        )}

        {result && (
          <section className={sheet.group} aria-label={t`Import result`}>
            <SectionCaption>
              {t`Loaded ${ph({ count: result.imported })}`}
              {result.skippedCount > 0 && ` · ${t`skipped ${ph({ count: result.skippedCount })}`}`}
            </SectionCaption>
            {result.skipped.length > 0 && (
              <div className={sheet.list}>
                {result.skipped.map((item) => (
                  <div key={item.row} className={sheet.row}>
                    <span className={sheet.rowLabel}>{t`Row ${ph({ number: item.row + 1 })}`}</span>
                    <span className={sheet.suffix}>{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
            {result.skippedCount > result.skipped.length && (
              <p className={sheet.groupFooter}>
                {t`And ${ph({ count: result.skippedCount - result.skipped.length })} more.`}
              </p>
            )}
            {result.skippedCount > 0 && (
              <Button variant='secondary' onClick={() => setResult(null)}>
                {t`Fix the columns`}
              </Button>
            )}
          </section>
        )}
      </div>
    </Sheet>
  )
}
