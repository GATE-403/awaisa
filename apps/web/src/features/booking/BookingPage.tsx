'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import { UsersThree } from '@phosphor-icons/react/ssr'
import type { Business, Catalog } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import { PageTitle } from '@/common/components/PageTitle/PageTitle'
import { formatPhone } from '@/common/utils/formatPhone'
import { maskPhoneInput } from '@/common/utils/inputMasks'
import styles from './BookingPage.module.css'
import { ANY_SPECIALIST_ID } from './bookingConstants'
import { formatDayLong, formatDuration, formatPrice, getSpecialistLabel } from './bookingUtils'
import { BookingStep } from './components/BookingStep/BookingStep'
import { BookingSuccess } from './components/BookingSuccess/BookingSuccess'
import { BookingSummary } from './components/BookingSummary/BookingSummary'
import { DateTimePicker } from './components/DateTimePicker/DateTimePicker'
import { useBookingForm } from './hooks/useBookingForm'

interface BookingPageProps {
  business: Business
  catalog: Catalog
}

export const BookingPage = ({ business, catalog }: BookingPageProps) => {
  const form = useBookingForm(business, catalog)
  const specialistLabel = getSpecialistLabel(catalog, form.specialistId)

  if (form.createdBooking) {
    return (
      <main>
        <Container size='md'>
          <BookingSuccess booking={form.createdBooking} />
        </Container>
      </main>
    )
  }

  const summaryProps = {
    service: form.service,
    specialistLabel,
    dayKey: form.dayKey,
    time: form.time,
    firstIncompleteStep: form.firstIncompleteStep,
    isSubmitting: form.isSubmitting,
    errorMessage: form.submitError,
    onSubmit: form.submit,
  }

  return (
    <main className={styles.page}>
      <Container className={styles.layout}>
        <div className={styles.steps}>
          <PageTitle title='Запись.' subtitle={`${business.name}: четыре шага — около минуты.`} />

          {form.branches.length > 1 && (
            <section className={styles.branches} aria-label='Филиал'>
              <ToggleGroup
                aria-label='Филиал'
                layout='scroll'
                value={form.branchId ? [form.branchId] : []}
                onValueChange={(values) => {
                  const next = values.at(-1)
                  if (typeof next === 'string') form.selectBranch(next)
                }}
              >
                {form.branches.map((branch) => (
                  <Toggle key={branch.id} value={branch.id} size='sm'>
                    {branch.name}
                  </Toggle>
                ))}
              </ToggleGroup>
              <p className={styles.branchAddress}>
                {form.branches.find((branch) => branch.id === form.branchId)?.address}
              </p>
            </section>
          )}

          <BookingStep
            id='service'
            index={1}
            title='Услуга'
            summary={form.service?.name}
            isComplete={form.completedSteps.service}
            isCollapsed={form.isStepCollapsed('service')}
            onEdit={() => form.editStep('service')}
          >
            <RadioGroup
              variant='inset'
              aria-label='Услуга'
              value={form.serviceId}
              onValueChange={(value) => form.selectService(String(value))}
            >
              {form.services.map((service) => (
                <RadioCard
                  key={service.id}
                  value={service.id}
                  title={service.name}
                  description={formatDuration(service.durationMinutes)}
                  trailing={formatPrice(service.price)}
                />
              ))}
            </RadioGroup>
          </BookingStep>

          <BookingStep
            id='specialist'
            index={2}
            title='Мастер'
            summary={specialistLabel || undefined}
            isComplete={form.completedSteps.specialist}
            isCollapsed={form.isStepCollapsed('specialist')}
            onEdit={() => form.editStep('specialist')}
          >
            {form.service ? (
              <RadioGroup
                variant='inset'
                aria-label='Мастер'
                value={form.specialistId}
                onValueChange={(value) => form.selectSpecialist(String(value))}
              >
                <RadioCard
                  value={ANY_SPECIALIST_ID}
                  title='Любой мастер'
                  description='Подберём свободного на выбранное время'
                  leading={
                    <span className={styles.anyIcon}>
                      <UsersThree weight='fill' aria-hidden />
                    </span>
                  }
                />
                {form.specialists.map((specialist) => (
                  <RadioCard
                    key={specialist.id}
                    value={specialist.id}
                    title={specialist.name}
                    description={specialist.role}
                    leading={
                      <Avatar name={specialist.name} src={specialist.photoUrl ?? undefined} />
                    }
                    trailing={
                      specialist.rating === null ? undefined : `★ ${specialist.rating.toFixed(1)}`
                    }
                  />
                ))}
              </RadioGroup>
            ) : (
              <p className={styles.hint}>Сначала выберите услугу</p>
            )}
          </BookingStep>

          <BookingStep
            id='datetime'
            index={3}
            title='Дата и время'
            summary={
              form.dayKey && form.time ? `${formatDayLong(form.dayKey)}, ${form.time}` : undefined
            }
            isComplete={form.completedSteps.datetime}
            isCollapsed={form.isStepCollapsed('datetime')}
            onEdit={() => form.editStep('datetime')}
          >
            <DateTimePicker
              days={form.days}
              dayKey={form.dayKey}
              slots={form.availability.slots}
              isLoading={form.availability.isLoading}
              error={form.availability.error}
              onRetry={form.availability.reload}
              time={form.time}
              isSpecialistSelected={Boolean(form.specialistId)}
              onDayChange={form.selectDay}
              onTimeChange={form.selectTime}
            />
          </BookingStep>

          <BookingStep
            id='contacts'
            index={4}
            title='Контакты'
            isComplete={form.completedSteps.contacts}
          >
            <div className={styles.fields}>
              <Field label='Имя' error={form.errors.name}>
                <Input
                  value={form.name}
                  onValueChange={form.setName}
                  autoComplete='name'
                  placeholder='Как к вам обращаться'
                />
              </Field>
              {form.accountPhone ? (
                <p className={styles.accountPhone}>
                  Подтверждение и напоминание придут SMS на{' '}
                  <span className={styles.phone}>{formatPhone(form.accountPhone)}</span>
                </p>
              ) : (
                <Field
                  label='Телефон'
                  description='Пришлём подтверждение и напоминание'
                  error={form.errors.phone}
                >
                  <Input
                    type='tel'
                    inputMode='tel'
                    autoComplete='tel'
                    value={form.phone}
                    onValueChange={(value) => form.setPhone(maskPhoneInput(value))}
                    placeholder='+996 555 123 456'
                  />
                </Field>
              )}
              <Field label='Комментарий'>
                <Input
                  value={form.comment}
                  onValueChange={form.setComment}
                  placeholder='Необязательно'
                />
              </Field>
            </div>
          </BookingStep>
        </div>

        <aside className={styles.aside}>
          <BookingSummary variant='card' {...summaryProps} />
        </aside>
      </Container>

      <div className={styles.bar}>
        <BookingSummary variant='bar' {...summaryProps} />
      </div>
    </main>
  )
}
