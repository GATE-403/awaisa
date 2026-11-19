'use client'

import { type CSSProperties, useId } from 'react'
import styles from './SegmentedControl.module.css'

type Segment<Value extends string> = { value: Value; label: string }

interface SegmentedControlProps<Value extends string> {
  label: string
  value: Value
  items: Segment<Value>[]
  onChange: (value: Value) => void
  /** `sm` sits beside the kit's small buttons in a toolbar (36pt). */
  size?: 'md' | 'sm'
}

// The macOS 26 segmented control: a capsule track, equal segments and a raised knob that slides
// to the chosen one. Native radios underneath give arrow keys and focus for free.
export const SegmentedControl = <Value extends string>({
  label,
  value,
  items,
  onChange,
  size = 'md',
}: SegmentedControlProps<Value>) => {
  const name = useId()
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  )

  return (
    <fieldset
      className={styles.control}
      data-size={size}
      style={{ '--count': items.length, '--index': index } as CSSProperties}
    >
      <legend className={styles.legend}>{label}</legend>
      <span className={styles.knob} aria-hidden='true' />
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
