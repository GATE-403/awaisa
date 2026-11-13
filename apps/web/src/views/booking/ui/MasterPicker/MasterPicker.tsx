import { Check, Star, UsersThree } from '@phosphor-icons/react/ssr'
import { ANY_SPECIALIST_ID } from '@/entities/booking'
import { monogramTint, PersonAvatar } from '@/entities/business'
import type { Specialist } from '@/shared/api/types'
import styles from './MasterPicker.module.css'

interface MasterPickerProps {
  specialists: Specialist[]
  value: string | null
  onChange: (id: string) => void
}

// Masters as a row of faces, like picking a contact to share with: the face, first name and
// rating; the chosen one gets an accent ring and a check. Native radios underneath.
export const MasterPicker = ({ specialists, value, onChange }: MasterPickerProps) => (
  <div className={styles.row} role='radiogroup' aria-label='Мастер'>
    <label className={styles.option}>
      <input
        type='radio'
        name='specialist'
        className={styles.input}
        checked={value === ANY_SPECIALIST_ID}
        onChange={() => onChange(ANY_SPECIALIST_ID)}
        aria-label='Любой мастер — подберём свободного на выбранное время'
      />
      <span className={styles.face} data-any=''>
        <span className={styles.anyIcon}>
          <UsersThree weight='fill' aria-hidden />
        </span>
        <Check className={styles.check} weight='bold' aria-hidden />
      </span>
      <span className={styles.name}>Любой</span>
      <span className={styles.meta}>кто свободен</span>
    </label>
    {specialists.map((specialist) => {
      const [first, ...rest] = specialist.name.split(' ')
      return (
        <label key={specialist.id} className={styles.option}>
          <input
            type='radio'
            name='specialist'
            className={styles.input}
            checked={value === specialist.id}
            onChange={() => onChange(specialist.id)}
            aria-label={[specialist.name, specialist.role].filter(Boolean).join(', ')}
          />
          <span className={styles.face} style={monogramTint(specialist.name)}>
            <PersonAvatar name={specialist.name} src={specialist.photoUrl ?? undefined} size='lg' />
            <Check className={styles.check} weight='bold' aria-hidden />
          </span>
          <span className={styles.name} title={[first, ...rest].join(' ')}>
            {first}
          </span>
          <span className={styles.meta}>
            {specialist.rating === null ? (
              specialist.role || 'Мастер'
            ) : (
              <>
                <Star weight='fill' aria-hidden className={styles.star} />
                {specialist.rating.toFixed(1)}
              </>
            )}
          </span>
        </label>
      )
    })}
  </div>
)
