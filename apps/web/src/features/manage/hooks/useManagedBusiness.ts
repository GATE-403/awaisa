import { useToast } from '@awaisa/ui/Toast'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, getErrorMessage } from '@/common/api/apiError'
import { getManagedBusiness } from '@/common/api/clientApi'
import type { BusinessPage } from '@/common/api/types'

type LoadError = { status: number | null; message: string }

export const useManagedBusiness = (slug: string, isEnabled: boolean) => {
  const toast = useToast()
  const [data, setData] = useState<BusinessPage | null>(null)
  const [error, setError] = useState<LoadError | null>(null)
  const [version, setVersion] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the reload trigger
  useEffect(() => {
    if (!isEnabled) return

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
  const run = async (action: () => Promise<unknown>, successTitle: string) => {
    try {
      await action()
      toast.show({ title: successTitle, type: 'success' })
      reload()
      return true
    } catch (actionError) {
      toast.show({
        title: 'Не сохранилось',
        description: getErrorMessage(actionError),
        type: 'error',
      })
      return false
    }
  }

  return { data, error, reload, run }
}
