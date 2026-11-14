'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { RadioGroup } from '@awaisa/ui/Radio'
import { RadioCard } from '@awaisa/ui/RadioCard'
import {
  CalendarBlank,
  CaretRight,
  ChatCircleText,
  Check,
  Scissors,
  User,
} from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import {
  ANY_SPECIALIST_ID,
  addDayKey,
  DateTimePicker,
  formatDayLong,
  formatDuration,
  formatPrice,
  getSpecialistLabel,
  getSpecialistsForService,
} from '@/entities/booking'
import { rememberService, trackBookedPick } from '@/features/forYou'
import { useRecentVisits } from '@/features/rebook'
import { WaitlistJoin } from '@/features/waitlist'
import type { Business, Catalog } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { formatDistance } from '@/shared/lib/geo'
import { usePageScrollLock } from '@/shared/lib/hooks/usePageScrollLock'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { Container } from '@/shared/ui/Container/Container'
import { type BookingStepId, useBookingForm } from '@/views/booking/model/useBookingForm'
import { type QuickSlot, useQuickSlots } from '@/views/booking/model/useQuickSlots'
import { useServicesNextFree } from '@/views/booking/model/useServicesNextFree'
import { BookingReview } from '@/views/booking/ui/BookingReview/BookingReview'
import { BookingStep } from '@/views/booking/ui/BookingStep/BookingStep'
import { BookingSuccess } from '@/views/booking/ui/BookingSuccess/BookingSuccess'
import { BookingSummary } from '@/views/booking/ui/BookingSummary/BookingSummary'
import { BookingScrim, BookingTopBar } from '@/views/booking/ui/BookingTopBar/BookingTopBar'
import { MasterPicker } from '@/views/booking/ui/MasterPicker/MasterPicker'
import { NotifyOptions } from '@/views/booking/ui/NotifyOptions/NotifyOptions'
import { PlaceReviews } from '@/views/booking/ui/PlaceReviews/PlaceReviews'
import { PromoCodeField } from '@/views/booking/ui/PromoCodeField/PromoCodeField'
import { QuickSlots } from '@/views/booking/ui/QuickSlots/QuickSlots'
import styles from './BookingPage.module.css'

interface BookingPageProps {
  business: Business
  catalog: Catalog
  /** Opened over the page it was tapped on (an intercepted route), not as a page of its own. */
  isModal?: boolean
}

export const BookingPage = ({ business, catalog, isModal = false }: BookingPageProps) => {
  const form = useBookingForm(business, catalog)
  const serviceTimes = useServicesNextFree(business.slug, form.branchId ?? undefined)
  // «Сегодня с 15:30» on each service row: the choice shows when one could come, not only what.
  const soonLabel = (serviceId: string) => {
    const next = serviceTimes?.[serviceId]
    const todayKey = form.today?.dayKey
    if (!next || !todayKey) return null
    if (next.date === todayKey) return `Сегодня с ${next.time}`
    if (next.date === addDayKey(todayKey, 1)) return `Завтра с ${next.time}`
    return null
  }
  usePageScrollLock()
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const [isReviewRequested, setIsReviewRequested] = useState(false)
  const specialistLabel = getSpecialistLabel(catalog, form.specialistId)
  const recentVisits = useRecentVisits()
  const chosenServiceId = form.serviceId
  const bookedServiceId = form.createdBooking?.serviceId ?? null

  // What the client looks at and books teaches the picks (on this device, see features/forYou).
  useEffect(() => {
    if (chosenServiceId) rememberService(chosenServiceId)
  }, [chosenServiceId])

  useEffect(() => {
    if (bookedServiceId) trackBookedPick(bookedServiceId)
  }, [bookedServiceId])
  // Quick times only for a returning client, before anything is chosen: «Как в прошлый раз» with
  // the last visit's service and master. A generic «Ближайшее время» above the steps was taken
  // for the date-and-time step itself, so new clients go through the steps.
  const isQuickShownStep =
    form.firstIncompleteStep === 'service' || form.firstIncompleteStep === 'specialist'
  const canDo = (serviceId: string, specialistId: string) =>
    getSpecialistsForService(catalog, serviceId).some(
      (specialist) =>
        specialist.id === specialistId &&
        (!form.branchId || !specialist.branchId || specialist.branchId === form.branchId),
    )
  const lastVisit = recentVisits.find(
    (visit) =>
      visit.business.slug === business.slug &&
      form.services.some((service) => service.id === visit.serviceId) &&
      canDo(visit.serviceId, visit.specialistId),
  )
  const isLastVisitShown = !form.service && !form.specialistId && Boolean(lastVisit)
  const isQuickShown = isQuickShownStep && isLastVisitShown
  const quickService =
    form.service ??
    (isLastVisitShown
      ? form.services.find((service) => service.id === lastVisit?.serviceId)
      : (form.services.find((service) => service.isPopular) ?? form.services[0])) ??
    null
  const quickSpecialistId =
    form.specialistId ?? (isLastVisitShown ? lastVisit?.specialistId : null) ?? ANY_SPECIALIST_ID
  const quick = useQuickSlots({
    serviceId: quickService?.id ?? null,
    specialistId: quickSpecialistId,
    branchId: form.branchId,
    dayKeys: form.openDayKeys,
    isEnabled: isQuickShown && Boolean(quickService),
  })
  const quickMaster =
    quickSpecialistId === ANY_SPECIALIST_ID
      ? 'любой мастер'
      : getSpecialistLabel(catalog, quickSpecialistId)

  if (form.createdBooking) {
    return (
      <>
        <BookingScrim slug={business.slug} isModal={isModal} />
        <main className={styles.page} data-booking-screen=''>
          <BookingTopBar business={business} isModal={isModal} />
          <Container size='md'>
            <BookingSuccess booking={form.createdBooking} />
          </Container>
        </main>
      </>
    )
  }

  // Everything filled: the action books at once — a separate «check» press made people think
  // they were done and leave without booking. The check card shows only after a quick time was
  // picked with one tap, so that tap never books by itself.
  const isReviewing = form.firstIncompleteStep === null && isReviewRequested

  // Contacts known (a returning guest, or signed in): the tap goes straight to the check.
  const pickQuickSlot = (slot: QuickSlot) => {
    if (!quickService) return
    form.pickSlot({
      serviceId: quickService.id,
      specialistId: quickSpecialistId,
      dayKey: slot.dayKey,
      time: slot.time,
    })
    if (!form.hasContacts) return
    setIsReviewRequested(true)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
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
    submitLabel: undefined,
    quote: form.quote,
    place: { name: business.name, coverUrl: business.coverUrl },
    address:
      form.branches.find((branch) => branch.id === form.branchId)?.address ??
      business.address ??
      null,
    onStepOpen: (step: BookingStepId) => {
      setIsReviewRequested(false)
      form.editStep(step)
      document
        .getElementById(`step-${step}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }

  return (
    <>
      <BookingScrim slug={business.slug} isModal={isModal} />
      <main className={styles.page} data-booking-screen=''>
        <BookingTopBar business={business} isModal={isModal} />
        <Container className={styles.layout} data-reviewing={isReviewing || undefined}>
          <div className={styles.steps}>
            {form.branches.length > 1 && (
              <section className={styles.branches} aria-labelledby='booking-branch'>
                {/* Where to come, said plainly: each branch is a row with its full address and
                    how far it is, the chosen one checked — two chips with district names left
                    people unsure where they were going. */}
                <h2 id='booking-branch' className={styles.branchCaption}>
                  Куда приедете
                </h2>
                <fieldset className={`${styles.group} ${styles.branchList}`}>
                  <legend className={styles.srOnly}>Филиал</legend>
                  {form.branches.map((branch) => {
                    const distance = form.branchDistances?.[branch.id]
                    const isChosen = form.branchId === branch.id
                    return (
                      <label key={branch.id} className={styles.branchRow}>
                        <input
                          type='radio'
                          name='booking-branch'
                          className={styles.branchRadio}
                          checked={isChosen}
                          onChange={() => form.selectBranch(branch.id)}
                        />
                        <span className={styles.branchText}>
                          <span className={styles.branchName}>{branch.name}</span>
                          <span className={styles.branchAddress}>
                            {branch.address}
                            {distance !== undefined && ` · ${formatDistance(distance)}`}
                          </span>
                        </span>
                        {isChosen && (
                          <Check weight='bold' className={styles.branchCheck} aria-hidden />
                        )}
                      </label>
                    )
                  })}
                </fieldset>
                {(() => {
                  const chosen = form.branches.find((branch) => branch.id === form.branchId)
                  if (!chosen || chosen.latitude === null || chosen.longitude === null) return null
                  return (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${chosen.latitude},${chosen.longitude}`}
                      target='_blank'
                      rel='noreferrer'
                      className={styles.branchRoute}
                    >
                      Маршрут до «{chosen.name}» ›
                    </a>
                  )
                })()}
              </section>
            )}

            {isQuickShown && quickService && (
              <QuickSlots
                title={isLastVisitShown ? 'Как в прошлый раз' : 'Ближайшее время'}
                subtitle={`${quickService.name}, ${quickMaster}`}
                slots={quick.slots}
                isLoading={quick.isLoading}
                todayKey={form.today?.dayKey ?? null}
                onPick={pickQuickSlot}
              />
            )}

            {isReviewing && form.service && form.dayKey && form.time ? (
              <BookingReview
                business={business}
                branchAddress={
                  form.branches.find((branch) => branch.id === form.branchId)?.address ??
                  business.address ??
                  null
                }
                service={form.service ?? null}
                specialist={
                  catalog.specialists.find((specialist) => specialist.id === form.specialistId) ??
                  null
                }
                dayKey={form.dayKey}
                time={form.time}
                name={form.name}
                phone={form.accountPhone ?? form.phone}
                comment={form.comment}
                quote={form.quote}
                onEdit={summaryProps.onStepOpen}
                action={
                  <>
                    <Button size='lg' fullWidth onClick={form.submit} disabled={form.isSubmitting}>
                      {form.isSubmitting ? 'Записываем…' : 'Записаться'}
                    </Button>
                    {form.submitError && (
                      <p className={styles.submitError} role='alert'>
                        {form.submitError}
                      </p>
                    )}
                  </>
                }
              />
            ) : (
              <>
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
                        description={
                          // Length and what is done on one quiet line: rows stay one height, and
                          // the chosen one shows the description whole.
                          <span className={styles.serviceNote}>
                            {soonLabel(service.id) && (
                              <span className={styles.serviceSoon}>{soonLabel(service.id)} · </span>
                            )}
                            {formatDuration(service.durationMinutes)}
                            {service.description.trim() && ` · ${service.description.trim()}`}
                          </span>
                        }
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
                  hint={form.service ? undefined : 'Сначала выберите услугу'}
                  isComplete={form.completedSteps.specialist}
                  isCollapsed={form.isStepCollapsed('specialist')}
                  onToggle={() => form.toggleStep('specialist')}
                >
                  {form.service ? (
                    <MasterPicker
                      specialists={form.specialists}
                      value={form.specialistId}
                      onChange={form.selectSpecialist}
                    />
                  ) : (
                    <p className={styles.hint}>Сначала выберите услугу</p>
                  )}
                </BookingStep>

                <BookingStep
                  id='datetime'
                  icon={CalendarBlank}
                  title='Дата и время'
                  summary={
                    form.dayKey && form.time
                      ? `${formatDayLong(form.dayKey)}, ${form.time}`
                      : undefined
                  }
                  hint={
                    !form.service
                      ? 'Сначала выберите услугу'
                      : !form.specialistId
                        ? 'Сначала выберите мастера'
                        : undefined
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
                    fullDayAction={
                      form.serviceId && form.specialistId && form.dayKey ? (
                        <WaitlistJoin
                          serviceId={form.serviceId}
                          specialistId={form.specialistId}
                          branchId={form.branchId ?? undefined}
                          date={form.dayKey}
                          dayLabel={formatDayLong(form.dayKey)}
                        />
                      ) : null
                    }
                  />
                </BookingStep>

                <BookingStep
                  id='contacts'
                  summary={
                    form.isStepCollapsed('contacts') && form.name.trim()
                      ? `${form.name.trim()} · ${formatPhone(form.accountPhone ?? form.phone)}`
                      : undefined
                  }
                  icon={ChatCircleText}
                  isCollapsed={form.isStepCollapsed('contacts')}
                  onToggle={() => form.toggleStep('contacts')}
                  title='Контакты'
                  isComplete={form.completedSteps.contacts}
                >
                  <div className={styles.fields}>
                    {/* Settings-style rows: the label on the left, the value typed on the right. */}
                    <div className={styles.group}>
                      <Field label='Имя' error={form.errors.name} className={styles.fieldRow}>
                        <Input
                          variant='plain'
                          value={form.name}
                          onValueChange={form.setName}
                          autoComplete='name'
                          placeholder='Как к вам обращаться'
                        />
                      </Field>
                      {form.accountPhone ? null : (
                        <Field
                          label='Телефон'
                          error={form.errors.phone}
                          className={styles.fieldRow}
                        >
                          <Input
                            variant='plain'
                            type='tel'
                            inputMode='tel'
                            autoComplete='tel'
                            value={form.phone}
                            onValueChange={(value) => form.setPhone(maskPhoneInput(value))}
                            placeholder='+996 555 123 456'
                          />
                        </Field>
                      )}
                    </div>
                    {/* Optional extras as a second group of the same Settings rows: a note and a
                        code read like the name and number above, not like loose buttons. */}
                    <div className={styles.group}>
                      {isCommentOpen || form.comment ? (
                        <>
                          <div className={styles.fieldRow} data-action=''>
                            <span className={styles.extraLabel}>Комментарий</span>
                            <span />
                            {/* Folds back and forgets the note: an extra is never a trap. */}
                            <button
                              type='button'
                              className={styles.rowAction}
                              onClick={() => {
                                form.setComment('')
                                setIsCommentOpen(false)
                              }}
                            >
                              Убрать
                            </button>
                          </div>
                          <textarea
                            className={styles.commentArea}
                            aria-label='Комментарий'
                            value={form.comment}
                            onChange={(event) => form.setComment(event.target.value)}
                            placeholder='Например, «нужна парковка»'
                            rows={3}
                            maxLength={500}
                          />
                        </>
                      ) : (
                        <button
                          type='button'
                          className={styles.fieldRow}
                          data-action=''
                          onClick={() => setIsCommentOpen(true)}
                        >
                          <span className={styles.extraLabel}>Комментарий</span>
                          <span className={styles.extraValue}>Добавить</span>
                          <CaretRight weight='bold' aria-hidden className={styles.extraChevron} />
                        </button>
                      )}
                      <PromoCodeField
                        className={styles.fieldRow}
                        code={form.promoCode}
                        error={form.promoCodeError}
                        quote={form.quote}
                        isWaitingForTime={!form.time}
                        onApply={form.applyPromoCode}
                        onClear={form.clearPromoCode}
                      />
                    </div>
                  </div>
                  <NotifyOptions
                    phone={form.accountPhone ?? (form.phone.trim() || null)}
                    smsConfirmation={form.smsConfirmation}
                    onSmsConfirmationChange={form.setSmsConfirmation}
                    reminderMinutes={form.reminderMinutes}
                    onReminderChange={form.setReminderMinutes}
                  />
                </BookingStep>
              </>
            )}

            {/* Under the form and set well apart from it (a wide gap), so it reads as something to
                look at, not another step. Nothing here leads away: picks of other places live on
                the success screen, not in the middle of a booking. */}
            <aside className={styles.after} aria-label='Дополнительно'>
              <PlaceReviews
                slug={business.slug}
                businessName={business.name}
                service={form.service ?? null}
              />
            </aside>
          </div>

          {!isReviewing && (
            <aside className={styles.aside}>
              <BookingSummary variant='card' {...summaryProps} />
            </aside>
          )}
        </Container>

        <div className={styles.bar}>
          <BookingSummary variant='bar' {...summaryProps} />
        </div>
      </main>
    </>
  )
}
