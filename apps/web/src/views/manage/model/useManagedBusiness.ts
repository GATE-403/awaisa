import { useToast } from '@awaisa/ui/Toast'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getErrorMessage } from '@/shared/api/apiError'
import { getManagedBusiness } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { BusinessPage } from '@/shared/api/types'
import { useT } from '@/shared/i18n'

type LoadError = { status: number | null; message: string }

export const useManagedBusiness = (
  slug: string,
  isEnabled: boolean,
  initial: BusinessPage | null = null,
) => {
  const toast = useToast()
  const t = useT()
  const [data, setData] = useState<BusinessPage | null>(initial)
  // Rendered from the server's read: the first load is already here.
  const hasInitial = useRef(initial !== null)
  const [error, setError] = useState<LoadError | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the reload trigger
  useEffect(() => {
    if (!isEnabled) return
    if (hasInitial.current) {
      hasInitial.current = false
      return
    }

    const controller = new AbortController()
    getManagedBusiness(slug, controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        setError({
          status: requestError instanceof ApiError ? requestError.status : null,
          message: getErrorMessage(requestError),
        })
      })

    return () => controller.abort()
  }, [slug, isEnabled, version])

  const reload = useCallback(() => setVersion((value) => value + 1), [])

  // Runs a change, reports it with a toast and refreshes the cabinet; returns whether it worked.
  // Callers pass the Russian title: it is the dictionary key, translated here.
  const run = async (action: () => Promise<unknown>, successTitle: string) => {
    try {
      await action()
      toast.show({ title: t(successTitle), type: 'success' })
      reload()
      void refreshBusiness(slug)
      return true
    } catch (actionError) {
      toast.show({
        title: t('Не сохранилось'),
        description: getErrorMessage(actionError),
        type: 'error',
      })
      return false
    }
  }

  return { data, error, reload, run }
}
