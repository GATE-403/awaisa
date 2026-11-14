import { Check, Star, UsersThree } from '@phosphor-icons/react/ssr'
import type { CSSProperties } from 'react'
import { ANY_SPECIALIST_ID } from '@/entities/booking'
import { pickTint } from '@/entities/business'
import type { Specialist } from '@/shared/api/types'
import { sizedImage } from '@/shared/lib/imageSizes'
import { WreathBadge } from '@/shared/ui/Wreath/Wreath'
import styles from './MasterPicker.module.css'

interface MasterPickerProps {
  specialists: Specialist[]
  value: string | null
  onChange: (id: string) => void
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

// Masters as the business page's picture cards (photo or initials on their colour, first name and
// rating on the scrim), so the face picked here is the one seen there. The chosen card gets an
// accent ring and a check; native radios cover each card.
export const MasterPicker = ({ specialists, value, onChange }: MasterPickerProps) => (
  <div className={styles.row} role='radiogroup' aria-label='Мастер' data-edge-fade=''>
    <label className={styles.card} data-any='' data-card=''>
      <input
        type='radio'
        name='specialist'
        className={styles.input}
        checked={value === ANY_SPECIALIST_ID}
        onChange={() => onChange(ANY_SPECIALIST_ID)}
        aria-label='Любой мастер — подберём свободного на выбранное время'
      />
      <span className={styles.anyIcon} aria-hidden>
        <UsersThree weight='fill' />
      </span>
      <span className={styles.caption}>
        <span className={styles.name}>Любой</span>
        <span className={styles.meta}>кто свободен</span>
      </span>
      <Check className={styles.check} weight='bold' aria-hidden />
    </label>
    {specialists.map((specialist) => (
      <label
        key={specialist.id}
        className={styles.card}
        data-card=''
        style={{ '--tint': pickTint(specialist.name) } as CSSProperties}
      >
        <input
          type='radio'
          name='specialist'
          className={styles.input}
          checked={value === specialist.id}
          onChange={() => onChange(specialist.id)}
          aria-label={[specialist.name, specialist.role].filter(Boolean).join(', ')}
        />
        {specialist.photoUrl ? (
          // biome-ignore lint/performance/noImgElement: sized CDN/WebP pictures
          <img
            {...sizedImage(specialist.photoUrl, 120)}
            alt=''
            className={styles.photo}
            data-card-media=''
            loading='lazy'
            decoding='async'
          />
        ) : (
          <span className={styles.initials} aria-hidden>
            {initialsOf(specialist.name)}
          </span>
        )}
        {specialist.rank && <WreathBadge rank={specialist.rank} className={styles.wreath} />}
        <span className={styles.caption}>
          <span className={styles.name}>{specialist.name.split(' ')[0]}</span>
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
        </span>
        <Check className={styles.check} weight='bold' aria-hidden />
      </label>
    ))}
  </div>
)
