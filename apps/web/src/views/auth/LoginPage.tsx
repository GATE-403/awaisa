'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { OtpField } from '@awaisa/ui/OtpField'
import { CaretLeft, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type FormEvent, useEffect } from 'react'
import { PersonAvatar } from '@/entities/business'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { CODE_LENGTH, useLoginForm } from '@/views/auth/model/useLoginForm'
import { useTelegramLogin } from '@/views/auth/model/useTelegramLogin'
import { GradientFlow } from '@/views/auth/ui/GradientFlow/GradientFlow'
import { SignInTransition } from '@/views/auth/ui/SignInTransition/SignInTransition'
import styles from './LoginPage.module.css'

const handleSubmit = (action: () => void) => (event: FormEvent) => {
  event.preventDefault()
  action()
}

// Sign-in as a screen of its own — no site header, tab bar or footer: one quiet column on the
// page colour, one question at a time (number → code → name), like the system's own sign-in.
// It opens on slow living colour behind the mascot and ends with a wave of light.
export const LoginPage = () => {
  const form = useLoginForm()
  const telegram = useTelegramLogin(form.finishSignIn)
  const isWaitingForTelegram = form.step === 'phone' && telegram.isWaiting
  const { reset } = form

  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the page is hidden or left
  useEffect(() => () => reset(), [])

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        {form.step === 'code' || isWaitingForTelegram ? (
          <button
            type='button'
            className={styles.corner}
            onClick={isWaitingForTelegram ? telegram.cancel : form.editPhone}
            aria-label={isWaitingForTelegram ? 'Назад' : 'Изменить номер'}
          >
            <CaretLeft weight='bold' aria-hidden />
          </button>
        ) : (
          <NextLink href={form.redirectTo} className={styles.corner} aria-label='Закрыть'>
            <X weight='bold' aria-hidden />
          </NextLink>
        )}
      </div>

      <section className={styles.column} aria-live='polite'>
        {isWaitingForTelegram && (
          <div className={styles.form}>
            <TelegramMark className={styles.telegramMark} />
            <h1 className={styles.title}>Подтвердите в Telegram</h1>
            <p className={styles.lead}>
              Нажмите «Поделиться номером» в чате с ботом — и вернитесь сюда
            </p>
            <p className={styles.note}>Ждём ваш номер…</p>
            <div className={styles.links}>
              <ButtonLink
                href={telegram.href}
                target='_blank'
                rel='noreferrer'
                variant='link'
                size='sm'
              >
                Открыть Telegram снова
              </ButtonLink>
              <Button variant='link' size='sm' onClick={telegram.cancel}>
                Войти по SMS
              </Button>
            </div>
          </div>
        )}

        {form.step === 'phone' && !isWaitingForTelegram && (
          <form className={styles.welcome} onSubmit={handleSubmit(() => form.sendCode())}>
            <div className={styles.hero}>
              <GradientFlow />
              <span className={styles.badge} aria-hidden='true'>
                <Mascot />
              </span>
              <h1 className={styles.headline}>
                Запись к мастерам.
                <span className={styles.headlineMuted}> Без звонков.</span>
              </h1>
            </div>
            <div className={styles.actions}>
              <Field label='Номер телефона' error={form.error} className={styles.field}>
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
              {telegram.isAvailable && <span className={styles.or}>или</span>}
              {telegram.isAvailable && (
                // Without typing the number: the bot asks for it with one button.
                <ButtonLink
                  href={telegram.href}
                  target='_blank'
                  rel='noreferrer'
                  variant='secondary'
                  size='lg'
                  fullWidth
                  onClick={telegram.start}
                >
                  <TelegramMark className={styles.brand} />
                  Войти через Telegram
                </ButtonLink>
              )}
              {telegram.isExpired ? (
                <p className={styles.error} role='alert'>
                  Ссылка для входа устарела — нажмите «Войти через Telegram» ещё раз
                </p>
              ) : (
                <p className={styles.note}>Код придёт в Telegram или по SMS</p>
              )}
            </div>
          </form>
        )}

        {form.step === 'code' && (
          <form className={styles.form} onSubmit={handleSubmit(() => form.verify(form.code))}>
            <h1 className={styles.title}>Введите код</h1>
            <p className={styles.lead}>
              {form.channel === 'telegram' ? 'Код отправлен в Telegram' : 'Код отправлен по SMS'} на{' '}
              <span className={styles.phone}>{formatPhone(form.normalizedPhone)}</span>
            </p>
            <OtpField
              key={form.wrongAttempts}
              aria-label='Код подтверждения'
              length={CODE_LENGTH}
              value={form.code}
              onValueChange={form.changeCode}
              isInvalid={form.isCodeInvalid}
              disabled={form.isSubmitting}
              className={styles.otp}
              autoFocus
            />
            {form.error ? (
              <p className={styles.error} role='alert'>
                {form.error}
              </p>
            ) : (
              <p className={styles.note}>
                {form.isSubmitting
                  ? 'Проверяем…'
                  : form.channel === 'telegram'
                    ? 'Сообщение придёт от официального чата Telegram'
                    : 'Войдём, как только наберёте все цифры'}
              </p>
            )}
            <div className={styles.links}>
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
            <PersonAvatar name={form.name || form.normalizedPhone} size='lg' />
            <h1 className={styles.title}>Вы вошли</h1>
            <p className={styles.lead}>Как к вам обращаться?</p>
            <Field label='Имя' error={form.error} className={styles.field}>
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
      {form.isSignedIn && <SignInTransition name={form.signedInName} onDone={form.leave} />}
    </main>
  )
}
