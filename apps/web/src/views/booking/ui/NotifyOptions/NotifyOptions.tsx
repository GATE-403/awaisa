'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import type { ReminderChoice } from '../../model/useBookingForm'
import styles from './NotifyOptions.module.css'

interface NotifyOptionsProps {
  phone: string | null
  smsConfirmation: boolean
  onSmsConfirmationChange: (value: boolean) => void
  reminderMinutes: ReminderChoice
  onReminderChange: (value: ReminderChoice) => void
}

const REMINDERS: { value: string; label: string }[] = [
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: 'A day before' },
  { value: 'off', label: 'No reminder' },
]

// The client decides what reaches their phone and when - asked once, as Settings rows.
export const NotifyOptions = ({
  phone,
  smsConfirmation,
  onSmsConfirmationChange,
  reminderMinutes,
  onReminderChange,
}: NotifyOptionsProps) => {
  const t = useT()
  const reminders = REMINDERS.map((item) => ({ ...item, label: t(item.label) }))
  // Folded into one line: the defaults suit most people, the rest opens on demand.
  return (
    <details className={styles.group}>
      <summary className={styles.summary}>
        <span>
          {smsConfirmation ? t('SMS confirmation') : t('No SMS')}
          {' · '}
          {reminderMinutes === null
            ? t('no reminder')
            : t('reminder {when}', {
                when:
                  reminders
                    .find((item) => item.value === String(reminderMinutes))
                    ?.label.toLowerCase() ?? '',
              })}
        </span>
        <span className={styles.change}>{t('Change')}</span>
      </summary>
      <div className={styles.list}>
        <label className={styles.row}>
          <span className={styles.labelText}>
            <span className={styles.label}>{t('Confirmation SMS')}</span>
            {/* Inside the row, not a footnote under the group: it says where that SMS goes. */}
            {phone && (
              <span className={styles.sublabel}>
                {t('to {phone}', { phone: formatPhone(phone) })}
              </span>
            )}
          </span>
          <Switch checked={smsConfirmation} onCheckedChange={onSmsConfirmationChange} />
        </label>
        <div className={styles.row}>
          <span className={styles.label}>{t('Remind me')}</span>
          <Select
            variant='plain'
            aria-label={t('When to remind')}
            items={reminders}
            value={reminderMinutes === null ? 'off' : String(reminderMinutes)}
            onValueChange={(value) =>
              onReminderChange(!value || value === 'off' ? null : (Number(value) as ReminderChoice))
            }
          />
        </div>
      </div>
    </details>
  )
}
