'use client'

import { Avatar } from '@awaisa/ui/Avatar'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import { Toggle, ToggleGroup } from '@awaisa/ui/ToggleGroup'
import {
  CalendarBlank,
  ChatCircleText,
  Scissors,
  User,
  UsersThree,
} from '@phosphor-icons/react/ssr'
import {
  ANY_SPECIALIST_ID,
  formatDayLong,
  formatDuration,
  formatPrice,
  getSpecialistLabel,
} from '@/entities/booking'
import type { Business, Catalog } from '@/shared/api/types'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { Container } from '@/shared/ui/Container/Container'
import { type BookingStepId, useBookingForm } from '@/views/booking/model/useBookingForm'
import { BookingStep } from '@/views/booking/ui/BookingStep/BookingStep'
import { BookingSuccess } from '@/views/booking/ui/BookingSuccess/BookingSuccess'
import { BookingSummary } from '@/views/booking/ui/BookingSummary/BookingSummary'
import { BookingScrim, BookingTopBar } from '@/views/booking/ui/BookingTopBar/BookingTopBar'
import { DateTimePicker } from '@/views/booking/ui/DateTimePicker/DateTimePicker'
import { NotifyOptions } from '@/views/booking/ui/NotifyOptions/NotifyOptions'
import styles from './BookingPage.module.css'

interface BookingPageProps {
  business: Business
  catalog: Catalog
}

export const BookingPage = ({ business, catalog }: BookingPageProps) => {
  const form = useBookingForm(business, catalog)
  const specialistLabel = getSpecialistLabel(catalog, form.specialistId)

  if (form.createdBooking) {
    return (
      <>
        <BookingScrim slug={business.slug} />
        <main className={styles.page} data-booking-screen=''>
          <BookingTopBar business={business} />
          <Container size='md'>
            <BookingSuccess booking={form.createdBooking} />
          </Container>
        </main>
      </>
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
    onStepOpen: (step: BookingStepId) => {
      form.editStep(step)
      document
        .getElementById(`step-${step}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }

  return (
    <>
      <BookingScrim slug={business.slug} />
      <main className={styles.page} data-booking-screen=''>
        <BookingTopBar business={business} />
        <Container className={styles.layout}>
          <div className={styles.steps}>
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
              icon={Scissors}
              title='Услуга'
              summary={form.service?.name}
              isComplete={form.completedSteps.service}
              isCollapsed={form.isStepCollapsed('service')}
              onToggle={() => form.toggleStep('service')}
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
              icon={User}
              title='Мастер'
              summary={specialistLabel || undefined}
              isComplete={form.completedSteps.specialist}
              isCollapsed={form.isStepCollapsed('specialist')}
              onToggle={() => form.toggleStep('specialist')}
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
              icon={CalendarBlank}
              title='Дата и время'
              summary={
                form.dayKey && form.time ? `${formatDayLong(form.dayKey)}, ${form.time}` : undefined
              }
              isComplete={form.completedSteps.datetime}
              isCollapsed={form.isStepCollapsed('datetime')}
              onToggle={() => form.toggleStep('datetime')}
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
              icon={ChatCircleText}
              isCollapsed={form.isStepCollapsed('contacts')}
              onToggle={() => form.toggleStep('contacts')}
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
                {form.accountPhone ? null : (
                  <Field label='Телефон' error={form.errors.phone}>
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
                {/* Most visits need no note: the field waits behind a link. */}
                <details className={styles.more} open={form.comment !== '' || undefined}>
                  <summary className={styles.moreSummary}>Добавить комментарий</summary>
                  <Field label='Комментарий'>
                    <Input
                      value={form.comment}
                      onValueChange={form.setComment}
                      placeholder='Например, «нужна парковка»'
                    />
                  </Field>
                </details>
              </div>
              <NotifyOptions
                phone={form.accountPhone ?? (form.phone.trim() || null)}
                smsConfirmation={form.smsConfirmation}
                onSmsConfirmationChange={form.setSmsConfirmation}
                reminderMinutes={form.reminderMinutes}
                onReminderChange={form.setReminderMinutes}
              />
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
    </>
  )
}
