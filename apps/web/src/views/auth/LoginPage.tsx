'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { OtpField } from '@awaisa/ui/OtpField'
import { CaretLeft, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type FormEvent, useEffect, useRef } from 'react'
import { PersonAvatar } from '@/entities/business'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { maskLocalPhoneInput } from '@/shared/lib/inputMasks'
import { TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { STEP_TURN } from '@/views/auth/config/scene'
import { CODE_LENGTH, useLoginForm } from '@/views/auth/model/useLoginForm'
import { useTelegramLogin } from '@/views/auth/model/useTelegramLogin'
import { GradientFlow } from '@/views/auth/ui/GradientFlow/GradientFlow'
import { SignInTransition } from '@/views/auth/ui/SignInTransition/SignInTransition'
import styles from './LoginPage.module.css'

const handleSubmit = (action: () => void) => (event: FormEvent) => {
  event.preventDefault()
  action()
}

// Sign-in as a screen of its own - no site header, tab bar or footer: one quiet column on the
// page colour, one question at a time (number → code → name), like the system's own sign-in.
// It opens on slow living colour behind the mascot and ends with a wave of light.
export const LoginPage = () => {
  const t = useT()
  const form = useLoginForm()
  const phoneInputRef = useRef<HTMLInputElement>(null)
  const telegram = useTelegramLogin(form.finishSignIn)
  const isWaitingForTelegram = form.step === 'phone' && telegram.isWaiting
  const { reset } = form

  // Each step turns the prism a little further, so the light moves with the person.
  const turn = isWaitingForTelegram ? 1 : STEP_TURN[form.step]

  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the page is hidden or left
  useEffect(() => () => reset(), [])

  return (
    // A dark scene in either theme, every step: the light through a prism needs a dark wall.
    <main className={styles.page} data-scene='dark' data-signed-in={form.isSignedIn || undefined}>
      <GradientFlow turn={turn} flare={form.isSignedIn ? 1 : 0} />
      <div className={styles.topBar}>
        {form.step === 'code' || isWaitingForTelegram ? (
          <button
            type='button'
            className={styles.corner}
            onClick={isWaitingForTelegram ? telegram.cancel : form.editPhone}
            aria-label={isWaitingForTelegram ? t('Назад') : t('Изменить номер')}
          >
            <CaretLeft aria-hidden />
          </button>
        ) : (
          <NextLink href={form.closeTo} className={styles.corner} aria-label={t('Закрыть')}>
            <X aria-hidden />
          </NextLink>
        )}
      </div>

      <section className={styles.column} aria-live='polite'>
        {isWaitingForTelegram && (
          <div className={styles.form}>
            <TelegramMark className={styles.telegramMark} />
            <h1 className={styles.title}>{t('Подтвердите в Telegram')}</h1>
            <p className={styles.lead}>
              {t('Нажмите «Поделиться номером» в чате с ботом - и вернитесь сюда')}
            </p>
            <p className={styles.note}>{t('Ждём ваш номер…')}</p>
            <div className={styles.links}>
              <ButtonLink
                href={telegram.href}
                target='_blank'
                rel='noreferrer'
                variant='link'
                size='sm'
              >
                {t('Открыть Telegram снова')}
              </ButtonLink>
              {telegram.isCodeAvailable && (
                <Button variant='link' size='sm' onClick={telegram.cancel}>
                  {t('Ввести номер')}
                </Button>
              )}
            </div>
          </div>
        )}

        {form.step === 'phone' && !isWaitingForTelegram && (
          <form className={styles.welcome} onSubmit={handleSubmit(() => form.sendCode())}>
            <div className={styles.hero}>
              <Mascot className={styles.mark} />
              <h1 className={styles.headline}>
                {t('Запись к мастерам.')}
                <span className={styles.headlineSecond}> {t('Без звонков.')}</span>
              </h1>
              {/* The number is typed right on the colour in big digits, no box around it. Still
                  a real tel input (keyboard, contact autofill, paste, the label); «+996» is
                  already there and the caret starts after it. Without a way to send the code
                  (no Telegram Gateway in production) only the bot is offered. */}
              {telegram.isCodeAvailable && (
                <Field label={t('Номер телефона')} error={form.error} className={styles.number}>
                  <span className={styles.numberRow}>
                    <span
                      className={styles.numberPrefix}
                      aria-hidden='true'
                      onPointerDown={(event) => {
                        event.preventDefault()
                        phoneInputRef.current?.focus()
                      }}
                    >
                      +996
                    </span>
                    <Input
                      ref={phoneInputRef}
                      type='tel'
                      inputMode='tel'
                      autoComplete='tel'
                      placeholder='555 123 456'
                      value={form.phone.replace(/^\+996\s?/, '')}
                      onValueChange={(value) => form.setPhone(maskLocalPhoneInput(value))}
                      className={styles.numberInput}
                      autoFocus
                    />
                  </span>
                </Field>
              )}
            </div>
            <div className={styles.actions}>
              {telegram.isCodeAvailable && (
                <Button type='submit' size='lg' fullWidth disabled={form.isSubmitting}>
                  {form.isSubmitting ? t('Отправляем…') : t('Получить код в Telegram')}
                </Button>
              )}
              {telegram.isCodeAvailable && telegram.isAvailable && (
                <span className={styles.or}>{t('или')}</span>
              )}
              {telegram.isAvailable && (
                // Without typing the number: the bot asks for it with one button.
                <ButtonLink
                  href={telegram.href}
                  target='_blank'
                  rel='noreferrer'
                  variant={telegram.isCodeAvailable ? 'secondary' : 'primary'}
                  size='lg'
                  fullWidth
                  onClick={telegram.start}
                >
                  <TelegramMark className={styles.brand} />
                  {t('Войти через Telegram')}
                </ButtonLink>
              )}
              {telegram.isExpired ? (
                <p className={styles.error} role='alert'>
                  {t('Ссылка для входа устарела - нажмите «Войти через Telegram» ещё раз')}
                </p>
              ) : (
                telegram.isCodeAvailable && (
                  <p className={styles.note}>{t('Код придёт в Telegram')}</p>
                )
              )}
            </div>
          </form>
        )}

        {form.step === 'code' && (
          <form className={styles.form} onSubmit={handleSubmit(() => form.verify(form.code))}>
            <h1 className={styles.title}>{t('Введите код')}</h1>
            <p className={styles.lead}>
              {t('Код отправлен в Telegram на {phone}', {
                phone: formatPhone(form.normalizedPhone),
              })}
            </p>
            <OtpField
              key={form.wrongAttempts}
              aria-label={t('Код подтверждения')}
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
                  ? t('Проверяем…')
                  : t('Сообщение придёт от официального чата Telegram')}
              </p>
            )}
            <div className={styles.links}>
              <Button
                variant='link'
                size='sm'
                onClick={() => form.sendCode()}
                disabled={form.resendIn > 0 || form.isSubmitting}
              >
                {form.resendIn > 0
                  ? t('Отправить снова через {seconds} с', { seconds: form.resendIn })
                  : t('Отправить снова')}
              </Button>
            </div>
          </form>
        )}

        {form.step === 'name' && (
          <form className={styles.form} onSubmit={handleSubmit(form.saveName)}>
            <PersonAvatar name={form.name || form.normalizedPhone} size='lg' />
            <h1 className={styles.title}>{t('Вы вошли')}</h1>
            <p className={styles.lead}>{t('Как к вам обращаться?')}</p>
            <Field label={t('Имя')} error={form.error} className={styles.field}>
              <Input
                autoComplete='name'
                placeholder={t('Имя')}
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
              {t('Готово')}
            </Button>
          </form>
        )}
      </section>
      {form.isSignedIn && <SignInTransition name={form.signedInName} onDone={form.leave} />}
    </main>
  )
}
