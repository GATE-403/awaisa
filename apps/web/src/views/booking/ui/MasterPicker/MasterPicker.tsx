'use client'

import { Check, UsersThree } from '@phosphor-icons/react/ssr'
import { ANY_SPECIALIST_ID } from '@/entities/booking'
import { MasterCard } from '@/entities/business'
import type { Specialist } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import styles from './MasterPicker.module.css'

interface MasterPickerProps {
  specialists: Specialist[]
  value: string | null
  onChange: (id: string) => void
  /** The chosen card tapped again: close the step without changing anything. */
  onReselect?: () => void
}

// Masters as the business page's picture cards (`MasterCard`), so the face picked here is the
// one seen there. The chosen card gets an accent ring and a check; native radios cover each card.
export const MasterPicker = ({ specialists, value, onChange, onReselect }: MasterPickerProps) => {
  const t = useT()
  return (
    <div className={styles.row} role='radiogroup' aria-label={t('Мастер')} data-edge-fade=''>
      <MasterCard
        specialist={null}
        className={styles.card}
        icon={<UsersThree />}
        title={t('Любой')}
        meta={t('кто свободен')}
      >
        <input
          type='radio'
          name='specialist'
          className={styles.input}
          checked={value === ANY_SPECIALIST_ID}
          onChange={() => onChange(ANY_SPECIALIST_ID)}
          onClick={() => {
            if (value === ANY_SPECIALIST_ID) onReselect?.()
          }}
          aria-label={t('Любой мастер - подберём свободного на выбранное время')}
        />
        <Check className={styles.check} aria-hidden />
      </MasterCard>
      {specialists.map((specialist) => (
        <MasterCard
          key={specialist.id}
          specialist={specialist}
          className={styles.card}
          imageWidth={120}
        >
          <input
            type='radio'
            name='specialist'
            className={styles.input}
            checked={value === specialist.id}
            onChange={() => onChange(specialist.id)}
            onClick={() => {
              if (value === specialist.id) onReselect?.()
            }}
            aria-label={[specialist.name, specialist.role].filter(Boolean).join(', ')}
          />
          <Check className={styles.check} aria-hidden />
        </MasterCard>
      ))}
    </div>
  )
}
