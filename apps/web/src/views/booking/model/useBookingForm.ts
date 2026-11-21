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
import { readRef } from '@/features/invite'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { createBooking } from '@/shared/api/clientApi'
import type { Booking, Business, Catalog } from '@/shared/api/types'
import { distanceKm, knownPosition } from '@/shared/lib/geo'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackFormError } from '@/shared/lib/telemetry'
import { combineServices, getAddableServices, getMastersForAll } from '../lib/visitServices'
import { usePriceQuote } from './usePriceQuote'
import { useSubscriptionPayment } from './useSubscriptionPayment'

type ReminderChoice = 60 | 120 | 1440 | null

type BookingStepId = 'service' | 'specialist' | 'datetime' | 'contacts'

const STEP_ORDER: BookingStepId[] = ['service', 'specialist', 'datetime', 'contacts']

const MIN_PHONE_DIGITS = 9

const CONFLICT_STATUS = 409

// How many open days the form looks ahead for a free slot before showing an empty day.
const MAX_AUTO_DAY_SKIPS = 6

// The sheet is a stack of done cards over one open card: after each choice it goes back to its
// top, where the new card has just landed and the next question waits right under it.
const scrollToStep = (_stepId: BookingStepId, _force = false) => {
  requestAnimationFrame(() => {
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  })
}

// Once a time is picked, the cursor waits in «Имя»: a list-like row is not obviously a field to
// someone new to forms. After the scroll settles; never steals focus from a field in use.
const focusNameSoon = () => {
  window.setTimeout(() => {
    const input = document.querySelector<HTMLInputElement>(
      '#step-contacts input[autocomplete="name"]',
    )
    const active = document.activeElement
    if (!input || input.value || (active instanceof HTMLInputElement && active !== input)) return
    input.focus({ preventScroll: true })
  }, 450)
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
  // Services done after the first in the same visit, by the same master, in this order.
  const [extraServiceIds, setExtraServiceIds] = useState<string[]>([])
  // «+ Ещё услуга»: the service step opens again to add one to the visit.
  const [isAddingService, setIsAddingService] = useState(false)
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
  // How far each pinned branch is, when the visitor already shared their location.
  const [branchDistances, setBranchDistances] = useState<Record<string, number> | null>(null)
  const branchId =
    branches.length > 1
      ? (branches.find((branch) => branch.id === chosenBranchId) ?? branches[0])?.id
      : undefined
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(presetDate)
  const [autoDay, setAutoDay] = useState({ key: '', skips: 0 })
  const [time, setTime] = useState<string | null>(presetTime)
  const [isPresetChecked, setIsPresetChecked] = useState(presetTime === null)
  // After moving to another branch the chosen time is kept, then checked once that branch's
  // free times arrive.
  const [isBranchTimeChecked, setIsBranchTimeChecked] = useState(true)
  const [nameInput, setName] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  // Booking mum or a child: their own name and number, nothing of the client's own filled in.
  const [isForOther, setIsForOther] = useState(false)
  const [hasSavedContact, setHasSavedContact] = useState(false)
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
  const firstService = findService(catalog, serviceId)
  const chosenServices = firstService
    ? [
        firstService,
        ...extraServiceIds.flatMap((id) => {
          const extra = findService(catalog, id)
          return extra ? [extra] : []
        }),
      ]
    : []
  const chosenServiceIds = chosenServices.map((item) => item.id)
  // The whole visit as one service: «Маникюр + Педикюр», the price and length added up.
  const service = combineServices(chosenServices)
  // A service is offered at a branch when someone there does it (a master of that branch or one
  // who works at every branch).
  const servesBranch = (id: string, branch: string | undefined) =>
    !branch ||
    getSpecialistsForService(catalog, id).some(
      (specialist) => !specialist.branchId || specialist.branchId === branch,
    )
  const services = (
    presetSpecialist
      ? catalog.services.filter((item) => presetSpecialist.serviceIds.includes(item.id))
      : catalog.services
  ).filter((item) => servesBranch(item.id, branchId))
  // Masters of the chosen branch (plus those who work at every branch) who do every service.
  const specialists = getMastersForAll(catalog.specialists, chosenServiceIds, branchId)
  const addableServices = getAddableServices({
    services,
    masters: catalog.specialists,
    chosenIds: chosenServiceIds,
    specialistId: chosenSpecialistId,
    branchId,
  })
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
  const autoDayKey = `${chosenServiceIds.join(',')}|${specialistId}`
  const skips = autoDay.key === autoDayKey ? autoDay.skips : 0
  const dayKey = selectedDayKey ?? openDays[skips]?.key ?? openDays[0]?.key ?? null
  const availability = useAvailability(
    serviceId,
    specialistId,
    dayKey,
    branchId,
    chosenServiceIds.slice(1),
  )
  const isAutoDayFull =
    selectedDayKey === null &&
    !availability.isLoading &&
    !availability.error &&
    serviceId !== null &&
    specialistId !== null &&
    skips < Math.min(MAX_AUTO_DAY_SKIPS, openDays.length - 1) &&
    !availability.slots.some((slot) => slot.isAvailable)
  const accountPhone = isForOther ? null : (session.customer?.phone ?? null)
  const { quote, codeError } = usePriceQuote({
    serviceId,
    extraServiceIds: chosenServiceIds.slice(1),
    date: dayKey,
    time,
    code: promoCode,
    phone: accountPhone ?? phone,
  })
  const subscriptionPayment = useSubscriptionPayment(business.slug, serviceId)
  const isPaidBySubscription = Boolean(subscriptionPayment.subscription || subscriptionPayment.plan)
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

  // Which contact field people get wrong (a code, never the value), once per field and page.
  useEffect(() => {
    if (errors.name) trackFormError('name', business.slug)
    if (errors.phone) trackFormError('phone', business.slug)
  }, [errors.name, errors.phone, business.slug])

  // A returning guest: their name and number from last time, editable as usual.
  // With several branches and a location already allowed (no prompt), the nearest one is chosen
  // — unless a link named a branch or the client picked one meanwhile.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per place
  useEffect(() => {
    // A link to a master who works in one branch already decided it.
    if (branches.length < 2 || presetSpecialist?.branchId) return
    let isCancelled = false
    knownPosition().then((position) => {
      if (!position || isCancelled) return
      const distances: Record<string, number> = {}
      for (const branch of branches) {
        if (branch.latitude === null || branch.longitude === null) continue
        distances[branch.id] = distanceKm(position, { lat: branch.latitude, lng: branch.longitude })
      }
      const nearest = Object.entries(distances).sort((first, second) => first[1] - second[1])[0]
      setBranchDistances(distances)
      if (nearest) setBranchId((current) => current ?? nearest[0])
    })
    return () => {
      isCancelled = true
    }
  }, [business.slug])

  useEffect(() => {
    if (session.status !== 'guest') return
    const stored = readContact()
    if (!stored) return
    setHasSavedContact(true)
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

  useEffect(() => {
    if (isBranchTimeChecked || availability.isLoading) return
    setIsBranchTimeChecked(true)
    if (!time || availability.error) return
    if (!availability.slots.some((slot) => slot.isAvailable && slot.time === time)) {
      toast.show({ title: `В этом филиале ${time} занято — выберите другое время`, type: 'info' })
      setTime(null)
    }
  }, [isBranchTimeChecked, availability, time, toast])

  // Keep the half-made booking on the device, so leaving the page never loses it.
  const hasContacts = Boolean(name.trim()) && isPhoneValid
  const stepsDone = [service, specialistId, time, hasContacts].filter(Boolean).length
  useEffect(() => {
    if (!service || createdBooking) return
    saveDraft({
      slug: business.slug,
      businessName: business.name,
      serviceId: service.id,
      serviceName: service.name,
      specialistId: chosenSpecialistId,
      branchId: branchId ?? null,
      date: time ? dayKey : null,
      time,
      stepsDone,
    })
  }, [
    service,
    chosenSpecialistId,
    branchId,
    business.slug,
    business.name,
    createdBooking,
    dayKey,
    time,
    stepsDone,
  ])

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

  // A tap on what is already chosen: nothing changes, the step closes again and the client is back
  // where they were (the next unfinished step, or the contacts once all is chosen).
  const finishEditing = () => {
    setEditingStep(null)
    scrollToStep(firstIncompleteStep ?? 'contacts', true)
  }

  const editStep = (step: BookingStepId) => {
    setFolded((current) => ({ ...current, [step]: false }))
    setEditingStep(step)
  }

  // «Начать заново»: the choices go (service, master, time, comment, code) and so does the draft
  // and the link's preset; the name and phone stay — they are the same person.
  const startOver = () => {
    setServiceId(null)
    setExtraServiceIds([])
    setIsAddingService(false)
    setSpecialistId(null)
    setSelectedDayKey(null)
    setTime(null)
    setComment('')
    setPromoCode(null)
    setSubmitError(null)
    setHasTriedSubmit(false)
    setFolded({})
    setEditingStep(null)
    clearDraft()
    const url = new URL(window.location.href)
    for (const key of ['service', 'specialist', 'date', 'time']) url.searchParams.delete(key)
    window.history.replaceState(window.history.state, '', url)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectService = (id: string) => {
    setFolded((current) => ({ ...current, service: undefined }))
    // Another first service starts the visit over: the ones added to it went with the old one.
    setExtraServiceIds([])
    setIsAddingService(false)
    const nextSpecialists = getMastersForAll(catalog.specialists, [id], branchId)
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

  // The visit gains a service done right after the others; a master who does not do it lets go.
  const addService = (id: string) => {
    const nextIds = [...chosenServiceIds, id]
    const keepsSpecialist =
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      getMastersForAll(catalog.specialists, nextIds, branchId).some(
        (item) => item.id === chosenSpecialistId,
      )
    setExtraServiceIds(nextIds.slice(1))
    setIsAddingService(false)
    setTime(null)
    setSubmitError(null)
    if (!keepsSpecialist) setSpecialistId(null)
    setEditingStep(null)
    scrollToStep(keepsSpecialist && chosenSpecialistId ? 'datetime' : 'specialist', true)
  }

  const removeService = (id: string) => {
    setExtraServiceIds((current) => current.filter((item) => item !== id))
    setIsAddingService(false)
    setTime(null)
    setEditingStep(null)
    scrollToStep('datetime', true)
  }

  const openAddService = () => {
    setIsAddingService(true)
    setEditingStep(null)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectSpecialist = (id: string) => {
    setFolded((current) => ({ ...current, specialist: undefined }))
    setSpecialistId(id)
    setTime(null)
    setSubmitError(null)
    setEditingStep(null)
    scrollToStep('datetime', true)
  }

  // Another branch keeps what still fits there: the service if someone there does it, the master
  // if they work there, the day and time until that branch's free times say otherwise. Whatever
  // no longer fits is cleared, so the form opens on that step to choose again.
  const selectBranch = (id: string) => {
    if (id === branchId) return
    setBranchId(id)
    setSubmitError(null)
    const keepsService =
      chosenServiceIds.length > 0 &&
      getMastersForAll(catalog.specialists, chosenServiceIds, id).length > 0
    if (!keepsService) {
      setServiceId(null)
      setExtraServiceIds([])
      setSpecialistId(null)
      setTime(null)
      return
    }
    const keepsSpecialist =
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      catalog.specialists.some(
        (item) => item.id === chosenSpecialistId && (!item.branchId || item.branchId === id),
      )
    if (!keepsSpecialist) {
      setSpecialistId(null)
      setTime(null)
      return
    }
    if (time) setIsBranchTimeChecked(false)
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
    if (!name.trim() && !hasContacts) focusNameSoon()
  }

  // A quick time: service, master and time at once; the steps fold and contacts are next.
  const pickSlot = (pick: {
    serviceId: string
    specialistId: string
    dayKey: string
    time: string
  }) => {
    setServiceId(pick.serviceId)
    setExtraServiceIds([])
    setSpecialistId(pick.specialistId)
    setSelectedDayKey(pick.dayKey)
    setTime(pick.time)
    setFolded({})
    setEditingStep(null)
    setSubmitError(null)
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
        extraServiceIds: chosenServiceIds.slice(1),
        specialistId,
        date: dayKey,
        time,
        name: name.trim(),
        phone: accountPhone ? '' : phone.trim(),
        forOther: isForOther && session.status === 'signedIn',
        comment: comment.trim(),
        branchId,
        smsConfirmation,
        reminderMinutes,
        promoCode: promoCode && !codeError && !isPaidBySubscription ? promoCode : undefined,
        ref: readRef(),
        // Paid by a subscription: one's own at this place, or one bought now with the visit.
        subscriptionId: isForOther ? undefined : subscriptionPayment.subscription?.id,
        subscriptionPlanId: isForOther ? undefined : subscriptionPayment.plan?.id,
      })
      saveBooking({ id: booking.id, token: cancelToken, snapshot: booking })
      // Someone else's name and number are not the guest's own next time.
      if (!accountPhone && !isForOther) saveContact({ name: name.trim(), phone: phone.trim() })
      clearDraft()
      // A deposit: the slot is held, the client pays at the checkout and comes back to the ticket.
      if (checkoutUrl) {
        window.location.assign(checkoutUrl)
        return
      }
      setCreatedBooking(booking)
      haptic('success')
      // No toast: the success screen is the confirmation, and a toast on top of it covered its
      // «Вы записаны» exactly when a first-time client looks for it.
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // The booking sheet scrolls inside itself: bring its top («Вы записаны») into view too.
      requestAnimationFrame(() =>
        document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' }),
      )
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

  const setForOther = (value: boolean) => {
    setIsForOther(value)
    // Back to oneself: the account's name (null) or the guest's saved contact.
    setName(value ? '' : null)
    setPhone(value ? '' : session.status === 'guest' ? (readContact()?.phone ?? '') : '')
    if (value) focusNameSoon()
  }

  return {
    branches,
    branchId,
    branchDistances,
    selectBranch,
    service,
    services,
    serviceId,
    chosenServices,
    chosenServiceIds,
    addableServices,
    isAddingService,
    openAddService,
    closeAddService: () => setIsAddingService(false),
    addService,
    removeService,
    specialists,
    specialistId,
    days,
    dayKey,
    availability,
    time,
    name,
    phone,
    accountPhone,
    isForOther,
    canBookForOther: session.status === 'signedIn' || hasSavedContact,
    setForOther,
    comment,
    errors,
    submitError,
    isSubmitting,
    firstIncompleteStep,
    completedSteps,
    createdBooking,
    editingStep,
    isStepCollapsed,
    toggleStep,
    editStep,
    finishEditing,
    setName,
    setPhone,
    setComment,
    smsConfirmation,
    setSmsConfirmation,
    reminderMinutes,
    setReminderMinutes,
    quote,
    subscriptionPayment,
    isPaidBySubscription,
    promoCode,
    promoCodeError: codeError,
    applyPromoCode: (code: string) => setPromoCode(code.trim().toUpperCase() || null),
    clearPromoCode: () => setPromoCode(null),
    selectService,
    selectSpecialist,
    isStarted: Boolean(service || chosenSpecialistId || time),
    startOver,
    selectDay,
    selectTime,
    pickSlot,
    hasContacts,
    today,
    openDayKeys: openDays.map((day) => day.key),
    submit,
  }
}

export type { BookingStepId, ReminderChoice }
