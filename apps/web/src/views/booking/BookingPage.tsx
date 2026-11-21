'use client'

import { Button } from '@awaisa/ui/Button'
import { Field } from '@awaisa/ui/Field'
import { Input } from '@awaisa/ui/Input'
import { CaretRight, Check, MapPin, UsersThree } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  ANY_SPECIALIST_ID,
  addDayKey,
  DateTimePicker,
  formatPrice,
  getSpecialistLabel,
  getSpecialistsForService,
  Ticket,
} from '@/entities/booking'
import { PersonAvatar, pickTint } from '@/entities/business'
import { rememberService, trackBookedPick } from '@/features/forYou'
import { useRecentVisits } from '@/features/rebook'
import { WaitlistJoin } from '@/features/waitlist'
import type { Booking, Business, Catalog } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { formatDistance } from '@/shared/lib/geo'
import { useInertOutside } from '@/shared/lib/hooks/useInertOutside'
import { usePageScrollLock } from '@/shared/lib/hooks/usePageScrollLock'
import { sizedImage } from '@/shared/lib/imageSizes'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { trackStep } from '@/shared/lib/telemetry'
import { Container } from '@/shared/ui/Container/Container'
import { type BookingStepId, useBookingForm } from '@/views/booking/model/useBookingForm'
import { type QuickSlot, useQuickSlots } from '@/views/booking/model/useQuickSlots'
import { useServicesNextFree } from '@/views/booking/model/useServicesNextFree'
import { BookingReview } from '@/views/booking/ui/BookingReview/BookingReview'
import { BookingStep } from '@/views/booking/ui/BookingStep/BookingStep'
import { BookingSuccess } from '@/views/booking/ui/BookingSuccess/BookingSuccess'
import { BookingSummary } from '@/views/booking/ui/BookingSummary/BookingSummary'
import { BookingScrim, BookingTopBar } from '@/views/booking/ui/BookingTopBar/BookingTopBar'
import { CardStack, type StackCardProps } from '@/views/booking/ui/CardStack/CardStack'
import { MasterPicker } from '@/views/booking/ui/MasterPicker/MasterPicker'
import { NotifyOptions } from '@/views/booking/ui/NotifyOptions/NotifyOptions'
import { PlaceReviews } from '@/views/booking/ui/PlaceReviews/PlaceReviews'
import { PromoCodeField } from '@/views/booking/ui/PromoCodeField/PromoCodeField'
import { QuickSlots } from '@/views/booking/ui/QuickSlots/QuickSlots'
import { ServicePicker } from '@/views/booking/ui/ServicePicker/ServicePicker'
import {
  SubscriptionPaymentNote,
  SubscriptionPaymentRow,
} from '@/views/booking/ui/SubscriptionPayment/SubscriptionPayment'
import styles from './BookingPage.module.css'

interface BookingPageProps {
  business: Business
  catalog: Catalog
  /** Opened over the page it was tapped on (an intercepted route), not as a page of its own. */
  isModal?: boolean
  /** A work photo per service (`listServicePhotos`), for the service cards. */
  servicePhotos?: Record<string, string>
}

const addMinutes = (time: string, minutes: number) => {
  const [hours = 0, mins = 0] = time.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const BookingPage = ({
  business,
  catalog,
  isModal = false,
  servicePhotos,
}: BookingPageProps) => {
  const t = useT()
  const form = useBookingForm(business, catalog)
  const serviceTimes = useServicesNextFree(business.slug, form.branchId ?? undefined)
  // «Сегодня с 15:30» on each service row: the choice shows when one could come, not only what.
  const soonLabel = (serviceId: string) => {
    const next = serviceTimes?.[serviceId]
    const todayKey = form.today?.dayKey
    if (!next || !todayKey) return null
    if (next.date === todayKey) return t('Сегодня с {time}', { time: next.time })
    if (next.date === addDayKey(todayKey, 1)) return t('Завтра с {time}', { time: next.time })
    return null
  }
  usePageScrollLock()
  const screenRef = useRef<HTMLElement>(null)
  // The deposit's terms reached the screen before the name and number were asked for.
  const trackDepositShown = (node: HTMLElement | null) => {
    if (node) trackStep('deposit_shown', business.slug)
  }
  useInertOutside(screenRef, Boolean(form.createdBooking))
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const [isReviewRequested, setIsReviewRequested] = useState(false)
  // The contacts fold into a card too, once the number is whole (or «Готово» is pressed), so the
  // last step closes like the others and «Всё готово» says what is left: one press.
  const [isContactsDone, setIsContactsDone] = useState(false)
  const [isBranchOpen, setIsBranchOpen] = useState(false)
  // The free time under the ruler's needle: the bar's one action takes it («Выбрать 12:00»).
  const [rulerTime, setRulerTime] = useState<string | null>(null)
  const foldTimer = useRef<number | undefined>(undefined)
  const specialistLabel = t(getSpecialistLabel(catalog, form.specialistId))
  const recentVisits = useRecentVisits()
  const chosenServiceId = form.serviceId
  const bookedServiceId = form.createdBooking?.serviceId ?? null
  const bookedId = form.createdBooking?.id ?? null

  // What the client looks at and books teaches the picks (on this device, see features/forYou).
  useEffect(() => {
    if (chosenServiceId) rememberService(chosenServiceId)
  }, [chosenServiceId])

  useEffect(() => {
    if (bookedServiceId && bookedId) trackBookedPick(bookedServiceId, bookedId)
  }, [bookedServiceId, bookedId])

  // The funnel: how far people get before they leave (see shared/lib/telemetry).
  const {
    service: hasService,
    specialist: hasMaster,
    datetime: hasTime,
    contacts: hasContacts,
  } = form.completedSteps
  const slug = business.slug
  useEffect(() => {
    trackStep('booking_open', slug)
  }, [slug])
  useEffect(() => {
    if (hasService) trackStep('service', slug)
    if (hasMaster) trackStep('specialist', slug)
    if (hasTime) trackStep('time', slug)
    if (hasContacts) trackStep('contacts', slug)
  }, [hasService, hasMaster, hasTime, hasContacts, slug])
  useEffect(() => {
    if (bookedServiceId) trackStep('booked', slug)
  }, [bookedServiceId, slug])
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
      ? t('любой мастер')
      : getSpecialistLabel(catalog, quickSpecialistId)

  // One open step under a stack of done ones: the step being changed, else the first unfinished,
  // and contacts once everything is chosen.
  const activeStep: BookingStepId = form.editingStep ?? form.firstIncompleteStep ?? 'contacts'
  const contactsReady = form.firstIncompleteStep === null
  const isContactsFolded = isContactsDone && activeStep === 'contacts' && contactsReady
  // Away from contacts (a taken time sends the client back to the times), they open again.
  useEffect(() => {
    if (activeStep === 'contacts') return
    window.clearTimeout(foldTimer.current)
    setIsContactsDone(false)
  }, [activeStep])
  useEffect(() => {
    if (isContactsFolded)
      document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [isContactsFolded])

  if (form.createdBooking) {
    return (
      <>
        <BookingScrim slug={business.slug} isModal={isModal} />
        <main
          ref={screenRef}
          className={styles.page}
          data-booking-screen=''
          data-sheet-drag=''
          style={{ '--place-tint': pickTint(business.name) } as CSSProperties}
        >
          <div className={styles.wash} aria-hidden />
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

  // «Шаг 2 из 4» over the question: where one is, said where one looks (the bar's line was missed).
  const stepEyebrow = (step: BookingStepId) =>
    t('Шаг {step} из {total}', {
      step: ['service', 'specialist', 'datetime', 'contacts'].indexOf(step) + 1,
      total: 4,
    })

  const openStep = (step: BookingStepId | 'branch') => {
    setIsReviewRequested(false)
    window.clearTimeout(foldTimer.current)
    setIsContactsDone(false)
    if (step === 'branch') {
      setIsBranchOpen(true)
      document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setIsBranchOpen(false)
    form.editStep(step)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const foldContacts = () => {
    if (!contactsReady) return
    setIsContactsDone(true)
    ;(document.activeElement as HTMLElement | null)?.blur()
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const chosenBranch = form.branches.find((branch) => branch.id === form.branchId)
  const chosenSpecialist = catalog.specialists.find(
    (specialist) => specialist.id === form.specialistId,
  )
  // The ticket's parts in the place's own hue; the stack sets each card's lightness by where it
  // lies (the furthest always the darkest), not by which step it is.
  const placeTint = pickTint(business.name)
  const cardTone = (_index: number) => placeTint
  const chosenCards: StackCardProps[] = []
  if (form.branches.length > 1 && chosenBranch) {
    const distance = form.branchDistances?.[chosenBranch.id]
    chosenCards.push({
      id: 'branch',
      title: t('Филиал'),
      tone: cardTone(0),
      media: (
        <span className={styles.stackPin}>
          <MapPin weight='fill' />
        </span>
      ),
      primary: chosenBranch.name,
      secondary: [chosenBranch.address, distance !== undefined ? formatDistance(distance) : null]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (form.service) {
    const picture = servicePhotos?.[form.service.id] ?? business.coverUrl
    chosenCards.push({
      id: 'service',
      title: t('Услуга'),
      tone: cardTone(1),
      media: picture ? (
        // biome-ignore lint/performance/noImgElement: hotlinked and API pictures, sized here
        <img {...sizedImage(picture, 88)} alt='' className={styles.stackThumb} />
      ) : (
        <span
          className={styles.stackThumb}
          data-empty=''
          style={{ background: pickTint(business.name) }}
        />
      ),
      primary: form.service.name,
      // The price on the card itself, not only in the bar: it was missed down there.
      secondary: `${t.duration(form.service.durationMinutes)} · ${formatPrice(form.quote?.total ?? form.service.price)}`,
      trailing: formatPrice(form.quote?.total ?? form.service.price),
    })
  }
  if (form.specialistId) {
    chosenCards.push({
      id: 'specialist',
      title: t('Мастер'),
      tone: cardTone(2),
      media: chosenSpecialist ? (
        <PersonAvatar
          name={chosenSpecialist.name}
          src={chosenSpecialist.photoUrl ?? undefined}
          size='md'
          className={styles.stackFace}
        />
      ) : (
        <span className={styles.stackFace} data-any=''>
          <UsersThree weight='fill' />
        </span>
      ),
      primary: chosenSpecialist ? chosenSpecialist.name : t('Любой мастер'),
      secondary: chosenSpecialist
        ? [
            chosenSpecialist.rating ? `★ ${chosenSpecialist.rating.toFixed(1)}` : null,
            chosenSpecialist.role,
          ]
            .filter(Boolean)
            .join(' · ')
        : t('кто свободен'),
    })
  }
  if (form.time && form.dayKey && form.service) {
    chosenCards.push({
      id: 'datetime',
      title: t('Дата и время'),
      tone: cardTone(3),
      media: (
        <span className={styles.stackLeaf}>
          <span className={styles.stackLeafMonth}>{t.monthShort(form.dayKey)}</span>
          <span className={styles.stackLeafDay}>{Number(form.dayKey.slice(8))}</span>
        </span>
      ),
      primary: `${form.time}–${addMinutes(form.time, form.service.durationMinutes)}`,
      secondary: t.dayLong(form.dayKey),
    })
  }

  if (isContactsFolded) {
    chosenCards.push({
      id: 'contacts',
      title: t('Контакты'),
      tone: cardTone(4),
      media: <PersonAvatar name={form.name.trim()} size='md' className={styles.stackFace} />,
      primary: form.name.trim(),
      secondary: formatPhone(form.accountPhone ?? form.phone),
    })
  }
  const stackCards = chosenCards.filter(
    (card) =>
      (card.id !== activeStep || card.id === 'contacts') && !(isBranchOpen && card.id === 'branch'),
  )
  // «Ваша запись» is the e-ticket the booking turns into, filled in as far as it goes.
  const draftTicket: Booking = {
    id: 'draft',
    status: 'confirmed',
    serviceId: form.service?.id ?? '',
    serviceName: form.service?.name ?? t('Услуга не выбрана'),
    price: form.service?.price ?? 0,
    discount: form.quote?.discount
      ? { title: form.quote.discount.title, amount: form.quote.discount.amount }
      : null,
    durationMinutes: form.service?.durationMinutes ?? 0,
    specialistId: form.specialistId ?? '',
    specialistName: chosenSpecialist?.name ?? (form.specialistId ? t('Любой мастер') : ''),
    date: form.time && form.dayKey ? form.dayKey : '',
    time: form.time ?? '',
    startsAt: '',
    customerName: form.name,
    business: {
      slug: business.slug,
      name: business.name,
      address:
        form.branches.find((branch) => branch.id === form.branchId)?.address ??
        business.address ??
        null,
      phone: business.phone,
      mapUrl: business.mapUrl,
    },
  }

  const payment = form.subscriptionPayment
  const isPaymentShown = payment.hasOptions && !form.isForOther
  // Buying needs the client's own number: a guest signs in by SMS and comes back to the form.
  const choosePayment = (choice: typeof payment.choice) => {
    if (choice.startsWith('plan:') && !payment.isSignedIn) {
      const back = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/login?next=${encodeURIComponent(back)}`)
      return
    }
    payment.setChoice(choice)
  }

  const summaryProps = {
    service: form.service,
    specialistLabel,
    dayKey: form.dayKey,
    time: form.time,
    firstIncompleteStep: form.firstIncompleteStep,
    isSubmitting: form.isSubmitting,
    errorMessage: form.submitError,
    ...(activeStep === 'datetime' && !isBranchOpen && rulerTime
      ? {
          onSubmit: () => form.selectTime(rulerTime),
          submitLabel: t('Выбрать {time}', { time: rulerTime }),
        }
      : { onSubmit: form.submit, submitLabel: undefined }),
    quote: form.quote,
    place: { name: business.name, coverUrl: business.coverUrl },
    address:
      form.branches.find((branch) => branch.id === form.branchId)?.address ??
      business.address ??
      null,
    onStepOpen: openStep,
    paidWith: payment.subscription
      ? { label: t('По абонементу'), total: null }
      : payment.plan
        ? {
            label: t('Абонемент «{title}»', { title: payment.plan.title }),
            total: payment.plan.price,
          }
        : null,
  }

  // A note, a code and the SMS options: under the contacts while they are typed, and on their
  // own under «Всё готово» once the contacts have folded into a card.
  const contactExtras = (
    <>
      {/* Optional extras as a second group of the same Settings rows: a note and a
                        code read like the name and number above, not like loose buttons. */}
      <div className={styles.group}>
        {isCommentOpen || form.comment ? (
          <>
            <div className={styles.fieldRow} data-action=''>
              <span className={styles.extraLabel}>{t('Комментарий')}</span>
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
                {t('Убрать')}
              </button>
            </div>
            <textarea
              className={styles.commentArea}
              aria-label={t('Комментарий')}
              value={form.comment}
              onChange={(event) => form.setComment(event.target.value)}
              placeholder={t('Например, «нужна парковка»')}
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
            <span className={styles.extraLabel}>{t('Комментарий')}</span>
            <span className={styles.extraValue}>{t('Добавить')}</span>
            <CaretRight weight='bold' aria-hidden className={styles.extraChevron} />
          </button>
        )}
        {isPaymentShown && (
          <SubscriptionPaymentRow
            className={styles.fieldRow}
            labelClassName={styles.extraLabel}
            choice={payment.choice}
            subscriptions={payment.subscriptions}
            plans={payment.plans}
            onChange={choosePayment}
          />
        )}
        {!form.isPaidBySubscription && (
          <PromoCodeField
            className={styles.fieldRow}
            code={form.promoCode}
            error={form.promoCodeError}
            quote={form.quote}
            isWaitingForTime={!form.time}
            onApply={form.applyPromoCode}
            onClear={form.clearPromoCode}
          />
        )}
      </div>
      {isPaymentShown && (
        <SubscriptionPaymentNote subscription={payment.subscription} plan={payment.plan} />
      )}
      <NotifyOptions
        phone={form.accountPhone ?? (form.phone.trim() || null)}
        smsConfirmation={form.smsConfirmation}
        onSmsConfirmationChange={form.setSmsConfirmation}
        reminderMinutes={form.reminderMinutes}
        onReminderChange={form.setReminderMinutes}
      />
    </>
  )

  return (
    <>
      <BookingScrim slug={business.slug} isModal={isModal} />
      <main
        ref={screenRef}
        className={styles.page}
        data-booking-screen=''
        data-sheet-drag=''
        style={{ '--place-tint': pickTint(business.name) } as CSSProperties}
      >
        <div className={styles.wash} aria-hidden />
        <BookingTopBar business={business} isModal={isModal} />
        <Container className={styles.layout} data-reviewing={isReviewing || undefined}>
          <div className={styles.steps}>
            {isQuickShown && quickService && (
              <QuickSlots
                title={isLastVisitShown ? t('Как в прошлый раз') : t('Ближайшее время')}
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
                      {form.isSubmitting ? t('Записываем…') : t('Записаться')}
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
                <CardStack
                  cards={stackCards}
                  onEdit={(step) => openStep(step as BookingStepId | 'branch')}
                  onStartOver={form.isStarted ? form.startOver : undefined}
                />

                {isBranchOpen && (
                  <BookingStep id='branch' title={t('Куда приедете?')}>
                    {/* Each branch a row with its full address and how far it is, the chosen
                        one checked; picking one folds it back into its card. */}
                    <fieldset className={`${styles.group} ${styles.branchList}`}>
                      <legend className={styles.srOnly}>{t('Филиал')}</legend>
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
                              // Also a tap on the branch already chosen: it folds back into its card.
                              onClick={() => setIsBranchOpen(false)}
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
                      if (!chosen || chosen.latitude === null || chosen.longitude === null)
                        return null
                      return (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${chosen.latitude},${chosen.longitude}`}
                          target='_blank'
                          rel='noreferrer'
                          className={styles.branchRoute}
                        >
                          {t('Маршрут до «{name}» ›', { name: chosen.name })}
                        </a>
                      )
                    })()}
                  </BookingStep>
                )}

                {!isBranchOpen && activeStep === 'service' && (
                  <BookingStep
                    id='service'
                    eyebrow={stepEyebrow('service')}
                    title={t('Что делаем?')}
                  >
                    <ServicePicker
                      services={form.services}
                      categories={catalog.categories}
                      value={form.serviceId}
                      onChange={form.selectService}
                      onReselect={form.finishEditing}
                      photos={servicePhotos}
                      coverUrl={business.coverUrl}
                      businessName={business.name}
                      soonLabel={soonLabel}
                    />
                  </BookingStep>
                )}

                {!isBranchOpen && activeStep === 'specialist' && (
                  <BookingStep
                    id='specialist'
                    eyebrow={stepEyebrow('specialist')}
                    title={t('К кому записаться?')}
                  >
                    <MasterPicker
                      specialists={form.specialists}
                      value={form.specialistId}
                      onChange={form.selectSpecialist}
                      onReselect={form.finishEditing}
                    />
                  </BookingStep>
                )}

                {!isBranchOpen && activeStep === 'datetime' && (
                  <BookingStep
                    id='datetime'
                    eyebrow={stepEyebrow('datetime')}
                    title={t('Когда удобно?')}
                  >
                    <DateTimePicker
                      view='ruler'
                      onCenteredTimeChange={setRulerTime}
                      durationMinutes={form.service?.durationMinutes}
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
                            dayLabel={t.dayLong(form.dayKey)}
                          />
                        ) : null
                      }
                    />
                  </BookingStep>
                )}

                {!isBranchOpen && activeStep === 'contacts' && !isContactsFolded && (
                  <BookingStep
                    id='contacts'
                    eyebrow={stepEyebrow('contacts')}
                    title={t('Как вас записать?')}
                  >
                    <div className={styles.fields}>
                      {/* Said before the name and number are asked for: what is paid now, when it
                          comes back and where to go. The side panel has no summary card for it. */}
                      {form.service?.deposit ? (
                        <p className={styles.terms} ref={trackDepositShown}>
                          {t('Предоплата {amount} — вернём, если отмените за сутки', {
                            amount: formatPrice(form.service.deposit),
                          })}
                          {summaryProps.address ? ` · ${summaryProps.address}` : ''}
                        </p>
                      ) : null}
                      {/* Settings-style rows: the label on the left, the value typed on the right. */}
                      <div className={styles.group}>
                        <Field
                          label={t('Имя')}
                          error={form.errors.name && t(form.errors.name)}
                          className={styles.fieldRow}
                        >
                          <Input
                            variant='plain'
                            value={form.name}
                            onValueChange={form.setName}
                            autoComplete='name'
                            enterKeyHint={form.accountPhone ? 'done' : 'next'}
                            // Enter moves on to the number: one keyboard, no hunting for the field.
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return
                              event.preventDefault()
                              const phoneInput = document.querySelector<HTMLInputElement>(
                                '#step-contacts input[type="tel"]',
                              )
                              if (phoneInput) phoneInput.focus()
                              else foldContacts()
                            }}
                            placeholder={t(
                              form.isForOther ? 'Кого записываете' : 'Как к вам обращаться',
                            )}
                          />
                        </Field>
                        {form.accountPhone ? null : (
                          <Field
                            label={t('Телефон')}
                            error={form.errors.phone && t(form.errors.phone)}
                            className={styles.fieldRow}
                          >
                            <Input
                              variant='plain'
                              type='tel'
                              inputMode='tel'
                              autoComplete='tel'
                              enterKeyHint='done'
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter') return
                                event.preventDefault()
                                foldContacts()
                              }}
                              value={form.phone}
                              onValueChange={(value) => {
                                const masked = maskPhoneInput(value)
                                form.setPhone(masked)
                                // A whole number (+996 and nine digits) with a name: the card folds,
                                // like a code field moving on once full.
                                if (masked.replace(/\D/g, '').length === 12 && form.name.trim()) {
                                  window.clearTimeout(foldTimer.current)
                                  foldTimer.current = window.setTimeout(
                                    () => setIsContactsDone(true),
                                    450,
                                  )
                                }
                              }}
                              placeholder='+996 555 123 456'
                            />
                          </Field>
                        )}
                      </div>
                      {/* Mum or a child: their name and number, the visit stays in this account. */}
                      {form.canBookForOther && (
                        <button
                          type='button'
                          className={styles.forOther}
                          onClick={() => form.setForOther(!form.isForOther)}
                        >
                          {t(form.isForOther ? 'Записать себя' : 'Записать другого человека')}
                        </button>
                      )}
                    </div>
                    {contactExtras}
                  </BookingStep>
                )}

                {!isBranchOpen && isContactsFolded && (
                  <BookingStep id='ready' title={t('Всё готово')}>
                    <p className={styles.readyNote}>
                      {t(
                        'Проверьте карточки выше и запишитесь. Нажмите на карточку, чтобы изменить.',
                      )}
                    </p>
                    {contactExtras}
                  </BookingStep>
                )}
              </>
            )}

            {/* Under the form and set well apart from it (a wide gap), so it reads as something to
                look at, not another step. Nothing here leads away: picks of other places live on
                the success screen, not in the middle of a booking. */}
            <aside className={styles.after} aria-label={t('Дополнительно')}>
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
          <BookingSummary
            variant='bar'
            {...summaryProps}
            ticket={<Ticket booking={draftTicket} isDraft />}
          />
        </div>
      </main>
    </>
  )
}
