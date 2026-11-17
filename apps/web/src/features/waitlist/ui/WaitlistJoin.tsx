'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { useToast } from '@awaisa/ui/Toast'
import { BellRinging, CheckCircle } from '@phosphor-icons/react/ssr'
import { type FormEvent, useEffect, useState } from 'react'
import { readContact, saveContact } from '@/entities/booking'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { joinWaitlist } from '@/shared/api/clientApi'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackFormError, trackStep } from '@/shared/lib/telemetry'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { saveWaitlistEntry, useStoredWaitlist } from '../model/waitlistStorage'
import styles from './WaitlistJoin.module.css'

interface WaitlistJoinProps {
  serviceId: string
  /** A master's id or `any`. */
  specialistId: string
  branchId?: string
  date: string
  /** «Среда, 12 ноября» — shown in the sheet and the toast. */
  dayLabel: string
}

const FORM_ID = 'waitlist-form'

// A full day is not a dead end: leave a number and get one SMS when a time opens up.
export const WaitlistJoin = ({
  serviceId,
  specialistId,
  branchId,
  date,
  dayLabel,
}: WaitlistJoinProps) => {
  const session = useSession()
  const toast = useToast()
  const stored = useStoredWaitlist()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<{ field: 'name' | 'phone'; message: string } | null>(
    null,
  )
  const [isSending, setIsSending] = useState(false)
  const accountPhone = session.customer?.phone ?? null
  const joined = stored.find(
    ({ snapshot }) =>
      snapshot.status === 'waiting' &&
      snapshot.date === date &&
      snapshot.service.id === serviceId &&
      (snapshot.specialist?.id ?? 'any') === specialistId,
  )

  // Shown only on a full day: how many who hit one leave a number rather than go.
  useEffect(() => {
    trackStep('full_day_shown')
  }, [])

  const open = () => {
    const contact = readContact()
    setName(session.customer?.name || contact?.name || '')
    setPhone(contact?.phone ?? '')
    setError(null)
    setFieldError(null)
    setIsOpen(true)
    trackStep('waitlist_open')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    // Field errors sit under their field and mark it invalid; the alert below the form is for
    // what the server says.
    if (!name.trim()) {
      setFieldError({ field: 'name', message: 'Укажите имя' })
      trackFormError('waitlist_name')
      return
    }
    if (!accountPhone && phone.replace(/\D/g, '').length < 9) {
      setFieldError({ field: 'phone', message: 'Укажите номер — на него придёт SMS' })
      trackFormError('waitlist_phone')
      return
    }
    setFieldError(null)
    setIsSending(true)
    try {
      const { token, ...entry } = await joinWaitlist({
        serviceId,
        specialistId,
        branchId,
        date,
        name: name.trim(),
        phone: accountPhone ?? phone,
      })
      saveWaitlistEntry({ id: entry.id, token, snapshot: entry })
      if (!accountPhone) saveContact({ name: name.trim(), phone })
      trackStep('waitlist_joined')
      haptic('success')
      setIsOpen(false)
      toast.show({
        title: 'Сообщим, если освободится',
        description: `${dayLabel}: SMS придёт, как только время освободится`,
        type: 'success',
      })
    } catch (joinError) {
      setError(getErrorMessage(joinError))
    } finally {
      setIsSending(false)
    }
  }

  if (joined) {
    return (
      <p className={styles.joined} aria-live='polite'>
        <CheckCircle weight='fill' aria-hidden />
        Ждём окна на этот день — пришлём SMS
      </p>
    )
  }

  return (
    <>
      <Button variant='outline' onClick={open} className={styles.button}>
        <BellRinging weight='fill' aria-hidden />
        Сообщить, когда освободится
      </Button>
      {isOpen && (
        <Sheet
          title='Лист ожидания'
          onClose={() => setIsOpen(false)}
          action={{
            label: isSending ? 'Отправляем…' : 'Готово',
            form: FORM_ID,
            disabled: isSending,
          }}
        >
          <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
            <p className={styles.lead}>
              {dayLabel}: если кто-то отменит запись, пришлём одно SMS со ссылкой на это время.
            </p>
            <Field
              label='Имя'
              error={fieldError?.field === 'name' ? fieldError.message : undefined}
            >
              <Input value={name} onValueChange={setName} autoComplete='name' />
            </Field>
            {accountPhone ? (
              <p className={styles.phone}>SMS придёт на {formatPhone(accountPhone)}</p>
            ) : (
              <Field
                label='Телефон'
                error={fieldError?.field === 'phone' ? fieldError.message : undefined}
              >
                <Input
                  type='tel'
                  inputMode='tel'
                  autoComplete='tel'
                  value={phone}
                  onValueChange={(value) => setPhone(maskPhoneInput(value))}
                  placeholder='+996 555 123 456'
                />
              </Field>
            )}
            {error && (
              <p className={styles.error} role='alert'>
                {error}
              </p>
            )}
          </form>
        </Sheet>
      )}
    </>
  )
}
