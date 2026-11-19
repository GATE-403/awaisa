import { CaretRight, ChatCircle, Phone } from '@phosphor-icons/react/ssr'
import { formatPhone } from '@/shared/lib/formatPhone'
import { WhatsappMark } from '@/shared/ui/BrandLogo/BrandLogo'
import styles from './ContactRows.module.css'

interface ContactRowsProps {
  /** E.164, as the API gives it. */
  phone: string
  /** The group's fill: `sheet` inside sheets, `page` on a page's background. */
  surface?: 'sheet' | 'page'
}

// Ways to reach a person as iOS Settings rows: a coloured glyph tile, the action, and the number
// on the call row — one tap each, nothing to guess.
export const ContactRows = ({ phone, surface = 'sheet' }: ContactRowsProps) => {
  const digits = phone.replace(/\D/g, '')

  return (
    <ul className={styles.list} data-surface={surface} aria-label='Связаться'>
      <li>
        <a href={`tel:${phone}`} className={styles.row}>
          <span className={styles.glyph} data-tone='call' aria-hidden>
            <Phone weight='fill' />
          </span>
          <span className={styles.label}>Позвонить</span>
          <span className={styles.value}>{formatPhone(phone)}</span>
        </a>
      </li>
      <li>
        <a href={`https://wa.me/${digits}`} target='_blank' rel='noreferrer' className={styles.row}>
          <span className={styles.glyph} data-tone='whatsapp' aria-hidden>
            <WhatsappMark />
          </span>
          <span className={styles.label}>WhatsApp</span>
          <CaretRight weight='bold' className={styles.chevron} aria-hidden />
        </a>
      </li>
      <li>
        <a href={`sms:${phone}`} className={styles.row}>
          <span className={styles.glyph} data-tone='sms' aria-hidden>
            <ChatCircle weight='fill' />
          </span>
          <span className={styles.label}>SMS</span>
          <CaretRight weight='bold' className={styles.chevron} aria-hidden />
        </a>
      </li>
    </ul>
  )
}
