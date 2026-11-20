'use client'

import { type CSSProperties, type ReactNode, useId } from 'react'
import styles from './SegmentedControl.module.css'

// With an `icon` the segment shows only the glyph; its label stays for screen readers and comes up
// as a tooltip on pointing.
type Segment<Value extends string> = { value: Value; label: string; icon?: ReactNode }

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
        <label
          key={item.value}
          className={styles.segment}
          title={item.icon ? item.label : undefined}
          data-icon={item.icon ? '' : undefined}
        >
          <input
            type='radio'
            name={name}
            value={item.value}
            checked={item.value === value}
            onChange={() => onChange(item.value)}
            className={styles.input}
          />
          {item.icon ? (
            <>
              {item.icon}
              <span className={styles.iconLabel}>{item.label}</span>
            </>
          ) : (
            item.label
          )}
        </label>
      ))}
    </fieldset>
  )
}
