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

const STEPS = ['name', 'kind', 'contacts'] as const

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
  const [edits, setEdits] = useState<Record<string, TemplateEdit>>({})
  const [city, setCity] = useState('Бишкек')
  const [address, setAddress] = useState('')
  const [phoneInput, setPhone] = useState<string | null>(null)
  const [slugCheck, setSlugCheck] = useState<(SlugCheck & { slug: string }) | null>(null)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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
  const isNameValid = name.trim().length >= 2 && !(currentCheck && !currentCheck.available)
  const errors = {
    name: hasTriedSubmit && name.trim().length < 2 ? t('Укажите название') : undefined,
    slug: currentCheck && !currentCheck.available ? currentCheck.reason : undefined,
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
    const index = STEPS.indexOf(step)
    setStep(STEPS[Math.max(0, index - 1)] ?? 'name')
  }

  // One question per screen, like Setup Assistant: «Далее» validates only the current step.
  const next = () => {
    if (step === 'name') {
      setHasTriedSubmit(true)
      if (isNameValid) setStep('kind')
      return
    }
    if (step === 'kind') {
      setStep('contacts')
      return
    }
    void submit()
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
      toast.show({
        title: t('Страница создана'),
        description: t(
          services.length > 0
            ? 'Осталось добавить мастеров — и можно принимать записи'
            : 'Добавьте услуги и мастеров — и можно принимать записи',
        ),
        type: 'success',
      })
      trackStep('register_done', business.slug)
      router.replace(`/manage/${business.slug}?tab=${services.length > 0 ? 'masters' : 'services'}`)
    } catch (error) {
      toast.show({ title: t('Не получилось'), description: getErrorMessage(error), type: 'error' })
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
    city,
    address,
    phone,
    errors,
    isSlugAvailable: currentCheck?.available === true,
    isSubmitting,
    setName,
    changeSlug,
    setKind,
    setCity,
    setAddress,
    setPhone,
    editTemplate,
    goBack,
    next,
  }
}
