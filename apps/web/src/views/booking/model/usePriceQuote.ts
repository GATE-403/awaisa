'use client'

import { useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { getPriceQuote } from '@/shared/api/clientApi'
import type { PriceQuote } from '@/shared/api/types'

const BAD_REQUEST = 400
const MIN_PHONE_DIGITS = 9

type QuoteRequest = {
  serviceId: string | null
  /** Services done after the first in the same visit. */
  extraServiceIds?: string[]
  date: string | null
  time: string | null
  code: string | null
  /** The typed number (guests) - a first-visit discount needs it. */
  phone: string
}

// The price this visit will actually cost: the API applies the best promotion (hours, first
// visit, the client's code). A code the business does not have comes back as `codeError`.
export const usePriceQuote = ({
  serviceId,
  extraServiceIds = [],
  date,
  time,
  code,
  phone,
}: QuoteRequest) => {
  const extras = extraServiceIds.join(',')
  const [quote, setQuote] = useState<PriceQuote | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const digits = phone.replace(/\D/g, '')
  const phoneParam = digits.length >= MIN_PHONE_DIGITS ? phone : ''

  useEffect(() => {
    if (!serviceId || !date || !time) {
      setQuote(null)
      return
    }
    const controller = new AbortController()
    getPriceQuote(
      {
        serviceId,
        extraServiceIds: extras ? extras.split(',') : undefined,
        date,
        time,
        code: code ?? undefined,
        phone: phoneParam || undefined,
      },
      controller.signal,
    )
      .then((result) => {
        setQuote(result)
        setCodeError(null)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setQuote(null)
        if (code && error instanceof ApiError && error.status === BAD_REQUEST) {
          setCodeError(getErrorMessage(error))
        }
      })
    return () => controller.abort()
  }, [serviceId, extras, date, time, code, phoneParam])

  return { quote, codeError }
}
