import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { requestOtp, updateMe, verifyOtp } from '@/shared/api/clientApi'
import type { OtpChannel } from '@/shared/api/types'
import { getSafeRedirect } from '@/shared/lib/safeRedirect'

type LoginStep = 'phone' | 'code' | 'name'

const CODE_LENGTH = 6

export const useLoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setCustomer } = useSession()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phone, setPhone] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [channel, setChannel] = useState<OtpChannel>('sms')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const redirectTo = getSafeRedirect(searchParams.get('next'))

  useEffect(() => {
    if (resendIn <= 0) return

    const timeout = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [resendIn])

  const run = async (action: () => Promise<void>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await action()
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendCode = (preferred: 'auto' | 'sms' = 'auto') =>
    run(async () => {
      const result = await requestOtp(normalizedPhone || phone, preferred)
      setNormalizedPhone(result.phone)
      setChannel(result.channel)
      setResendIn(result.resendAfterSeconds)
      setCode('')
      setStep('code')
    })

  const verify = (value: string) =>
    run(async () => {
      const customer = await verifyOtp(normalizedPhone, value)
      setCustomer(customer)
      if (!customer.name) {
        setStep('name')
        return
      }
      router.replace(redirectTo)
    })

  const changeCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH && !isSubmitting) void verify(digits)
  }

  const saveName = () =>
    run(async () => {
      setCustomer(await updateMe(name))
      router.replace(redirectTo)
    })

  const sendBySms = () => sendCode('sms')

  const editPhone = () => {
    setNormalizedPhone('')
    setStep('phone')
    setError(null)
  }

  return {
    step,
    phone,
    normalizedPhone,
    channel,
    code,
    name,
    error,
    isSubmitting,
    resendIn,
    setPhone,
    setName,
    changeCode,
    sendCode,
    sendBySms,
    verify,
    saveName,
    editPhone,
  }
}

export { CODE_LENGTH }
