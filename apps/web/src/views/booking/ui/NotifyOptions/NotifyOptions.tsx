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
  // Folded into one line: the defaults suit most people, the rest opens on demand.
  <details className={styles.group}>
    <summary className={styles.summary}>
      <span>
        {smsConfirmation ? 'SMS-подтверждение' : 'Без SMS'}
        {' · '}
        {reminderMinutes === null
          ? 'без напоминания'
          : `напомним ${REMINDERS.find((item) => item.value === String(reminderMinutes))?.label.toLowerCase()}`}
      </span>
      <span className={styles.change}>Изменить</span>
    </summary>
    <div className={styles.list}>
      <label className={styles.row}>
        <span className={styles.labelText}>
          <span className={styles.label}>SMS с подтверждением</span>
          {/* Inside the row, not a footnote under the group: it says where that SMS goes. */}
          {phone && <span className={styles.sublabel}>на {formatPhone(phone)}</span>}
        </span>
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
  </details>
)
