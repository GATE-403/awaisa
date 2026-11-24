'use client'

import { type KeyboardEvent, useRef } from 'react'
import { cn } from '../../utils/className'
import { Input } from '../Input'
import styles from './OtpField.module.css'

interface OtpFieldProps {
  value: string
  onValueChange: (value: string) => void
  /** How many digits the code has. */
  length?: number
  /** The cells turn red with a short shake (a wrong code). */
  isInvalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** The name of the whole code; the first cell carries it, the others say their position. */
  'aria-label': string
  className?: string
}

const onlyDigits = (value: string) => value.replace(/\D/g, '')

// A one-time code as a row of the kit's `Input`s, one digit each. The first cell takes the
// phone's «code from Messages» suggestion (`one-time-code`); a pasted or filled code of several
// digits spreads over the cells; typing moves on, Backspace goes back.
const OtpField = ({
  value,
  onValueChange,
  length = 6,
  isInvalid = false,
  disabled,
  autoFocus,
  'aria-label': ariaLabel,
  className,
}: OtpFieldProps) => {
  const cells = useRef<(HTMLInputElement | null)[]>([])
  const digits = onlyDigits(value).slice(0, length)

  const focusCell = (index: number) =>
    cells.current[Math.max(0, Math.min(index, length - 1))]?.focus()

  const change = (index: number, typed: string) => {
    const incoming = onlyDigits(typed)
    // Several digits at once (paste, autofill, a test's fill): they fill from this cell on.
    const next = (digits.slice(0, index) + incoming + digits.slice(index + incoming.length)).slice(
      0,
      length,
    )
    onValueChange(incoming ? next : digits.slice(0, index) + digits.slice(index + 1))
    if (incoming) focusCell(index + incoming.length)
  }

  const keyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      onValueChange(digits.slice(0, index - 1) + digits.slice(index))
      focusCell(index - 1)
    }
    if (event.key === 'ArrowLeft') focusCell(index - 1)
    if (event.key === 'ArrowRight') focusCell(index + 1)
  }

  return (
    // The cells as one fieldset; the first cell carries the code's name (see below).
    // shadcn's input-otp look: one joined group of square cells.
    <fieldset
      data-slot='input-otp'
      className={cn('flex w-fit items-center', styles.root, className)}
      data-invalid={isInvalid || undefined}
    >
      {Array.from({ length }, (_, index) => (
        <Input
          // biome-ignore lint/suspicious/noArrayIndexKey: cells are positions, not items
          key={index}
          ref={(element) => {
            cells.current[index] = element
          }}
          className='relative size-9 rounded-none border-s-0 px-0 text-center text-base tabular-nums first:rounded-s-lg first:border-s last:rounded-e-lg focus-visible:z-10 md:text-base'
          type='text'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          // The first cell names the whole code, so «fill the code» lands where it spreads.
          aria-label={index === 0 ? ariaLabel : `Цифра ${index + 1} из ${length}`}
          aria-invalid={isInvalid || undefined}
          value={digits[index] ?? ''}
          disabled={disabled}
          autoFocus={autoFocus && index === Math.min(digits.length, length - 1)}
          onFocus={(event) => event.target.select()}
          onChange={(event) => change(index, event.target.value)}
          onKeyDown={(event) => keyDown(index, event)}
        />
      ))}
    </fieldset>
  )
}

export type { OtpFieldProps }
export { OtpField }
