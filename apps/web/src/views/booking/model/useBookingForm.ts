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
import { readChannel } from '@/shared/lib/bookingChannel'
import { distanceKm, knownPosition } from '@/shared/lib/geo'
import { useToday } from '@/shared/lib/hooks/useToday'
import { haptic } from '@/shared/lib/nativeBridge'
import { trackFormError } from '@/shared/lib/telemetry'
import { combineServices, getAddableServices, getMastersForAll } from '../lib/visitServices'
import { useLookPhoto } from './useLookPhoto'
import { usePriceQuote } from './usePriceQuote'
import { useSubscriptionPayment } from './useSubscriptionPayment'

type ReminderChoice = 60 | 120 | 1440 | null

type BookingStepId = 'service' | 'specialist' | 'datetime' | 'contacts'

/** What adding a service undid: the master who does not do it, or the time the visit outgrew. */
type AddNotice =
  | { kind: 'master'; masterName: string; serviceName: string }
  | { kind: 'time'; time: string; minutes: number }

const STEP_ORDER: BookingStepId[] = ['service', 'specialist', 'datetime', 'contacts']

const MIN_PHONE_DIGITS = 9

const CONFLICT_STATUS = 409

// How many open days the form looks ahead for a free slot before showing an empty day.
const MAX_AUTO_DAY_SKIPS = 6

// The sheet is a stack of done cards over one open card: after each choice it goes back to its
// top, where the new card has just landed and the next question waits right under it. The time
// step is the tallest: on a short phone its days ended under the booking bar («приходится чуть
// скролить»), so the sheet stops just low enough to show them, never past the step's own caption.
const scrollToStep = (stepId: BookingStepId, _force = false) => {
  requestAnimationFrame(() => {
    const screen = document.querySelector<HTMLElement>('[data-booking-screen]')
    if (!screen) return
    screen.scrollTo({ top: getStepScrollTop(screen, stepId), behavior: 'smooth' })
    if (stepId === 'datetime') keepDaysInView(screen)
  })
}

// The time step may not be drawn yet on the next frame (a slower phone), and its free times
// arrive later still: the dial that replaces the loading shapes is taller and pushed the days back
// under the bar on an iPhone SE. So for a while, until the person touches the sheet, the sheet is
// lowered (never raised) whenever the step appears or changes height.
const keepDaysInView = (screen: HTMLElement) => {
  let resizeObserver: ResizeObserver | null = null
  const lower = () => {
    const top = getStepScrollTop(screen, 'datetime')
    if (top > screen.scrollTop + 2) screen.scrollTo({ top, behavior: 'smooth' })
  }
  const attach = () => {
    const step = document.getElementById('step-datetime')
    if (resizeObserver || !step?.querySelector('[data-day-row]')) return
    lower()
    if (typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(lower)
    resizeObserver.observe(step)
  }
  const mutationObserver = new MutationObserver(attach)
  const stop = () => {
    mutationObserver.disconnect()
    resizeObserver?.disconnect()
    window.clearTimeout(timer)
    screen.removeEventListener('pointerdown', stop)
    screen.removeEventListener('wheel', stop)
    screen.removeEventListener('touchstart', stop)
  }
  const timer = window.setTimeout(stop, 2500)
  mutationObserver.observe(screen, { childList: true, subtree: true })
  screen.addEventListener('pointerdown', stop, { once: true })
  screen.addEventListener('touchstart', stop, { once: true, passive: true })
  screen.addEventListener('wheel', stop, { once: true, passive: true })
  attach()
}

const getStepScrollTop = (screen: HTMLElement, stepId: BookingStepId) => {
  if (stepId !== 'datetime') return 0
  const step = document.getElementById('step-datetime')
  const days = step?.querySelector('[data-day-row]')
  if (!step || !days) return 0
  const screenBox = screen.getBoundingClientRect()
  // The bar's wrapper keeps no height; the fixed panel inside it is what covers the sheet.
  const barEl = document.querySelector('[data-booking-bar]')
  const barTop = [barEl, ...(barEl?.children ?? [])]
    .map((element) => element?.getBoundingClientRect())
    .find((box) => box && box.height > 0)?.top
  const visibleBottom = Math.min(screenBox.bottom, barTop ?? screenBox.bottom) - 12
  // Positions as if the sheet were at its top.
  const offset = screen.scrollTop - screenBox.top
  const daysBottom = days.getBoundingClientRect().bottom + offset
  const topBar = screen.querySelector('[data-booking-top-bar]')?.getBoundingClientRect().height ?? 0
  const stepTop = step.getBoundingClientRect().top + offset - topBar - 8
  const needed = daysBottom - (visibleBottom - screenBox.top)
  return Math.max(0, Math.min(needed, stepTop))
}

// The main action pressed while a step is still open: the sheet's top is that step already, so
// scrolling there alone did nothing visible («ничего не происходит»). Its choices give a short
// shake instead (`data-nudge` on the step, BookingStep.module.css), and the phone a tap of haptics.
const nudgeStep = (stepId: BookingStepId) => {
  requestAnimationFrame(() => {
    const step = document.getElementById(`step-${stepId}`)
    if (!step) return
    step.removeAttribute('data-nudge')
    // Read the layout once, so the same animation starts again on a second press.
    void step.offsetWidth
    step.setAttribute('data-nudge', '')
    // Only the shake's own end: `animationend` bubbles, and any other animation ending inside
    // the step (a picture, a chip) used to take the mark off before the shake was seen.
    const handleEnd = (event: AnimationEvent) => {
      if (!event.animationName.includes('nudge')) return
      step.removeAttribute('data-nudge')
      step.removeEventListener('animationend', handleEnd)
    }
    step.addEventListener('animationend', handleEnd)
  })
  haptic('warning')
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
  // «Хочу так» on a work: the photo goes with the booking as the look the client wants.
  const look = useLookPhoto(business.slug, searchParams.get('look'))
  // A time shown on a card («Сегодня, 14:30») opens the form on that time, not on a blank day.
  const presetDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') ?? '')
    ? searchParams.get('date')
    : null
  const presetTime =
    presetDate && /^\d{2}:\d{2}$/.test(searchParams.get('time') ?? '')
      ? searchParams.get('time')
      : null
  // «Ещё запись» after a booking: the same day, nothing before the first visit ends (`?after=`).
  const presetAfter =
    presetDate && /^\d{2}:\d{2}$/.test(searchParams.get('after') ?? '')
      ? searchParams.get('after')
      : null
  const [notBefore, setNotBefore] = useState<{ date: string; time: string } | null>(
    presetDate && presetAfter ? { date: presetDate, time: presetAfter } : null,
  )
  const [serviceId, setServiceId] = useState(presetService?.id ?? null)
  // Services done after the first in the same visit, by the same master, in this order.
  const [extraServiceIds, setExtraServiceIds] = useState<string[]>([])
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
  // What adding a service undid, said where the person has to choose again (no silent resets).
  const [addNotice, setAddNotice] = useState<AddNotice | null>(null)
  // A time kept through adding a service, until the free times for the longer visit say it fits.
  const [addedTimeCheck, setAddedTimeCheck] = useState<{ time: string; minutes: number } | null>(
    null,
  )
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
  // What can join the visit in «Изменить» on the service ticket: any master who does it all
  // counts, the chosen one gives way if needed (the form says so).
  const combinableServices = getAddableServices({
    services,
    masters: catalog.specialists,
    chosenIds: chosenServiceIds,
    specialistId: null,
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
  // Times before the visit just booked ends are not offered for «Ещё запись»: shown as taken, so
  // the ruler keeps its look.
  const offeredAvailability =
    notBefore && dayKey === notBefore.date
      ? {
          ...availability,
          slots: availability.slots.map((slot) =>
            slot.time < notBefore.time ? { ...slot, isAvailable: false } : slot,
          ),
        }
      : availability
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
  // - unless a link named a branch or the client picked one meanwhile.
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
    // A place card's time comes without a service: it is checked once a service and a master
    // are chosen, and the time waits on its card until then.
    if (isPresetChecked || !serviceId || !specialistId) return
    if (availability.isLoading || dayKey !== presetDate) return
    setIsPresetChecked(true)
    if (availability.error) return
    if (!availability.slots.some((slot) => slot.isAvailable && slot.time === presetTime)) {
      setTime(null)
      toast.show({
        title: presetService
          ? `${presetTime} уже заняли - выберите другое время`
          : `В ${presetTime} эта услуга не помещается. Выберите другое время`,
        type: 'info',
      })
    }
  }, [
    isPresetChecked,
    serviceId,
    specialistId,
    availability,
    dayKey,
    presetDate,
    presetTime,
    presetService,
    toast,
  ])

  useEffect(() => {
    if (isBranchTimeChecked || availability.isLoading) return
    setIsBranchTimeChecked(true)
    if (!time || availability.error) return
    if (!availability.slots.some((slot) => slot.isAvailable && slot.time === time)) {
      toast.show({ title: `В этом филиале ${time} занято - выберите другое время`, type: 'info' })
      setTime(null)
    }
  }, [isBranchTimeChecked, availability, time, toast])

  // Adding a service kept the time: once the free times for the longer visit are in, keep it if
  // it fits, else say why it went and open the time step.
  useEffect(() => {
    if (!addedTimeCheck || availability.isLoading) return
    setAddedTimeCheck(null)
    if (availability.error) return
    const fits = availability.slots.some(
      (slot) => slot.isAvailable && slot.time === addedTimeCheck.time,
    )
    if (fits) return
    setTime(null)
    setAddNotice({ kind: 'time', ...addedTimeCheck })
  }, [addedTimeCheck, availability])

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
  // and the link's preset; the name and phone stay - they are the same person.
  // «Ещё запись в <place>» on the success screen: another visit at the same place, often to another
  // master, without starting from the catalog. The name and number stay, the day is the visit's,
  // and times before it ends are not offered. The address says so too, so a reload keeps it.
  const bookAnother = () => {
    if (!createdBooking) return
    const [hours = 0, minutes = 0] = createdBooking.time.split(':').map(Number)
    const end = hours * 60 + minutes + createdBooking.durationMinutes
    const after = `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
    setCreatedBooking(null)
    setNotBefore({ date: createdBooking.date, time: after })
    setSelectedDayKey(createdBooking.date)
    setServiceId(null)
    setExtraServiceIds([])
    setSpecialistId(null)
    setTime(null)
    setComment('')
    setPromoCode(null)
    setSubmitError(null)
    setHasTriedSubmit(false)
    setAddNotice(null)
    setFolded({})
    setEditingStep(null)
    const url = new URL(window.location.href)
    for (const key of ['service', 'specialist', 'time']) url.searchParams.delete(key)
    url.searchParams.set('date', createdBooking.date)
    url.searchParams.set('after', after)
    window.history.replaceState(window.history.state, '', url)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startOver = () => {
    setAddNotice(null)
    setServiceId(null)
    setExtraServiceIds([])
    setSpecialistId(null)
    setSelectedDayKey(null)
    setTime(null)
    setComment('')
    setPromoCode(null)
    look.remove()
    setSubmitError(null)
    setHasTriedSubmit(false)
    setFolded({})
    setEditingStep(null)
    clearDraft()
    const url = new URL(window.location.href)
    for (const key of ['service', 'specialist', 'date', 'time', 'look'])
      url.searchParams.delete(key)
    window.history.replaceState(window.history.state, '', url)
    document.querySelector('[data-booking-screen]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectService = (id: string) => {
    setFolded((current) => ({ ...current, service: undefined }))
    // Another first service starts the visit over: the ones added to it went with the old one.
    setExtraServiceIds([])
    const nextSpecialists = getMastersForAll(catalog.specialists, [id], branchId)
    const keepsSpecialist =
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      nextSpecialists.some((item) => item.id === chosenSpecialistId)
    const hasSpecialist = (keepsSpecialist && chosenSpecialistId) || nextSpecialists.length === 1
    setServiceId(id)
    // A time from a link stays until it is checked against this service's free times.
    if (isPresetChecked) setTime(null)
    setSubmitError(null)
    if (!keepsSpecialist) setSpecialistId(null)
    setEditingStep(null)
    scrollToStep(hasSpecialist ? 'datetime' : 'specialist', true)
  }

  // The visit gains a service done right after the others; a master who does not do it lets go.
  const addService = (id: string, { isStepKept = false } = {}) => {
    const nextIds = [...chosenServiceIds, id]
    // No master yet, «любой», or one who does the new service too: the master stays.
    const keepsSpecialist =
      !chosenSpecialistId ||
      chosenSpecialistId === ANY_SPECIALIST_ID ||
      getMastersForAll(catalog.specialists, nextIds, branchId).some(
        (item) => item.id === chosenSpecialistId,
      )
    const added = catalog.services.find((item) => item.id === id)
    setExtraServiceIds(nextIds.slice(1))
    setSubmitError(null)
    // Ticked in the open picker, the picker stays: more can be ticked before «Готово».
    if (!isStepKept) setEditingStep(null)
    if (keepsSpecialist) {
      // Same master: the time stays while the longer visit still fits it (checked below).
      setAddNotice(null)
      if (time && added) setAddedTimeCheck({ time, minutes: added.durationMinutes })
      return
    }
    const droppedMaster = catalog.specialists.find((item) => item.id === chosenSpecialistId)
    setAddNotice(
      droppedMaster && added
        ? { kind: 'master', masterName: droppedMaster.name, serviceName: added.name }
        : null,
    )
    setSpecialistId(null)
    setTime(null)
    if (!isStepKept) scrollToStep('specialist', true)
  }

  // A card ticked or unticked in the picker opened from the service ticket: the visit gains or
  // loses that service and the picker stays open. One service always stays: unticking the last
  // one only closes the step. Taking one off makes the visit shorter, so the master and the time
  // still fit and stay.
  const toggleService = (id: string) => {
    if (!chosenServiceIds.includes(id)) {
      addService(id, { isStepKept: true })
      return
    }
    if (chosenServiceIds.length === 1) {
      finishEditing()
      return
    }
    const rest = chosenServiceIds.filter((item) => item !== id)
    setServiceId(rest[0] ?? null)
    setExtraServiceIds(rest.slice(1))
    setAddNotice(null)
  }

  const selectSpecialist = (id: string) => {
    setAddNotice(null)
    setFolded((current) => ({ ...current, specialist: undefined }))
    setSpecialistId(id)
    if (isPresetChecked) setTime(null)
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
    setAddNotice(null)
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
      nudgeStep(firstIncompleteStep)
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
        channel: readChannel(),
        lookPhotoId: look.photo?.id,
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
      // The sheet scrolls inside itself: bring its top («Вы записаны») into view. Never the window:
      // the sheet lies over the page it was opened from, and scrolling the window threw the
      // catalog under it back to its top.
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
    addNotice,
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
    addService,
    toggleService,
    combinableServices,
    specialists,
    specialistId,
    days,
    dayKey,
    availability: offeredAvailability,
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
    bookAnother,
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
    lookPhoto: look.photo,
    removeLookPhoto: look.remove,
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

export type { AddNotice, BookingStepId, ReminderChoice }
