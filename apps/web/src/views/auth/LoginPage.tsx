'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { OtpField } from '@awaisa/ui/OtpField'
import { CaretLeft, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type FormEvent, useEffect, useRef } from 'react'
import { PersonAvatar } from '@/entities/business'
import { PHONE_PREFIX } from '@/shared/config/region'
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

// The fixed «+996» before the field: the field holds only what follows it.
const PREFIX_PATTERN = new RegExp(`^\\${PHONE_PREFIX}\\s?`)

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
            aria-label={isWaitingForTelegram ? t('Back') : t('Change the number')}
          >
            <CaretLeft aria-hidden />
          </button>
        ) : (
          <NextLink href={form.closeTo} className={styles.corner} aria-label={t('Close')}>
            <X aria-hidden />
          </NextLink>
        )}
      </div>

      <section className={styles.column} aria-live='polite'>
        {isWaitingForTelegram && (
          <div className={styles.form}>
            <TelegramMark className={styles.telegramMark} />
            <h1 className={styles.title}>{t('Confirm in Telegram')}</h1>
            <p className={styles.lead}>
              {t('Tap “Share my number” in the chat with the bot, then come back here')}
            </p>
            <p className={styles.note}>{t('Waiting for your number…')}</p>
            <div className={styles.links}>
              <ButtonLink
                href={telegram.href}
                target='_blank'
                rel='noreferrer'
                variant='link'
                size='sm'
              >
                {t('Open Telegram again')}
              </ButtonLink>
              {telegram.isCodeAvailable && (
                <Button variant='link' size='sm' onClick={telegram.cancel}>
                  {t('Enter the number')}
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
                {t('Book your specialist.')}
                <span className={styles.headlineSecond}> {t('No calls.')}</span>
              </h1>
              {/* The number is typed right on the colour in big digits, no box around it. Still
                  a real tel input (keyboard, contact autofill, paste, the label); «+996» is
                  already there and the caret starts after it. Without a way to send the code
                  (no Telegram Gateway in production) only the bot is offered. */}
              {telegram.isCodeAvailable && (
                <Field label={t('Phone number')} error={form.error} className={styles.number}>
                  <span className={styles.numberRow}>
                    <span
                      className={styles.numberPrefix}
                      aria-hidden='true'
                      onPointerDown={(event) => {
                        event.preventDefault()
                        phoneInputRef.current?.focus()
                      }}
                    >
                      {PHONE_PREFIX}
                    </span>
                    <Input
                      ref={phoneInputRef}
                      type='tel'
                      inputMode='tel'
                      autoComplete='tel'
                      placeholder='555 123 456'
                      value={form.phone.replace(PREFIX_PATTERN, '')}
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
                  {form.isSubmitting ? t('Sending…') : t('Get a code in Telegram')}
                </Button>
              )}
              {telegram.isCodeAvailable && telegram.isAvailable && (
                <span className={styles.or}>{t('or')}</span>
              )}
              {telegram.isAvailable && (
                // Without typing the number: the bot asks for it with one button.
                <ButtonLink
                  href={telegram.href}
                  target='_blank'
                  rel='noreferrer'
                  // Alone it is the main action, in white: the accent blue under Telegram's own blue
                  // mark clashed (the owner: the blue button and Telegram's icon did not go together).
                  variant={telegram.isCodeAvailable ? 'secondary' : 'contrast'}
                  size='lg'
                  fullWidth
                  onClick={telegram.start}
                >
                  <TelegramMark className={styles.brand} />
                  {t('Sign in with Telegram')}
                </ButtonLink>
              )}
              {telegram.isExpired ? (
                <p className={styles.error} role='alert'>
                  {t('The sign-in link has expired: tap “Sign in with Telegram” again')}
                </p>
              ) : (
                telegram.isCodeAvailable && (
                  <p className={styles.note}>{t('The code comes in Telegram')}</p>
                )
              )}
            </div>
          </form>
        )}

        {form.step === 'code' && (
          <form className={styles.form} onSubmit={handleSubmit(() => form.verify(form.code))}>
            <h1 className={styles.title}>{t('Enter the code')}</h1>
            <p className={styles.lead}>
              {t('The code was sent in Telegram to {phone}', {
                phone: formatPhone(form.normalizedPhone),
              })}
            </p>
            <OtpField
              key={form.wrongAttempts}
              aria-label={t('Confirmation code')}
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
                  ? t('Checking…')
                  : t('The message comes from the official Telegram chat')}
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
                  ? t('Send again in {seconds} s', { seconds: form.resendIn })
                  : t('Send again')}
              </Button>
            </div>
          </form>
        )}

        {form.step === 'name' && (
          <form className={styles.form} onSubmit={handleSubmit(form.saveName)}>
            <PersonAvatar name={form.name || form.normalizedPhone} size='lg' />
            <h1 className={styles.title}>{t('You are signed in')}</h1>
            <p className={styles.lead}>{t('What should we call you?')}</p>
            <Field label={t('Name')} error={form.error} className={styles.field}>
              <Input
                autoComplete='name'
                placeholder={t('Name')}
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
              {t('Done')}
            </Button>
          </form>
        )}
      </section>
      {form.isSignedIn && <SignInTransition name={form.signedInName} onDone={form.leave} />}
    </main>
  )
}
