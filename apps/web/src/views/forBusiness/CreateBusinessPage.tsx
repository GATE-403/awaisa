'use client'

import { Button } from '@awaisa/ui/Button'
import { Checkbox } from '@awaisa/ui/Checkbox'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import { Skeleton } from '@awaisa/ui/Skeleton'
import type { CSSProperties, FormEvent } from 'react'
import { formatDuration } from '@/entities/booking'
import { useRequireSession } from '@/entities/session'
import type { BusinessKind } from '@/shared/api/types'
import { KIND_ICONS, KIND_TINTS } from '@/shared/config/kindStyles'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { SERVICE_TEMPLATES } from '@/shared/config/serviceTemplates'
import { maskAmountInput, maskPhoneInput } from '@/shared/lib/inputMasks'
import { Container } from '@/shared/ui/Container/Container'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { useCreateBusinessForm } from '@/views/forBusiness/model/useCreateBusinessForm'
import styles from './CreateBusinessPage.module.css'

const STEP_TITLES = {
  name: { title: 'Как называется?', subtitle: ' Так вас найдут в каталоге.' },
  kind: { title: 'Чем занимаетесь?', subtitle: ' Подставим услуги — уберите лишнее.' },
  contacts: { title: 'Где вас найти?', subtitle: ' Остальное настроите в кабинете.' },
}

export const CreateBusinessPage = () => {
  const session = useRequireSession()
  const form = useCreateBusinessForm()
  const heading = STEP_TITLES[form.step]
  const isLast = form.stepNumber === form.stepCount

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    form.next()
  }

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            Шаг {form.stepNumber} из {form.stepCount}
          </p>
          <PageTitle size='sm' title={heading.title} subtitle={heading.subtitle} />
        </div>

        {!session.customer && <Skeleton className={styles.skeleton} />}

        {session.customer && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {form.step === 'name' && (
              <div className={styles.card}>
                <Field label='Название' error={form.errors.name}>
                  <Input
                    value={form.name}
                    onValueChange={form.setName}
                    placeholder='Например, Barber Pro'
                    autoComplete='organization'
                    autoFocus
                  />
                </Field>
                <Field
                  label='Адрес страницы'
                  error={form.errors.slug}
                  description={
                    form.isSlugAvailable
                      ? `Свободен: awaisa.kg/${form.slug}`
                      : 'Латиница, цифры и дефис'
                  }
                >
                  <div className={styles.slug}>
                    <span className={styles.slugPrefix} aria-hidden='true'>
                      awaisa.kg/
                    </span>
                    <Input
                      value={form.slug}
                      onValueChange={form.changeSlug}
                      placeholder='barber-pro'
                      autoCapitalize='none'
                      spellCheck={false}
                      className={styles.slugInput}
                    />
                  </div>
                </Field>
              </div>
            )}

            {form.step === 'kind' && (
              <>
                <RadioGroup
                  aria-label='Чем занимаетесь'
                  value={form.kind}
                  onValueChange={(value) => form.setKind(value as BusinessKind)}
                  className={styles.kinds}
                >
                  {BUSINESS_KINDS.map((kind) => {
                    const Glyph = KIND_ICONS[kind.value]
                    const examples = SERVICE_TEMPLATES[kind.value]
                      .slice(0, 2)
                      .map((item) => item.name.toLowerCase())
                    return (
                      <RadioCard
                        key={kind.value}
                        value={kind.value}
                        title={kind.label}
                        description={
                          examples.length > 0 ? `${examples.join(', ')}…` : 'Своё меню услуг'
                        }
                        leading={
                          <span
                            className={styles.kindTile}
                            style={{ '--tint': KIND_TINTS[kind.value] } as CSSProperties}
                            aria-hidden
                          >
                            <Glyph weight='fill' />
                          </span>
                        }
                      />
                    )
                  })}
                </RadioGroup>

                {form.templates.length > 0 ? (
                  <section className={styles.group} aria-label='Услуги'>
                    <h2 className={styles.groupTitle}>Услуги</h2>
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
                              {formatDuration(template.durationMinutes)}
                            </span>
                          </span>
                          <span className={styles.price}>
                            <Input
                              variant='plain'
                              inputMode='numeric'
                              aria-label={`Цена: ${template.name}, сом`}
                              value={maskAmountInput(template.price)}
                              onValueChange={(value) =>
                                form.editTemplate(template.name, {
                                  price: value.replace(/\D/g, ''),
                                  isChecked: true,
                                })
                              }
                              disabled={!template.isChecked}
                            />
                            <span className={styles.suffix}>сом</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.groupFooter}>
                      Цены и длительность можно поменять в кабинете в любой момент.
                    </p>
                  </section>
                ) : (
                  <p className={styles.groupFooter}>
                    Услуги добавите в кабинете — название, длительность и цену.
                  </p>
                )}
              </>
            )}

            {form.step === 'contacts' && (
              <div className={styles.card}>
                <div className={styles.row}>
                  <Field label='Город'>
                    <Input
                      value={form.city}
                      onValueChange={form.setCity}
                      autoComplete='address-level2'
                      autoFocus
                    />
                  </Field>
                  <Field label='Адрес'>
                    <Input
                      value={form.address}
                      onValueChange={form.setAddress}
                      placeholder='Необязательно'
                      autoComplete='street-address'
                    />
                  </Field>
                </div>
                <Field
                  label='Телефон для клиентов'
                  description='Покажем на странице и в WhatsApp-кнопке'
                >
                  <Input
                    type='tel'
                    inputMode='tel'
                    value={form.phone}
                    onValueChange={(value) => form.setPhone(maskPhoneInput(value))}
                    autoComplete='tel'
                  />
                </Field>
              </div>
            )}

            <div className={styles.actions}>
              <Button type='submit' size='lg' fullWidth disabled={form.isSubmitting}>
                {isLast ? (form.isSubmitting ? 'Создаём…' : 'Создать страницу') : 'Далее'}
              </Button>
              {form.stepNumber > 1 && (
                <Button type='button' variant='ghost' onClick={form.goBack}>
                  Назад
                </Button>
              )}
            </div>
          </form>
        )}
      </Container>
    </main>
  )
}
