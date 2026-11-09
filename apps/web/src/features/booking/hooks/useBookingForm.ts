import { useToast } from '@awaisa/ui/Toast'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import { createBooking } from '@/common/api/clientApi'
import type { Booking, Business, Catalog } from '@/common/api/types'
import { useSession } from '@/common/hooks/useSession'
import { useToday } from '@/common/hooks/useToday'
import { saveBooking } from '@/common/utils/bookingStorage'
import { haptic } from '@/common/utils/nativeBridge'
import { findDay, weekdayOf } from '@/common/utils/workingHours'
import { ANY_SPECIALIST_ID } from '../bookingConstants'
import {
  findService,
  findSpecialist,
  getSpecialistsForService,
  getUpcomingDays,
} from '../bookingUtils'
import { useAvailability } from './useAvailability'

type BookingStepId = 'service' | 'specialist' | 'datetime' | 'contacts'

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
  const [serviceId, setServiceId] = useState(presetService?.id ?? null)
  const [chosenSpecialistId, setSpecialistId] = useState(
    presetSpecialist && (!presetService || presetSpecialist.serviceIds.includes(presetService.id))
      ? presetSpecialist.id
      : null,
  )
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [autoDay, setAutoDay] = useState({ key: '', skips: 0 })
  const [time, setTime] = useState<string | null>(null)
  const [nameInput, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)
  const [editingStep, setEditingStep] = useState<BookingStepId | null>(null)
  const service = findService(catalog, serviceId)
  const services = presetSpecialist
    ? catalog.services.filter((item) => presetSpecialist.serviceIds.includes(item.id))
    : catalog.services
  const specialists = getSpecialistsForService(catalog, serviceId)
  // One master for the service: nothing to choose, so the step is filled in.
  const specialistId =
    chosenSpecialistId ?? (specialists.length === 1 ? (specialists[0]?.id ?? null) : null)
  const days = (today ? getUpcomingDays(today.dayKey) : []).map((day) => ({
    ...day,
    isClosed: !findDay(business.hours, weekdayOf(day.key)),
  }))
  const openDays = days.filter((day) => !day.isClosed)
  const autoDayKey = `${serviceId}|${specialistId}`
  const skips = autoDay.key === autoDayKey ? autoDay.skips : 0
  const dayKey = selectedDayKey ?? openDays[skips]?.key ?? openDays[0]?.key ?? null
  const availability = useAvailability(serviceId, specialistId, dayKey)
  const isAutoDayFull =
    selectedDayKey === null &&
    !availability.isLoading &&
    !availability.error &&
    serviceId !== null &&
    specialistId !== null &&
    skips < Math.min(MAX_AUTO_DAY_SKIPS, openDays.length - 1) &&
    !availability.slots.some((slot) => slot.isAvailable)
  const accountPhone = session.customer?.phone ?? null
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

  // The first suggested day has no free time (today is over, or fully booked): open the next one.
  useEffect(() => {
    if (isAutoDayFull) setAutoDay({ key: autoDayKey, skips: skips + 1 })
  }, [isAutoDayFull, autoDayKey, skips])

  const isStepCollapsed = (step: BookingStepId) =>
    step !== 'contacts' && completedSteps[step] && editingStep !== step

  const editStep = (step: BookingStepId) => setEditingStep(step)

  const selectService = (id: string) => {
    const nextSpecialists = getSpecialistsForService(catalog, id)
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
    setSpecialistId(id)
    setTime(null)
    setSubmitError(null)
    setEditingStep(null)
    scrollToStep('datetime', true)
  }

  const selectDay = (key: string) => {
    setSelectedDayKey(key)
    setTime(null)
  }

  const selectTime = (value: string) => {
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
      const { cancelToken, ...booking } = await createBooking({
        serviceId,
        specialistId,
        date: dayKey,
        time,
        name: name.trim(),
        phone: accountPhone ? '' : phone.trim(),
        comment: comment.trim(),
      })
      saveBooking({ id: booking.id, token: cancelToken, snapshot: booking })
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
    editStep,
    setName,
    setPhone,
    setComment,
    selectService,
    selectSpecialist,
    selectDay,
    selectTime,
    submit,
  }
}

export type { BookingStepId }
