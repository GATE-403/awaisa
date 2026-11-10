'use client'

import { useId } from 'react'
import styles from './SegmentedControl.module.css'

type Segment<Value extends string> = { value: Value; label: string }

interface SegmentedControlProps<Value extends string> {
  label: string
  value: Value
  items: Segment<Value>[]
  onChange: (value: Value) => void
}

// The macOS 26 segmented control: a 5% track, the chosen segment filled with the accent.
// Native radios underneath give arrow keys and focus for free.
export const SegmentedControl = <Value extends string>({
  label,
  value,
  items,
  onChange,
}: SegmentedControlProps<Value>) => {
  const name = useId()

  return (
    <fieldset className={styles.control}>
      <legend className={styles.legend}>{label}</legend>
      {items.map((item) => (
        <label key={item.value} className={styles.segment}>
          <input
            type='radio'
            name={name}
            value={item.value}
            checked={item.value === value}
            onChange={() => onChange(item.value)}
            className={styles.input}
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  )
}
