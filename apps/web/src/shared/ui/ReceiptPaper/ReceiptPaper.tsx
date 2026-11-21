'use client'

import { useEffect, useState } from 'react'
import type { FiscalReceipt } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import styles from './ReceiptPaper.module.css'

interface ReceiptPaperProps {
  receipt: FiscalReceipt
  /** What it lies on: a page (the card colour) or a sheet (the sheet's row colour). */
  surface?: 'page' | 'sheet'
}

type QrMatrix = { size: number; dark: boolean[] }

const TAX_REGIMES: Record<FiscalReceipt['taxRegime'], string> = {
  general: 'Общий режим',
  single: 'Единый налог',
  patent: 'Патент',
}

const moneyFormat = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

const money = (value: number) => moneyFormat.format(value)
const formatCount = (value: number) => (Number.isInteger(value) ? String(value) : money(value))

/** A rate on the receipt: «НДС 12%», «НсП 2%» — the same rate on every line reads once. */
const rateOf = (receipt: FiscalReceipt, key: 'vatRate' | 'salesTaxRate') => {
  const rates = [...new Set(receipt.lines.map((line) => line[key]))]
  return rates.length === 1 ? ` ${rates[0]}%` : ''
}

// A fiscal receipt as paper: the seller, the lines, the total with the taxes in it, the fiscal
// details and the QR that opens the receipt (the tax office's page once the provider gives one,
// else our own). The same for the owner in the cabinet and for the client on its own page.
export const ReceiptPaper = ({ receipt, surface = 'page' }: ReceiptPaperProps) => {
  const [qr, setQr] = useState<QrMatrix | null>(null)
  const link = receipt.providerUrl ?? receipt.viewUrl
  const isIssued = receipt.status === 'issued'

  // The encoder is loaded with the receipt, so pages without one never ship it.
  useEffect(() => {
    if (!isIssued) return
    let isCurrent = true
    import('qrcode').then((QRCode) => {
      const { modules } = QRCode.create(link, { errorCorrectionLevel: 'M' })
      if (isCurrent) setQr({ size: modules.size, dark: Array.from(modules.data, Boolean) })
    })
    return () => {
      isCurrent = false
    }
  }, [isIssued, link])

  const path = qr
    ? qr.dark
        .map((isDark, index) =>
          isDark ? `M${index % qr.size} ${Math.floor(index / qr.size)}h1v1h-1z` : '',
        )
        .join('')
    : ''

  return (
    <article className={styles.paper} data-surface={surface} aria-label='Кассовый чек'>
      <header className={styles.head}>
        <span className={styles.seller}>{receipt.businessName}</span>
        {receipt.address && <span>{receipt.address}</span>}
        {receipt.inn && <span>ИНН {receipt.inn}</span>}
        <span>{TAX_REGIMES[receipt.taxRegime]}</span>
        <span className={styles.kind}>
          {receipt.kind === 'refund' ? 'Возврат прихода' : 'Приход'}
          {receipt.isTest && ' · тестовый'}
        </span>
      </header>

      <ul className={styles.lines}>
        {receipt.lines.map((line) => (
          <li key={`${line.name}-${line.price}`} className={styles.line}>
            <span className={styles.lineName}>{line.name}</span>
            <span className={styles.lineCount}>
              {formatCount(line.quantity)} × {money(line.price)}
            </span>
            <span className={styles.lineSum}>{money(line.sum)}</span>
          </li>
        ))}
      </ul>

      <dl className={styles.totals}>
        <div className={styles.total}>
          <dt>Итого</dt>
          <dd>{money(receipt.total)}</dd>
        </div>
        {receipt.vatAmount > 0 && (
          <div>
            <dt>в т. ч. НДС{rateOf(receipt, 'vatRate')}</dt>
            <dd>{money(receipt.vatAmount)}</dd>
          </div>
        )}
        {receipt.salesTaxAmount > 0 && (
          <div>
            <dt>в т. ч. НсП{rateOf(receipt, 'salesTaxRate')}</dt>
            <dd>{money(receipt.salesTaxAmount)}</dd>
          </div>
        )}
        <div>
          <dt>{receipt.payment === 'cash' ? 'Наличными' : 'Безналичными'}</dt>
          <dd>{money(receipt.total)}</dd>
        </div>
      </dl>

      {isIssued ? (
        <footer className={styles.foot}>
          <dl className={styles.fiscal}>
            <div>
              <dt>ФД №</dt>
              <dd>{receipt.fiscalNumber}</dd>
            </div>
            <div>
              <dt>ФП</dt>
              <dd>{receipt.fiscalSign}</dd>
            </div>
            {receipt.issuedAt && (
              <div>
                <dt>Дата</dt>
                <dd>{dateFormat.format(new Date(receipt.issuedAt))}</dd>
              </div>
            )}
          </dl>
          {qr ? (
            <svg
              viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
              className={styles.qr}
              role='img'
              aria-label='QR-код чека'
              shapeRendering='crispEdges'
            >
              <rect x={-2} y={-2} width={qr.size + 4} height={qr.size + 4} fill='#fff' />
              <path d={path} fill='#000' />
            </svg>
          ) : (
            <span className={styles.qr} />
          )}
        </footer>
      ) : (
        <p className={styles.state} data-tone={receipt.status === 'failed' ? 'danger' : undefined}>
          {receipt.status === 'failed'
            ? `Касса не приняла чек: ${receipt.error ?? 'нет ответа'}`
            : receipt.status === 'cancelled'
              ? 'Чек отменён до отправки'
              : 'Чек отправляется в кассу'}
        </p>
      )}
    </article>
  )
}
