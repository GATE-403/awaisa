'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { Select } from '@awaisa/ui/Select'
import { Skeleton } from '@awaisa/ui/Skeleton'
import type { FormEvent } from 'react'
import type { BusinessKind } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { useRequireSession } from '@/common/hooks/useRequireSession'
import { BUSINESS_KINDS } from '@/constants/platform'
import styles from './CreateBusinessPage.module.css'
import { useCreateBusinessForm } from './hooks/useCreateBusinessForm'

export const CreateBusinessPage = () => {
  const session = useRequireSession()
  const form = useCreateBusinessForm()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void form.submit()
  }

  return (
    <main className={styles.page}>
      <Container size='sm' className={styles.content}>
        <PageTitle
          size='sm'
          title='Новая страница.'
          subtitle='Остальное настроите потом в кабинете.'
        />

        {!session.customer && <Skeleton className={styles.skeleton} />}

        {session.customer && (
          <form className={styles.card} onSubmit={handleSubmit} noValidate>
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
            <Field label='Чем занимаетесь'>
              <Select
                aria-label='Чем занимаетесь'
                items={BUSINESS_KINDS}
                value={form.kind}
                onValueChange={(value) => value && form.setKind(value as BusinessKind)}
              />
            </Field>
            <div className={styles.row}>
              <Field label='Город'>
                <Input
                  value={form.city}
                  onValueChange={form.setCity}
                  autoComplete='address-level2'
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
                onValueChange={form.setPhone}
                autoComplete='tel'
              />
            </Field>
            <Button type='submit' size='lg' fullWidth disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Создаём…' : 'Создать страницу'}
            </Button>
          </form>
        )}
      </Container>
    </main>
  )
}
