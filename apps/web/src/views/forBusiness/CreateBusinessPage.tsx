'use client'

import { Button } from '@awaisa/ui/Button'
import { Checkbox } from '@awaisa/ui/Checkbox'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { CaretRight, Check, X } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'
import { BusinessTile, pickTint } from '@/entities/business'
import { useRequireSession } from '@/entities/session'
import { KIND_ICONS, KIND_TINTS } from '@/shared/config/kindStyles'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { SERVICE_TEMPLATES } from '@/shared/config/serviceTemplates'
import { useT } from '@/shared/i18n'
import { maskAmountInput, maskPhoneInput } from '@/shared/lib/inputMasks'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { useCreateBusinessForm } from '@/views/forBusiness/model/useCreateBusinessForm'
import { PageLaunch } from '@/views/forBusiness/ui/PageLaunch/PageLaunch'
import styles from './CreateBusinessPage.module.css'

/** The tile's colour follows the name once typing pauses: a colour per keystroke flickered. */
const TINT_DELAY_MS = 400
const PHONE_DIGITS = 12

const STEP_TITLES = {
  name: { title: 'What’s it called?', subtitle: ' This is how people find you in the catalogue.' },
  kind: { title: 'What do you do?', subtitle: ' We’ll fill in services for your menu.' },
  services: {
    title: 'What’s on the menu?',
    subtitle: ' Remove what you don’t need and fix the prices.',
  },
  contacts: {
    title: 'Where can clients find you?',
    subtitle: ' Set up the rest in the dashboard.',
  },
}

export const CreateBusinessPage = () => {
  const t = useT()
  const session = useRequireSession()
  const form = useCreateBusinessForm()
  const heading = STEP_TITLES[form.step]
  const isLast = form.stepNumber === form.stepCount
  const [tintName, setTintName] = useState(form.name)
  const kindLabel = BUSINESS_KINDS.find((kind) => kind.value === form.kind)?.label ?? ''
  const where = [form.city.trim(), form.address.trim()].filter(Boolean).join(', ')
  const previewFacts =
    form.step === 'name' || form.step === 'kind'
      ? [`awaisa.kg/${form.slug || 'barber-pro'}`]
      : [t(kindLabel), form.step === 'contacts' && where ? where : `awaisa.kg/${form.slug}`]
  // How much of each step is filled: the open step's segment grows as its fields are filled in.
  const stepFill = {
    name: (form.name.trim().length >= 2 ? 0.5 : 0) + (form.isSlugAvailable ? 0.5 : 0),
    kind: 0.5,
    services: 1,
    contacts:
      ((form.city.trim() ? 1 : 0) +
        (form.address.trim() ? 1 : 0) +
        (form.phone.replace(/\D/g, '').length >= PHONE_DIGITS ? 1 : 0)) /
      3,
  }
  const fills = (['name', 'kind', 'services', 'contacts'] as const).map((step, index) => {
    if (index + 1 < form.stepNumber) return 1
    if (index + 1 > form.stepNumber) return 0
    return Math.max(0.08, stepFill[step])
  })

  const { reset } = form
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the page is hidden or left
  useEffect(() => () => reset(), [])

  useEffect(() => {
    const timeout = window.setTimeout(() => setTintName(form.name.trim()), TINT_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [form.name])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    form.next()
  }

  return (
    <main
      className={styles.page}
      style={{ '--place-tint': pickTint(tintName || 'awaisa') } as CSSProperties}
    >
      <Container size='sm' className={styles.content}>
        {/* A screen of its own, like sign-in: ✕ back to the business landing, beside it how far
            along (done steps lit, the open one filling up as its fields are filled in). */}
        <div className={styles.topBar}>
          <NextLink href='/business' className={styles.close} aria-label={t('Close')}>
            <X aria-hidden />
          </NextLink>
          <div
            className={styles.progress}
            role='progressbar'
            aria-label={t('{done} of {total} done', {
              done: form.stepNumber - 1,
              total: form.stepCount,
            })}
            aria-valuemin={0}
            aria-valuemax={form.stepCount}
            aria-valuenow={form.stepNumber - 1}
          >
            {fills.map((fill, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: three fixed segments
                key={index}
                className={styles.segment}
                style={{ '--fill': fill } as CSSProperties}
              />
            ))}
          </div>
        </div>

        {/* The page as clients will see it, filled in live: the tile in the place's colour, the
            name, then the link, the kind and the address as they are given. */}
        <div className={styles.preview} aria-hidden='true'>
          <BusinessTile name={tintName || 'awaisa'} size='md' />
          <span className={styles.previewText}>
            <span className={styles.previewName} data-empty={!form.name.trim() || undefined}>
              {form.name.trim() || t('Your page')}
            </span>
            <span className={styles.previewFacts}>
              {previewFacts.map((fact) => (
                <span key={fact} className={styles.previewFact}>
                  {fact}
                </span>
              ))}
            </span>
          </span>
        </div>

        <div className={styles.heading}>
          <PageTitle size='sm' title={t(heading.title)} subtitle={t(heading.subtitle)} />
        </div>

        {!session.customer && <Skeleton className={styles.skeleton} />}

        {session.customer && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div key={form.step} className={styles.stepBody}>
              {form.step === 'name' && (
                // Settings rows right on the page: the label on the left, the value typed on the right.
                <div className={styles.rows}>
                  <Field label={t('Name')} error={form.errors.name} className={styles.fieldRow}>
                    <Input
                      variant='plain'
                      value={form.name}
                      onValueChange={form.setName}
                      placeholder={t('For example, Barber Pro')}
                      autoComplete='organization'
                      enterKeyHint='next'
                      autoFocus
                    />
                  </Field>
                  <Field
                    label={t('Link')}
                    error={form.errors.slug}
                    // «Адрес» read as the street: the link is said to be what clients get.
                    description={
                      form.isSlugAvailable
                        ? t('Available: awaisa.kg/{slug}, the link clients get', {
                            slug: form.slug,
                          })
                        : t('Latin letters, numbers and hyphens')
                    }
                    className={styles.fieldRow}
                  >
                    <span className={styles.slug}>
                      <span className={styles.slugPrefix} aria-hidden='true'>
                        awaisa.kg/
                      </span>
                      <Input
                        variant='plain'
                        value={form.slug}
                        onValueChange={form.changeSlug}
                        placeholder='barber-pro'
                        autoCapitalize='none'
                        spellCheck={false}
                        enterKeyHint='go'
                        className={styles.slugInput}
                      />
                    </span>
                  </Field>
                </div>
              )}

              {form.step === 'kind' && (
                // One tap picks the kind and moves on, like the first pick in booking: rows on
                // the page, the glyph bare in its colour, a check on the one chosen before.
                <ul className={styles.kinds} aria-label={t('What you do')}>
                  {BUSINESS_KINDS.map((kind) => {
                    const Glyph = KIND_ICONS[kind.value]
                    const examples = SERVICE_TEMPLATES[kind.value]
                      .slice(0, 2)
                      .map((item) => item.name.toLowerCase())
                    const isChosen = form.hasPickedKind && kind.value === form.kind
                    return (
                      <li key={kind.value}>
                        <button
                          type='button'
                          className={styles.kind}
                          onClick={() => form.pickKind(kind.value)}
                          aria-current={isChosen || undefined}
                        >
                          <Glyph
                            className={styles.kindGlyph}
                            style={{ '--tint': KIND_TINTS[kind.value] } as CSSProperties}
                            aria-hidden
                          />
                          <span className={styles.kindBody}>
                            <span className={styles.kindTitle}>{t(kind.label)}</span>
                            <span className={styles.kindNote}>
                              {examples.length > 0
                                ? examples.join(', ')
                                : t('Your own service menu')}
                            </span>
                          </span>
                          {isChosen ? (
                            <Check className={styles.kindCheck} aria-hidden />
                          ) : (
                            <CaretRight className={styles.kindChevron} aria-hidden />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {form.step === 'services' &&
                (form.templates.length > 0 ? (
                  <section className={styles.group} aria-label={t('Services')}>
                    <ul className={styles.list}>
                      {form.templates.map((template) => (
                        <li key={template.name} className={styles.serviceRow}>
                          <Checkbox
                            aria-label={template.name}
                            checked={template.isChecked}
                            onCheckedChange={(checked) =>
                              form.editTemplate(template.name, { isChecked: checked })
                            }
                          />
                          <span
                            className={styles.serviceText}
                            data-off={!template.isChecked || undefined}
                          >
                            <span className={styles.serviceName}>{template.name}</span>
                            <span className={styles.serviceMeta}>
                              {t.duration(template.durationMinutes)}
                            </span>
                          </span>
                          <span className={styles.price}>
                            <Input
                              variant='plain'
                              inputMode='numeric'
                              aria-label={t('Price: {name}, som', { name: template.name })}
                              value={maskAmountInput(template.price)}
                              onValueChange={(value) =>
                                form.editTemplate(template.name, {
                                  price: value.replace(/\D/g, ''),
                                  isChecked: true,
                                })
                              }
                              disabled={!template.isChecked}
                            />
                            <span className={styles.suffix}>{t('som')}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.groupFooter}>
                      {t('You can change prices and durations in the dashboard any time.')}
                    </p>
                  </section>
                ) : (
                  <p className={styles.groupFooter}>
                    {t('Add services in the dashboard: name, duration and price.')}
                  </p>
                ))}

              {form.step === 'contacts' && (
                <div className={styles.rows}>
                  <Field label={t('City')} className={styles.fieldRow}>
                    <Input
                      variant='plain'
                      value={form.city}
                      onValueChange={form.setCity}
                      autoComplete='address-level2'
                      enterKeyHint='next'
                      autoFocus
                    />
                  </Field>
                  <Field label={t('Address')} className={styles.fieldRow}>
                    <Input
                      variant='plain'
                      value={form.address}
                      onValueChange={form.setAddress}
                      placeholder={t('Optional')}
                      autoComplete='street-address'
                      enterKeyHint='next'
                    />
                  </Field>
                  <Field
                    label={t('Phone')}
                    description={t('Shown on the page and the WhatsApp button')}
                    className={styles.fieldRow}
                  >
                    <Input
                      variant='plain'
                      type='tel'
                      inputMode='tel'
                      value={form.phone}
                      onValueChange={(value) => form.setPhone(maskPhoneInput(value))}
                      autoComplete='tel'
                      enterKeyHint='done'
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* A content-width capsule at the column's end with «Назад» before it: a full-width
                bar took all the attention from the form («кнопка забирает всё внимание»). */}
            <div className={styles.actions}>
              {form.stepNumber > 1 && (
                <Button type='button' variant='ghost' onClick={form.goBack} className={styles.back}>
                  {t('Back')}
                </Button>
              )}
              {form.step !== 'kind' && (
                <Button type='submit' disabled={form.isSubmitting} className={styles.next}>
                  {isLast ? t(form.isSubmitting ? 'Creating…' : 'Create a page') : t('Next')}
                </Button>
              )}
            </div>
          </form>
        )}
      </Container>
      {form.launched && (
        <PageLaunch name={form.name.trim()} slug={form.launched.slug} onDone={form.openCabinet} />
      )}
    </main>
  )
}
