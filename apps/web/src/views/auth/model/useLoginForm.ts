import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { requestOtp, updateMe, verifyOtp } from '@/shared/api/clientApi'
import type { Customer, OtpChannel } from '@/shared/api/types'
import { phoneProblem } from '@/shared/lib/inputMasks'
import { getSafeRedirect } from '@/shared/lib/safeRedirect'

type LoginStep = 'phone' | 'code' | 'name'

const CODE_LENGTH = 6

export const useLoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setCustomer } = useSession()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phone, setPhoneValue] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [channel, setChannel] = useState<OtpChannel>('sms')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  // A wrong code: the cells turn red and shake once per attempt (the count re-keys the field).
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [isCodeInvalid, setIsCodeInvalid] = useState(false)
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

  const sendCode = (preferred: 'auto' | 'sms' = 'auto') => {
    // Checked here, not by disabling the button: the person learns what is missing.
    const problem = normalizedPhone ? null : phoneProblem(phone)
    if (problem) {
      setError(problem)
      return
    }
    return run(async () => {
      const result = await requestOtp(normalizedPhone || phone, preferred)
      setNormalizedPhone(result.phone)
      setChannel(result.channel)
      setResendIn(result.resendAfterSeconds)
      setCode('')
      setIsCodeInvalid(false)
      setStep('code')
    })
  }

  const verify = (value: string) =>
    run(async () => {
      const customer = await verifyOtp(normalizedPhone, value).catch((verifyError: unknown) => {
        setCode('')
        setIsCodeInvalid(true)
        setWrongAttempts((count) => count + 1)
        throw verifyError
      })
      finishSignIn(customer)
    })

  // A verified number (by code or through the Telegram bot): new clients name themselves first.
  const finishSignIn = (customer: Customer) => {
    setCustomer(customer)
    if (!customer.name) {
      setNormalizedPhone(customer.phone)
      setStep('name')
      return
    }
    router.replace(redirectTo)
  }

  const changeCode = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits) setIsCodeInvalid(false)
    if (digits.length === CODE_LENGTH && !isSubmitting) void verify(digits)
  }

  const saveName = () =>
    run(async () => {
      setCustomer(await updateMe(name))
      router.replace(redirectTo)
    })

  const sendBySms = () => sendCode('sms')

  const setPhone = (value: string) => {
    setPhoneValue(value)
    setError(null)
  }

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
    wrongAttempts,
    isCodeInvalid,
    redirectTo,
    setPhone,
    setName,
    changeCode,
    sendCode,
    sendBySms,
    verify,
    saveName,
    finishSignIn,
    editPhone,
  }
}

export { CODE_LENGTH }
