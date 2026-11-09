'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import type { FormEvent } from 'react'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { CODE_LENGTH, useLoginForm } from '@/views/auth/model/useLoginForm'
import styles from './LoginPage.module.css'

const handleSubmit = (action: () => void) => (event: FormEvent) => {
  event.preventDefault()
  action()
}

export const LoginPage = () => {
  const form = useLoginForm()

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle size='sm' title='Вход.' subtitle='Номер телефона и код из SMS — без паролей.' />

        <section className={styles.card} aria-live='polite'>
          {form.step === 'phone' && (
            <form className={styles.form} onSubmit={handleSubmit(() => form.sendCode())}>
              <Field label='Номер телефона' error={form.error}>
                <Input
                  type='tel'
                  inputMode='tel'
                  autoComplete='tel'
                  placeholder='+996 555 123 456'
                  value={form.phone}
                  onValueChange={(value) => form.setPhone(maskPhoneInput(value))}
                  autoFocus
                />
              </Field>
              <Button type='submit' size='lg' fullWidth disabled={form.isSubmitting}>
                {form.isSubmitting ? 'Отправляем…' : 'Получить код'}
              </Button>
              <p className={styles.note}>
                Записи, сделанные на этот номер, появятся в профиле на любом устройстве.
              </p>
            </form>
          )}

          {form.step === 'code' && (
            <form className={styles.form} onSubmit={handleSubmit(() => form.verify(form.code))}>
              <p className={styles.lead}>
                {form.channel === 'telegram' ? 'Код отправлен в Telegram' : 'Код отправлен по SMS'}{' '}
                на <span className={styles.phone}>{formatPhone(form.normalizedPhone)}</span>
              </p>
              {form.channel === 'telegram' && (
                <p className={styles.note}>
                  Откройте Telegram — код придёт сообщением от официального чата Telegram.
                </p>
              )}
              <Field label='Код подтверждения' error={form.error}>
                <Input
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  maxLength={CODE_LENGTH}
                  placeholder='••••••'
                  className={styles.code}
                  value={form.code}
                  onValueChange={form.changeCode}
                  autoFocus
                />
              </Field>
              <Button
                type='submit'
                size='lg'
                fullWidth
                disabled={form.isSubmitting || form.code.length < CODE_LENGTH}
              >
                {form.isSubmitting ? 'Проверяем…' : 'Войти'}
              </Button>
              <div className={styles.links}>
                <Button variant='link' size='sm' onClick={form.editPhone}>
                  Изменить номер
                </Button>
                {form.channel === 'telegram' ? (
                  <Button
                    variant='link'
                    size='sm'
                    onClick={form.sendBySms}
                    disabled={form.isSubmitting}
                  >
                    Нет Telegram? Получить SMS
                  </Button>
                ) : (
                  <Button
                    variant='link'
                    size='sm'
                    onClick={form.sendBySms}
                    disabled={form.resendIn > 0 || form.isSubmitting}
                  >
                    {form.resendIn > 0
                      ? `Отправить снова через ${form.resendIn} с`
                      : 'Отправить снова'}
                  </Button>
                )}
              </div>
            </form>
          )}

          {form.step === 'name' && (
            <form className={styles.form} onSubmit={handleSubmit(form.saveName)}>
              <p className={styles.lead}>Вы вошли. Как к вам обращаться?</p>
              <Field label='Имя' error={form.error}>
                <Input
                  autoComplete='name'
                  placeholder='Имя'
                  value={form.name}
                  onValueChange={form.setName}
                  autoFocus
                />
              </Field>
              <Button
                type='submit'
                size='lg'
                fullWidth
                disabled={form.isSubmitting || !form.name.trim()}
              >
                Готово
              </Button>
            </form>
          )}
        </section>
      </Container>
    </main>
  )
}
