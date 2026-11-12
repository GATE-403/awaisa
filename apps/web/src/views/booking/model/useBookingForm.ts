import { useToast } from '@awaisa/ui/Toast'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ANY_SPECIALIST_ID,
  findService,
  findSpecialist,
  getSpecialistsForService,
  getUpcomingDays,
  readContact,
  saveBooking,
  saveContact,
  useAvailability,
} from '@/entities/booking'
import { findDay, weekdayOf } from '@/entities/business'
import { useSession } from '@/entities/session'
import { clearDraft, saveDraft } from '@/features/bookingDraft'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { createBooking } from '@/shared/api/clientApi'
import type { Booking, Business, Catalog } from '@/shared/api/types'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
import { usePriceQuote } from './usePriceQuote'

type ReminderChoice = 60 | 120 | 1440 | null

type BookingStepId = 'service' | 'specialist' | 'datetime' | 'contacts'

const STEP_ORDER: BookingStepId[] = ['service', 'specialist', 'datetime', 'contacts']

const MIN_PHONE_DIGITS = 9

const CONFLICT_STATUS = 409

// How many open days the form looks ahead for a free slot before showing an empty day.
const MAX_AUTO_DAY_SKIPS = 6

const scrollToStep = (stepId: BookingStepId, force = false) => {
  requestAnimationFrame(() => {
    const element = document.getElementById(`step-${stepId}`)
    if (!element) return

    const isFarBelow = element.getBoundingClientRect().top > window.innerHeight * 0.55
    if (force || isFarBelow) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export const useBookingForm = (business: Business, catalog: Catalog) => {
  const searchParams = useSearchParams()
  const toast = useToast()
  const today = useToday()
  const session = useSession()
  const presetSpecialist = findSpecialist(catalog, searchParams.get('specialist'))
  const presetService = findService(catalog, searchParams.get('service'))
  // A time shown on a card («Сегодня, 14:30») opens the form on that time, not on a blank day.
  const presetDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') ?? '')
    ? searchParams.get('date')
    : null
  const presetTime =
    presetDate && /^\d{2}:\d{2}$/.test(searchParams.get('time') ?? '')
      ? searchParams.get('time')
      : null
  const [serviceId, setServiceId] = useState(presetService?.id ?? null)
  const [chosenSpecialistId, setSpecialistId] = useState(
    searchParams.get('specialist') === ANY_SPECIALIST_ID && presetService
      ? ANY_SPECIALIST_ID
      : presetSpecialist &&
          (!presetService || presetSpecialist.serviceIds.includes(presetService.id))
        ? presetSpecialist.id
        : null,
  )
  // Pages cached before branches existed have none: treat them as single-branch.
  const branches = business.branches ?? []
  const [chosenBranchId, setBranchId] = useState(searchParams.get('branch'))
  const branchId =
    branches.length > 1
      ? (branches.find((branch) => branch.id === chosenBranchId) ?? branches[0])?.id
      : undefined
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(presetDate)
  const [autoDay, setAutoDay] = useState({ key: '', skips: 0 })
  const [time, setTime] = useState<string | null>(presetTime)
  const [isPresetChecked, setIsPresetChecked] = useState(presetTime === null)
  const [nameInput, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [smsConfirmation, setSmsConfirmation] = useState(true)
  const [reminderMinutes, setReminderMinutes] = useState<ReminderChoice>(120)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)
  const [editingStep, setEditingStep] = useState<BookingStepId | null>(null)
  // Steps the client folded or unfolded by hand win over the automatic behaviour.
  const [folded, setFolded] = useState<Partial<Record<BookingStepId, boolean>>>({})
  const service = findService(catalog, serviceId)
  const services = presetSpecialist
    ? catalog.services.filter((item) => presetSpecialist.serviceIds.includes(item.id))
    : catalog.services
  // Masters of the chosen branch, plus those who work at every branch.
  const specialists = getSpecialistsForService(catalog, serviceId).filter(
    (specialist) => !branchId || !specialist.branchId || specialist.branchId === branchId,
  )
  // One master for the service: nothing to choose, so the step is filled in.
  // «Any master» from a link means that very master when the service has only one.
  const specialistId =
    specialists.length === 1 &&
    (chosenSpecialistId === null || chosenSpecialistId === ANY_SPECIALIST_ID)
      ? (specialists[0]?.id ?? null)
      : chosenSpecialistId
  const days = (today ? getUpcomingDays(today.dayKey) : []).map((day) => ({
    ...day,
    isClosed: !findDay(business.hours, weekdayOf(day.key)),
  }))
  const openDays = days.filter((day) => !day.isClosed)
  const autoDayKey = `${serviceId}|${specialistId}`
  const skips = autoDay.key === autoDayKey ? autoDay.skips : 0
  const dayKey = selectedDayKey ?? openDays[skips]?.key ?? openDays[0]?.key ?? null
  const availability = useAvailability(serviceId, specialistId, dayKey, branchId)
  const isAutoDayFull =
    selectedDayKey === null &&
    !availability.isLoading &&
    !availability.error &&
    serviceId !== null &&
    specialistId !== null &&
    skips < Math.min(MAX_AUTO_DAY_SKIPS, openDays.length - 1) &&
    !availability.slots.some((slot) => slot.isAvailable)
  const accountPhone = session.customer?.phone ?? null
  const { quote, codeError } = usePriceQuote({
    serviceId,
    date: dayKey,
    time,
    code: promoCode,
    phone: accountPhone ?? phone,
  })
  const name = nameInput ?? session.customer?.name ?? ''
  const phoneDigits = phone.replace(/\D/g, '')
  const isPhoneValid = accountPhone !== null || phoneDigits.length >= MIN_PHONE_DIGITS
  const errors = {
    name: hasTriedSubmit && !name.trim() ? 'Укажите имя' : undefined,
    phone:
      hasTriedSubmit && !isPhoneValid ? 'Укажите номер, чтобы мы подтвердили запись' : undefined,
  }
  const firstIncompleteStep: BookingStepId | null = !service
    ? 'service'
    : !specialistId
      ? 'specialist'
      : !time
        ? 'datetime'
        : !name.trim() || !isPhoneValid
          ? 'contacts'
          : null
  const completedSteps: Record<BookingStepId, boolean> = {
    service: Boolean(service),
    specialist: Boolean(specialistId),
    datetime: Boolean(time),
    contacts: firstIncompleteStep === null,
  }

  // A returning guest: their name and number from last time, editable as usual.
  useEffect(() => {
    if (session.status !== 'guest') return
    const stored = readContact()
    if (!stored) return
    setName((current) => current ?? stored.name)
    setPhone((current) => current || stored.phone)
  }, [session.status])

  // The shown time may be gone by now: say so and let the client pick another one.
  useEffect(() => {
    if (isPresetChecked || availability.isLoading || dayKey !== presetDate) return
    setIsPresetChecked(true)
    if (availability.error) return
    if (!availability.slots.some((slot) => slot.isAvailable && slot.time === presetTime)) {
      setTime(null)
      toast.show({ title: `${presetTime} уже заняли — выберите другое время`, type: 'info' })
    }
  }, [isPresetChecked, availability, dayKey, presetDate, presetTime, toast])

  // Keep the half-made booking on the device, so leaving the page never loses it.
  useEffect(() => {
    if (!service || createdBooking) return
    saveDraft({
      slug: business.slug,
      businessName: business.name,
      serviceId: service.id,
      serviceName: service.name,
      specialistId: chosenSpecialistId,
      branchId: branchId ?? null,
    })
  }, [service, chosenSpecialistId, branchId, business.slug, business.name, createdBooking])

  // The first suggested day has no free time (today is over, or fully booked): open the next one.
  useEffect(() => {
    if (isAutoDayFull) setAutoDay({ key: autoDayKey, skips: skips + 1 })
  }, [isAutoDayFull, autoDayKey, skips])

  // One step at a time: done steps fold to their summary, steps not reached yet show only a title.
  const isStepCollapsed = (step: BookingStepId) => {
    const handFolded = folded[step]
    if (handFolded !== undefined) return handFolded
    if (editingStep === step) return false
    // Contacts stay open: people type their name whenever they like, and it must stay in view.
    const isAhead =
      step !== 'contacts' &&
      firstIncompleteStep !== null &&
      STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(firstIncompleteStep)
    return isAhead || (step !== 'contacts' && completedSteps[step])
  }

  const toggleStep = (step: BookingStepId) => {
    const isCollapsed = isStepCollapsed(step)
    setFolded((current) => ({ ...current, [step]: !isCollapsed }))
    if (isCollapsed) setEditingStep(step)
  }

  const editStep = (step: BookingStepId) => {
    setFolded((current) => ({ ...current, [step]: false }))
    setEditingStep(step)
  }

  const selectService = (id: string) => {
    setFolded((current) => ({ ...current, service: undefined }))
    const nextSpecialists = getSpecialistsForService(catalog, id).filter(
      (specialist) => !branchId || !specialist.branchId || specialist.branchId === branchId,
    )
    const keepsSpecialist =
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      nextSpecialists.some((item) => item.id === chosenSpecialistId)
    const hasSpecialist = (keepsSpecialist && chosenSpecialistId) || nextSpecialists.length === 1
    setServiceId(id)
    setTime(null)
    setSubmitError(null)
    if (!keepsSpecialist) setSpecialistId(null)
    setEditingStep(null)
    scrollToStep(hasSpecialist ? 'datetime' : 'specialist', true)
  }

  const selectSpecialist = (id: string) => {
    setFolded((current) => ({ ...current, specialist: undefined }))
    setSpecialistId(id)
    setTime(null)
    setSubmitError(null)
    setEditingStep(null)
    scrollToStep('datetime', true)
  }

  const selectBranch = (id: string) => {
    setBranchId(id)
    setTime(null)
    setSubmitError(null)
    const keepsSpecialist =
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      catalog.specialists.some(
        (item) => item.id === chosenSpecialistId && (!item.branchId || item.branchId === id),
      )
    if (!keepsSpecialist) setSpecialistId(null)
  }

  const selectDay = (key: string) => {
    setSelectedDayKey(key)
    setTime(null)
  }

  const selectTime = (value: string) => {
    setFolded((current) => ({ ...current, datetime: undefined }))
    setTime(value)
    setSubmitError(null)
    setEditingStep(null)
    scrollToStep('contacts', true)
  }

  const submit = async () => {
    setHasTriedSubmit(true)
    if (firstIncompleteStep) {
      scrollToStep(firstIncompleteStep, true)
      return
    }
    if (!serviceId || !specialistId || !dayKey || !time || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const { cancelToken, checkoutUrl, ...booking } = await createBooking({
        serviceId,
        specialistId,
        date: dayKey,
        time,
        name: name.trim(),
        phone: accountPhone ? '' : phone.trim(),
        comment: comment.trim(),
        branchId,
        smsConfirmation,
        reminderMinutes,
        promoCode: promoCode && !codeError ? promoCode : undefined,
      })
      saveBooking({ id: booking.id, token: cancelToken, snapshot: booking })
      if (!accountPhone) saveContact({ name: name.trim(), phone: phone.trim() })
      clearDraft()
      // A deposit: the slot is held, the client pays at the checkout and comes back to the ticket.
      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
        return
      }
      setCreatedBooking(booking)
      haptic('success')
      toast.show({
        title: 'Запись подтверждена',
        description: `${booking.serviceName}, ${booking.time}`,
        type: 'success',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(getErrorMessage(error))
      haptic('error')
      toast.show({
        title: 'Не получилось записаться',
        description: getErrorMessage(error),
        type: 'error',
      })
      if (error instanceof ApiError && error.status === CONFLICT_STATUS) {
        setTime(null)
        availability.reload()
        scrollToStep('datetime', true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    branches,
    branchId,
    selectBranch,
    service,
    services,
    serviceId,
    specialists,
    specialistId,
    days,
    dayKey,
    availability,
    time,
    name,
    phone,
    accountPhone,
    comment,
    errors,
    submitError,
    isSubmitting,
    firstIncompleteStep,
    completedSteps,
    createdBooking,
    isStepCollapsed,
    toggleStep,
    editStep,
    setName,
    setPhone,
    setComment,
    smsConfirmation,
    setSmsConfirmation,
    reminderMinutes,
    setReminderMinutes,
    quote,
    promoCode,
    promoCodeError: codeError,
    applyPromoCode: (code: string) => setPromoCode(code.trim().toUpperCase() || null),
    clearPromoCode: () => setPromoCode(null),
    selectService,
    selectSpecialist,
    selectDay,
    selectTime,
    submit,
  }
}

export type { BookingStepId, ReminderChoice }
