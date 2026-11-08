'use client'

import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import type { Catalog } from '@/common/api/types'
import { Container } from '@/common/components/Container/Container'
import styles from './BookingPage.module.css'
import { ANY_SPECIALIST_ID } from './bookingConstants'
import { formatDayLong, formatDuration, formatPrice, getSpecialistLabel } from './bookingUtils'
import { BookingStep } from './components/BookingStep/BookingStep'
import { BookingSuccess } from './components/BookingSuccess/BookingSuccess'
import { BookingSummary } from './components/BookingSummary/BookingSummary'
import { DateTimePicker } from './components/DateTimePicker/DateTimePicker'
import { useBookingForm } from './hooks/useBookingForm'

interface BookingPageProps {
  catalog: Catalog
}

export const BookingPage = ({ catalog }: BookingPageProps) => {
  const form = useBookingForm(catalog)
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
          <h1 className={styles.title}>Запись</h1>

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
              aria-label='Услуга'
              value={form.serviceId}
              onValueChange={(value) => form.selectService(String(value))}
            >
              {form.services.map((service) => (
                <RadioCard
                  key={service.id}
                  value={service.id}
                  title={service.name}
                  description={`${formatDuration(service.durationMinutes)} · ${formatPrice(service.price)}`}
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
                aria-label='Мастер'
                value={form.specialistId}
                onValueChange={(value) => form.selectSpecialist(String(value))}
              >
                <RadioCard
                  value={ANY_SPECIALIST_ID}
                  title='Любой мастер'
                  description='Подберём свободного на выбранное время'
                />
                {form.specialists.map((specialist) => (
                  <RadioCard
                    key={specialist.id}
                    value={specialist.id}
                    title={specialist.name}
                    description={`${specialist.role} · ★ ${specialist.rating.toFixed(1)}`}
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
                  onValueChange={form.setPhone}
                  placeholder='+996 555 123 456'
                />
              </Field>
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
