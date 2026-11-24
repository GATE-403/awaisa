import { useLingui } from '@lingui/react/macro'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { requestOtp, updateMe, verifyOtp } from '@/shared/api/clientApi'
import type { Customer } from '@/shared/api/types'
import { isSignInOnlyPath } from '@/shared/config/navigation'
import { useRouter } from '@/shared/i18n/navigation'
import { phoneProblem } from '@/shared/lib/inputMasks'
import { getSafeRedirect } from '@/shared/lib/safeRedirect'
import { trackFormError, trackStep } from '@/shared/lib/telemetry'

type LoginStep = 'phone' | 'code' | 'name'

const CODE_LENGTH = 6

const getCloseTarget = (redirectTo: string) => {
  const path = redirectTo.split(/[?#]/)[0] ?? '/'
  if (!isSignInOnlyPath(path)) return redirectTo
  return path === '/business/new' ? '/business' : '/'
}

export const useLoginForm = () => {
  const { t } = useLingui()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setCustomer } = useSession()
  const [step, setStep] = useState<LoginStep>('phone')
  const [phone, setPhoneValue] = useState('')
  const [normalizedPhone, setNormalizedPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  // A wrong code: the cells turn red and shake once per attempt (the count re-keys the field).
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [isCodeInvalid, setIsCodeInvalid] = useState(false)
  // Signed in: the transition plays over the screen, then `leave` goes where the person was going.
  const [isSignedIn, setIsSignedIn] = useState(false)
  // Whom the transition greets: the account's name, or the one just typed.
  const [signedInName, setSignedInName] = useState('')
  const redirectTo = getSafeRedirect(searchParams.get('next'))
  // ✕ goes where the person was going, unless that page itself asks to sign in: then to the
  // business landing for the setup, else to the catalog.
  const closeTo = getCloseTarget(redirectTo)

  useEffect(() => {
    trackStep('login_open')
  }, [])

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

  // Codes go to Telegram only (the API never texts them).
  const sendCode = () => {
    // Checked here, not by disabling the button: the person learns what is missing.
    const problem = normalizedPhone ? null : phoneProblem(phone)
    if (problem) {
      setError(t(problem))
      trackFormError('phone')
      return
    }
    return run(async () => {
      const result = await requestOtp(normalizedPhone || phone)
      trackStep('otp_sent', undefined, { channel: result.channel })
      setNormalizedPhone(result.phone)
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
        trackStep('otp_error')
        throw verifyError
      })
      finishSignIn(customer)
    })

  // A verified number (by code or through the Telegram bot): new clients name themselves first.
  const finishSignIn = (customer: Customer) => {
    setCustomer(customer)
    trackStep('otp_ok')
    if (!customer.name) {
      setNormalizedPhone(customer.phone)
      setStep('name')
      return
    }
    trackStep('login_done')
    router.prefetch(redirectTo)
    setSignedInName(customer.name)
    setIsSignedIn(true)
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
      trackStep('login_done')
      router.prefetch(redirectTo)
      setSignedInName(name)
      setIsSignedIn(true)
    })

  const setPhone = (value: string) => {
    setPhoneValue(value)
    setError(null)
  }

  const editPhone = () => {
    setNormalizedPhone('')
    setStep('phone')
    setError(null)
  }

  const leave = () => router.replace(redirectTo)

  // Visited routes stay mounted (hidden): once the page is left, it starts over from the number,
  // or coming back to /login would replay the transition and leave again.
  const reset = () => {
    setIsSignedIn(false)
    setStep('phone')
    setCode('')
    setError(null)
  }

  return {
    step,
    isSignedIn,
    signedInName,
    leave,
    reset,
    phone,
    normalizedPhone,
    code,
    name,
    error,
    isSubmitting,
    resendIn,
    wrongAttempts,
    isCodeInvalid,
    redirectTo,
    closeTo,
    setPhone,
    setName,
    changeCode,
    sendCode,
    verify,
    saveName,
    finishSignIn,
    editPhone,
  }
}

export type { LoginStep }
export { CODE_LENGTH }
