import { useToast } from '@awaisa/ui/Toast'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/common/api/apiError'
import { checkSlug, createBusiness } from '@/common/api/clientApi'
import type { BusinessKind, SlugCheck } from '@/common/api/types'
import { useSession } from '@/common/hooks/useSession'
import { slugify } from '@/common/utils/slugify'

const SLUG_CHECK_DELAY_MS = 350
const MIN_SLUG_LENGTH = 3

export const useCreateBusinessForm = () => {
  const router = useRouter()
  const toast = useToast()
  const { customer } = useSession()
  const [name, setName] = useState('')
  const [slugInput, setSlug] = useState<string | null>(null)
  const [kind, setKind] = useState<BusinessKind>('beauty')
  const [city, setCity] = useState('Бишкек')
  const [address, setAddress] = useState('')
  const [phoneInput, setPhone] = useState<string | null>(null)
  const [slugCheck, setSlugCheck] = useState<(SlugCheck & { slug: string }) | null>(null)
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const slug = slugInput ?? slugify(name)
  const phone = phoneInput ?? customer?.phone ?? ''
  const currentCheck = slugCheck?.slug === slug ? slugCheck : null
  const errors = {
    name: hasTriedSubmit && name.trim().length < 2 ? 'Укажите название' : undefined,
    slug: currentCheck && !currentCheck.available ? currentCheck.reason : undefined,
  }

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

  const submit = async () => {
    setHasTriedSubmit(true)
    if (name.trim().length < 2 || (currentCheck && !currentCheck.available)) return

    setIsSubmitting(true)
    try {
      const business = await createBusiness({ name: name.trim(), slug, kind, city, address, phone })
      toast.show({
        title: 'Страница создана',
        description: 'Добавьте услуги и мастеров — и можно принимать записи',
        type: 'success',
      })
      router.replace(`/manage/${business.slug}?tab=services`)
    } catch (error) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(error), type: 'error' })
      setIsSubmitting(false)
    }
  }

  return {
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
    submit,
  }
}
