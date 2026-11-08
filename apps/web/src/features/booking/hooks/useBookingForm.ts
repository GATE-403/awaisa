import { useToast } from '@awaisa/ui/Toast'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import { createBooking } from '@/common/api/clientApi'
import type { Booking, Catalog } from '@/common/api/types'
import { useToday } from '@/common/hooks/useToday'
import { saveBooking } from '@/common/utils/bookingStorage'
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

const scrollToStep = (stepId: BookingStepId, force = false) => {
  requestAnimationFrame(() => {
    const element = document.getElementById(`step-${stepId}`)
    if (!element) return

    const isFarBelow = element.getBoundingClientRect().top > window.innerHeight * 0.55
    if (force || isFarBelow) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export const useBookingForm = (catalog: Catalog) => {
  const searchParams = useSearchParams()
  const toast = useToast()
  const today = useToday()
  const presetSpecialist = findSpecialist(catalog, searchParams.get('specialist'))
  const [serviceId, setServiceId] = useState(
    findService(catalog, searchParams.get('service'))?.id ?? null,
  )
  const [specialistId, setSpecialistId] = useState(presetSpecialist?.id ?? null)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState('')
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
  const days = today ? getUpcomingDays(today.dayKey) : []
  const dayKey = selectedDayKey ?? today?.dayKey ?? null
  const availability = useAvailability(serviceId, specialistId, dayKey)
  const phoneDigits = phone.replace(/\D/g, '')
  const errors = {
    name: hasTriedSubmit && !name.trim() ? 'Укажите имя' : undefined,
    phone:
      hasTriedSubmit && phoneDigits.length < MIN_PHONE_DIGITS
        ? 'Укажите номер, чтобы мы подтвердили запись'
        : undefined,
  }
  const firstIncompleteStep: BookingStepId | null = !service
    ? 'service'
    : !specialistId
      ? 'specialist'
      : !time
        ? 'datetime'
        : !name.trim() || phoneDigits.length < MIN_PHONE_DIGITS
          ? 'contacts'
          : null
  const completedSteps: Record<BookingStepId, boolean> = {
    service: Boolean(service),
    specialist: Boolean(specialistId),
    datetime: Boolean(time),
    contacts: firstIncompleteStep === null,
  }

  const isStepCollapsed = (step: BookingStepId) =>
    step !== 'contacts' && completedSteps[step] && editingStep !== step

  const editStep = (step: BookingStepId) => setEditingStep(step)

  const selectService = (id: string) => {
    const keepsSpecialist =
      specialistId === ANY_SPECIALIST_ID ||
      getSpecialistsForService(catalog, id).some((item) => item.id === specialistId)
    setServiceId(id)
    setTime(null)
    setSubmitError(null)
    if (!keepsSpecialist) setSpecialistId(null)
    setEditingStep(null)
    scrollToStep(keepsSpecialist && specialistId ? 'datetime' : 'specialist', true)
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
        phone: phone.trim(),
        comment: comment.trim(),
      })
      saveBooking({ id: booking.id, token: cancelToken, snapshot: booking })
      setCreatedBooking(booking)
      toast.show({
        title: 'Запись подтверждена',
        description: `${booking.serviceName}, ${booking.time}`,
        type: 'success',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(getErrorMessage(error))
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
