'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
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
  { value: '60', label: 'За 1 час' },
  { value: '120', label: 'За 2 часа' },
  { value: '1440', label: 'За день' },
  { value: 'off', label: 'Не напоминать' },
]

// The client decides what reaches their phone and when — asked once, as Settings rows.
export const NotifyOptions = ({
  phone,
  smsConfirmation,
  onSmsConfirmationChange,
  reminderMinutes,
  onReminderChange,
}: NotifyOptionsProps) => (
  <section className={styles.group} aria-label='Уведомления'>
    <h3 className={styles.title}>Уведомления</h3>
    <div className={styles.list}>
      <label className={styles.row}>
        <span className={styles.label}>SMS с подтверждением</span>
        <Switch checked={smsConfirmation} onCheckedChange={onSmsConfirmationChange} />
      </label>
      <div className={styles.row}>
        <span className={styles.label}>Напомнить о визите</span>
        <Select
          variant='plain'
          aria-label='Когда напомнить'
          items={REMINDERS}
          value={reminderMinutes === null ? 'off' : String(reminderMinutes)}
          onValueChange={(value) =>
            onReminderChange(!value || value === 'off' ? null : (Number(value) as ReminderChoice))
          }
        />
      </div>
    </div>
    <p className={styles.footer}>
      {phone
        ? `Придут SMS на ${formatPhone(phone)}. Отменить запись можно в профиле.`
        : 'Придут SMS на номер, который вы укажете выше.'}
    </p>
  </section>
)
