'use client'

import { Input } from '@awaisa/ui/Input'
import { CheckCircle } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import type { PriceQuote } from '@/shared/api/types'
import styles from './PromoCodeField.module.css'

interface PromoCodeFieldProps {
  /** The row style of the group it sits in (label | field | action). */
  className?: string
  code: string | null
  error: string | null
  quote: PriceQuote | null
  /** No time yet: the code is checked once the visit has a time. */
  isWaitingForTime: boolean
  onApply: (code: string) => void
  onClear: () => void
}

// A Settings row like the name and number: «Промокод» on the left, the code typed on the right,
// «Применить» as text once something is typed; applied, the discount and «Убрать».
export const PromoCodeField = ({
  className,
  code,
  error,
  quote,
  isWaitingForTime,
  onApply,
  onClear,
}: PromoCodeFieldProps) => {
  const [draft, setDraft] = useState(code ?? '')
  const isApplied = Boolean(code) && !error
  const percent = quote?.discount?.percent

  if (isApplied && code) {
    return (
      <div className={className} data-action=''>
        <span className={styles.label}>Промокод</span>
        <span className={styles.applied}>
          <CheckCircle weight='fill' aria-hidden />
          {code}
          <span className={styles.note}>
            {isWaitingForTime
              ? 'проверим со временем'
              : percent
                ? `−${percent}%`
                : 'не на это время'}
          </span>
        </span>
        <button
          type='button'
          className={styles.action}
          onClick={() => {
            setDraft('')
            onClear()
          }}
        >
          Убрать
        </button>
      </div>
    )
  }

  return (
    <>
      <div className={className} data-action=''>
        <span className={styles.label}>Промокод</span>
        <Input
          variant='plain'
          aria-label='Промокод'
          placeholder='Ввести'
          autoCapitalize='characters'
          value={draft}
          onValueChange={(value) => setDraft(value.toUpperCase().replace(/\s/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && draft) onApply(draft)
          }}
        />
        {draft ? (
          <button type='button' className={styles.action} onClick={() => onApply(draft)}>
            Применить
          </button>
        ) : (
          <span />
        )}
      </div>
      {error && (
        <p className={styles.error} role='alert'>
          {error}
        </p>
      )}
    </>
  )
}
