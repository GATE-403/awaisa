'use client'

import { useToast } from '@awaisa/ui/Toast'
import { getErrorMessage } from '@/shared/api/apiError'
import { reportContent } from '@/shared/api/clientApi'
import type { ReportReason, ReportTargetType } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { deviceSession } from '@/shared/lib/telemetry'

// A report goes by account when signed in, else by this device's random id: three different
// reporters hide the thing until a moderator looks.
const useReport = (targetType: ReportTargetType, targetId: string, onReported?: () => void) => {
  const toast = useToast()
  const t = useT()

  return async (reason: ReportReason) => {
    try {
      await reportContent({ targetType, targetId, reason, session: deviceSession() ?? undefined })
      onReported?.()
      toast.show({ title: t('Thanks, a moderator will review the report'), type: 'info' })
    } catch (error) {
      toast.show({ title: getErrorMessage(error), type: 'error' })
    }
  }
}

export { useReport }
