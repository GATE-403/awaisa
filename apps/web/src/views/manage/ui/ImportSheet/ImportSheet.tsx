'use client'

import { Button } from '@awaisa/ui/Button'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { FileArrowUp } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { importBookings, importClients } from '@/shared/api/clientApi'
import type { ImportReport } from '@/shared/api/types'
import { pluralize } from '@/shared/lib/plural'
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

type Field = { key: string; label: string; names: string[]; isRequired?: boolean }

// Header names as Altegio, YCLIENTS and hand-made tables write them.
const FIELDS: Record<Kind, Field[]> = {
  clients: [
    { key: 'name', label: 'Имя', names: ['имя', 'фио', 'клиент', 'name'] },
    {
      key: 'phone',
      label: 'Телефон',
      names: ['телефон', 'phone', 'тел', 'мобильный'],
      isRequired: true,
    },
    { key: 'birthday', label: 'День рождения', names: ['дата рождения', 'день рождения', 'birth'] },
    { key: 'note', label: 'Заметка', names: ['комментарий', 'примечание', 'заметка', 'comment'] },
  ],
  bookings: [
    {
      key: 'date',
      label: 'Дата',
      names: ['дата', 'дата визита', 'дата записи', 'date'],
      isRequired: true,
    },
    { key: 'time', label: 'Время', names: ['время', 'начало', 'time'] },
    { key: 'service', label: 'Услуга', names: ['услуга', 'услуги', 'service'], isRequired: true },
    {
      key: 'master',
      label: 'Мастер',
      names: ['сотрудник', 'мастер', 'исполнитель', 'specialist', 'staff'],
      isRequired: true,
    },
    { key: 'name', label: 'Клиент', names: ['клиент', 'имя', 'фио', 'client', 'name'] },
    { key: 'phone', label: 'Телефон', names: ['телефон', 'phone', 'тел'], isRequired: true },
    { key: 'comment', label: 'Комментарий', names: ['комментарий', 'примечание', 'comment'] },
  ],
}

const KINDS: { value: Kind; label: string }[] = [
  { value: 'clients', label: 'Клиенты' },
  { value: 'bookings', label: 'Записи' },
]

const NONE = '-1'

// Moving from Altegio or YCLIENTS: the owner exports clients or upcoming bookings as CSV, we
// guess the columns from the headers, the owner checks them and the rows go in at once.
export const ImportSheet = ({ slug, onClose, onImported }: ImportSheetProps) => {
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
    { value: NONE, label: 'Нет' },
    ...(headers ?? []).map((header, index) => ({
      value: String(index),
      label: header || `Колонка ${index + 1}`,
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
      toast.show({ title: 'Не загрузилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Sheet
      title='Импорт'
      onClose={onClose}
      action={
        result
          ? { label: 'Готово', onClick: onClose }
          : {
              label: 'Загрузить',
              onClick: () => void handleImport(),
              disabled: data.length === 0 || !isMapped || isImporting,
            }
      }
    >
      <div className={sheet.form}>
        <SegmentedControl label='Что загрузить' value={kind} items={KINDS} onChange={changeKind} />

        <section className={sheet.group} aria-label='Файл'>
          <div className={sheet.list}>
            <button type='button' className={sheet.row} onClick={() => fileInput.current?.click()}>
              <span className={sheet.rowLabel}>
                {fileName
                  ? `${fileName} · ${pluralize(data.length, ['строка', 'строки', 'строк'])}`
                  : 'Выбрать файл CSV'}
              </span>
              <FileArrowUp weight='bold' aria-hidden className={sheet.suffix} />
            </button>
            <input
              ref={fileInput}
              type='file'
              accept='.csv,text/csv,text/plain'
              hidden
              aria-label='Файл CSV'
              onChange={(event) => void handleFile(event)}
            />
          </div>
          <p className={sheet.groupFooter}>
            {kind === 'clients'
              ? 'В Altegio или YCLIENTS: Клиенты → Экспорт. Сохраните таблицу как CSV.'
              : 'Только будущие записи: выгрузите журнал записей с сегодняшнего дня и сохраните как CSV.'}
          </p>
        </section>

        {headers && !result && (
          <section className={sheet.group} aria-label='Колонки'>
            <SectionCaption>Колонки</SectionCaption>
            <div className={sheet.list}>
              {fields.map((field) => (
                <div key={field.key} className={sheet.row}>
                  <span className={sheet.rowLabel}>{field.label}</span>
                  <span className={sheet.rowControl}>
                    <Select
                      variant='plain'
                      aria-label={`Колонка: ${field.label}`}
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
                ? `Первая строка: ${Object.values(toRecords()[0] ?? {})
                    .filter(Boolean)
                    .join(' · ')}`
                : `Укажите колонки: ${fields
                    .filter((field) => field.isRequired && (columns[field.key] ?? -1) < 0)
                    .map((field) => field.label.toLowerCase())
                    .join(', ')}.`}
            </p>
          </section>
        )}

        {kind === 'bookings' && headers && !result && (
          <section className={sheet.group} aria-label='Напоминания'>
            <div className={sheet.list}>
              <label className={sheet.row}>
                <span className={sheet.rowLabel}>Напомнить клиентам по SMS</span>
                <Switch checked={remind} onCheckedChange={setRemind} />
              </label>
            </div>
            <p className={sheet.groupFooter}>
              Подтверждения не отправим — клиенты уже записаны. Услуги и мастеров ищем по названию.
            </p>
          </section>
        )}

        {result && (
          <section className={sheet.group} aria-label='Итог импорта'>
            <SectionCaption>
              Загружено {result.imported}
              {result.skippedCount > 0 && ` · пропущено ${result.skippedCount}`}
            </SectionCaption>
            {result.skipped.length > 0 && (
              <div className={sheet.list}>
                {result.skipped.map((item) => (
                  <div key={item.row} className={sheet.row}>
                    <span className={sheet.rowLabel}>Строка {item.row + 1}</span>
                    <span className={sheet.suffix}>{item.reason}</span>
                  </div>
                ))}
              </div>
            )}
            {result.skippedCount > result.skipped.length && (
              <p className={sheet.groupFooter}>
                И ещё {result.skippedCount - result.skipped.length}.
              </p>
            )}
            {result.skippedCount > 0 && (
              <Button variant='secondary' onClick={() => setResult(null)}>
                Исправить колонки
              </Button>
            )}
          </section>
        )}
      </div>
    </Sheet>
  )
}
