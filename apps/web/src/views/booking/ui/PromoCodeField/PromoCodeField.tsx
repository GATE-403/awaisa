'use client'

import { Button } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { CheckCircle } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import type { PriceQuote } from '@/shared/api/types'
import styles from './PromoCodeField.module.css'

interface PromoCodeFieldProps {
  code: string | null
  error: string | null
  quote: PriceQuote | null
  /** No time yet: the code is checked once the visit has a time. */
  isWaitingForTime: boolean
  onApply: (code: string) => void
  onClear: () => void
}

// Behind a link like the comment: most clients have no code, those who do find it in one tap.
export const PromoCodeField = ({
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
      <p className={styles.applied}>
        <CheckCircle weight='fill' aria-hidden />
        <span>
          Промокод {code}
          {isWaitingForTime
            ? ' — проверим, когда выберете время'
            : percent
              ? ` · −${percent}%`
              : ' · на это время скидка не действует'}
        </span>
        <button type='button' className={styles.remove} onClick={onClear}>
          Убрать
        </button>
      </p>
    )
  }

  return (
    <details className={styles.more} open={Boolean(error) || undefined}>
      <summary className={styles.summary}>Есть промокод?</summary>
      <div className={styles.row}>
        <Input
          aria-label='Промокод'
          placeholder='Промокод'
          autoCapitalize='characters'
          value={draft}
          onValueChange={(value) => setDraft(value.toUpperCase().replace(/\s/g, ''))}
        />
        <Button variant='secondary' onClick={() => draft && onApply(draft)} disabled={!draft}>
          Применить
        </Button>
      </div>
      {error && (
        <p className={styles.error} role='alert'>
          {error}
        </p>
      )}
    </details>
  )
}
