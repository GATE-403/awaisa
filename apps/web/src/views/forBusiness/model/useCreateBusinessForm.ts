import { useToast } from '@awaisa/ui/Toast'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { checkSlug, createBusiness } from '@/shared/api/clientApi'
import type { BusinessKind, SlugCheck } from '@/shared/api/types'
import { SERVICE_TEMPLATES } from '@/shared/config/serviceTemplates'
import { useT } from '@/shared/i18n'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { slugify } from '@/shared/lib/slugify'
import { trackFormError, trackStep } from '@/shared/lib/telemetry'

const SLUG_CHECK_DELAY_MS = 350
const MIN_SLUG_LENGTH = 3

// The API's own rule (`business-rules.ts` `getSlugProblem`): checked here before «Далее», so a
// two-letter or malformed link never reaches the last step and fails there.
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/

const getSlugFormatProblem = (slug: string) => {
  if (slug.length < MIN_SLUG_LENGTH) return 'Link: at least 3 characters'
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) {
    return 'Link: Latin letters, numbers and hyphens, no hyphen at the start or end'
  }
  return null
}

const STEPS = ['name', 'kind', 'services', 'contacts'] as const

type CreateStep = (typeof STEPS)[number]

type TemplateEdit = { isChecked: boolean; price: string }

export const useCreateBusinessForm = () => {
  const t = useT()
  const router = useRouter()
  const toast = useToast()
  const { customer } = useSession()
  const [name, setName] = useState('')
  const [slugInput, setSlug] = useState<string | null>(null)
  const [step, setStep] = useState<CreateStep>('name')
  const [kind, setKind] = useState<BusinessKind>('beauty')
  const [hasPickedKind, setHasPickedKind] = useState(false)
  const [edits, setEdits] = useState<Record<string, TemplateEdit>>({})
  const [city, setCity] = useState('Bishkek')
  const [address, setAddress] = useState('')
  const [phoneInput, setPhone] = useState<string | null>(null)
  const [slugCheck, setSlugCheck] = useState<(SlugCheck & { slug: string }) | null>(null)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [launched, setLaunched] = useState<{ slug: string; hasServices: boolean } | null>(null)
  const slug = slugInput ?? slugify(name)
  const phone = phoneInput ?? maskPhoneInput(customer?.phone ?? '')
  const currentCheck = slugCheck?.slug === slug ? slugCheck : null
  const templates = SERVICE_TEMPLATES[kind].map((template) => {
    const edit = edits[`${kind}:${template.name}`]

    return {
      ...template,
      isChecked: edit?.isChecked ?? true,
      price: edit?.price ?? String(template.price),
    }
  })
  const slugFormatProblem = getSlugFormatProblem(slug)
  // A taken link says so at once; a short or malformed one only after «Далее» (not while typing).
  const getSlugError = () => {
    if (currentCheck && !currentCheck.available) return currentCheck.reason
    if (hasTriedSubmit && slugFormatProblem) return t(slugFormatProblem)
    return undefined
  }
  const isSlugTaken = currentCheck !== null && !currentCheck.available
  const isNameValid = name.trim().length >= 2 && slugFormatProblem === null && !isSlugTaken
  const errors = {
    name: hasTriedSubmit && name.trim().length < 2 ? t('Enter a name') : undefined,
    slug: getSlugError(),
  }

  // Which step of the setup people reach, and what the name step refuses (codes only).
  useEffect(() => {
    trackStep(`register_${step}`)
  }, [step])

  useEffect(() => {
    if (errors.name) trackFormError('business_name')
    if (errors.slug) trackFormError('business_slug')
  }, [errors.name, errors.slug])

  useEffect(() => {
    if (slug.length < MIN_SLUG_LENGTH) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      checkSlug(slug, controller.signal)
        .then((result) => setSlugCheck({ ...result, slug }))
        .catch(() => undefined)
    }, SLUG_CHECK_DELAY_MS)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [slug])

  const changeSlug = (value: string) => setSlug(slugify(value))

  const editTemplate = (templateName: string, edit: Partial<TemplateEdit>) => {
    const key = `${kind}:${templateName}`
    const current = templates.find((item) => item.name === templateName)
    if (!current) return

    setEdits((all) => ({
      ...all,
      [key]: { isChecked: current.isChecked, price: current.price, ...edit },
    }))
  }

  const goBack = () => {
    // A kind with no starter menu skipped «Что в меню?» on the way forward, so back skips it too.
    if (step === 'contacts' && templates.length === 0) {
      setStep('kind')
      return
    }
    const index = STEPS.indexOf(step)
    setStep(STEPS[Math.max(0, index - 1)] ?? 'name')
  }

  // The kind is one tap, like the first pick in booking: it moves on at once - to the starter
  // menu, or straight to contacts when the kind has none («Другое»).
  const pickKind = (value: BusinessKind) => {
    setKind(value)
    setHasPickedKind(true)
    setStep(SERVICE_TEMPLATES[value].length > 0 ? 'services' : 'contacts')
  }

  // One question per screen, like Setup Assistant: «Далее» validates only the current step.
  const next = () => {
    if (step === 'name') {
      setHasTriedSubmit(true)
      if (!isNameValid) return
      if (currentCheck) {
        setStep('kind')
        return
      }
      // Not checked yet (typed fast, «Далее» at once): ask now, move on only when it is free.
      void checkSlug(slug)
        .then((result) => {
          setSlugCheck({ ...result, slug })
          if (result.available) setStep('kind')
        })
        .catch(() => setStep('kind'))
      return
    }
    if (step === 'kind') {
      pickKind(kind)
      return
    }
    if (step === 'services') {
      setStep('contacts')
      return
    }
    void submit()
  }

  const openCabinet = () => {
    if (!launched) return
    toast.show({
      title: t('Page created'),
      description: t(
        launched.hasServices
          ? 'Add specialists and you can start taking bookings'
          : 'Add services and specialists and you can start taking bookings',
      ),
      type: 'success',
    })
    router.replace(`/manage/${launched.slug}?tab=${launched.hasServices ? 'masters' : 'services'}`)
  }

  // Visited routes stay mounted (hidden): once the page is left, it starts over, or coming back to
  // «Создать страницу» replayed the launch of the page just made and sent the owner to it again.
  const reset = () => {
    setName('')
    setSlug(null)
    setStep('name')
    setKind('beauty')
    setHasPickedKind(false)
    setEdits({})
    setCity('Bishkek')
    setAddress('')
    setPhone(null)
    setSlugCheck(null)
    setHasTriedSubmit(false)
    setIsSubmitting(false)
    setLaunched(null)
  }

  const submit = async () => {
    setHasTriedSubmit(true)
    if (!isNameValid) {
      setStep('name')
      return
    }

    setIsSubmitting(true)
    try {
      const services = templates
        .filter((item) => item.isChecked)
        .map((item) => ({
          name: item.name,
          durationMinutes: item.durationMinutes,
          price: Number(item.price) || 0,
          isPopular: item.isPopular ?? false,
        }))
      const business = await createBusiness({
        name: name.trim(),
        slug,
        kind,
        city,
        address,
        phone,
        services,
      })
      trackStep('register_done', business.slug)
      // The cabinet opens after the launch moment (`PageLaunch`), then says what is next.
      setLaunched({
        slug: business.slug,
        hasServices: services.length > 0,
      })
    } catch (error) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(error),
        type: 'error',
      })
      setIsSubmitting(false)
    }
  }

  return {
    step,
    stepNumber: STEPS.indexOf(step) + 1,
    stepCount: STEPS.length,
    templates,
    name,
    slug,
    kind,
    hasPickedKind,
    city,
    address,
    phone,
    errors,
    isSlugAvailable: currentCheck?.available === true,
    isSubmitting,
    launched,
    openCabinet,
    reset,
    setName,
    changeSlug,
    pickKind,
    setCity,
    setAddress,
    setPhone,
    editTemplate,
    goBack,
    next,
  }
}
