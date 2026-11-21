'use client'

import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { haptic } from '@/shared/lib/nativeBridge'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { AUDIENCE_NOTES, DENIED_HINT, INSTALL_HINT } from '../../config/copy'
import { usePushAlerts } from '../../model/usePushAlerts'

interface PushAlertsGroupProps {
  /** The business's people hear about every client booking, a master only about their own. */
  audience: 'business' | 'master'
  /** The host's list look, so the row lies on the page like the rows around it. */
  listClassName?: string
}

// «Уведомлять о записях» on this device, as a Settings row with a switch. The browser's prompt
// comes only from this switch, never on load.
export const PushAlertsGroup = ({ audience, listClassName }: PushAlertsGroupProps) => {
  const toast = useToast()
  const { state, enable, disable } = usePushAlerts()
  const [isBusy, setIsBusy] = useState(false)

  if (state === 'checking' || state === 'unsupported') return null

  const handleChange = async (isOn: boolean) => {
    setIsBusy(true)
    try {
      if (!isOn) await disable()
      const isDone = isOn ? await enable() : true
      if (isDone) {
        haptic('success')
        toast.show({
          title: isOn ? 'Уведомления включены' : 'Уведомления выключены',
          type: 'success',
        })
      }
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className={sheet.group} aria-label='Уведомления на этом устройстве'>
      <SectionCaption>На этом устройстве</SectionCaption>
      {state === 'install' ? (
        <RowNote>{INSTALL_HINT}</RowNote>
      ) : (
        <>
          <div className={listClassName}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>Уведомлять о записях</span>
              <Switch
                checked={state === 'on'}
                disabled={isBusy || state === 'denied'}
                onCheckedChange={(isOn) => void handleChange(isOn)}
              />
            </label>
          </div>
          <RowNote>{state === 'denied' ? DENIED_HINT : AUDIENCE_NOTES[audience]}</RowNote>
        </>
      )}
    </section>
  )
}
