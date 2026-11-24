'use client'

import { Input } from '@awaisa/ui/Input'
import { useLingui } from '@lingui/react/macro'
import { MagnifyingGlass, X } from '@phosphor-icons/react/ssr'
import styles from './SearchField.module.css'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** The placeholder; also the accessible name unless `label` is given. */
  placeholder: string
  label?: string
}

// The app's one search field (like Settings' search): a fill capsule at the control height with
// the glass and a clear button - no border, so it sits on a page or a sheet beside other capsules.
export const SearchField = ({ value, onChange, placeholder, label }: SearchFieldProps) => {
  const { t } = useLingui()
  return (
    <label className={styles.search}>
      <MagnifyingGlass aria-hidden className={styles.icon} />
      <Input
        type='search'
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.input}
      />
      {value && (
        <button
          type='button'
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label={t`Clear search`}
        >
          <X aria-hidden />
        </button>
      )}
    </label>
  )
}
