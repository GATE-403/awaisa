'use client'

import { MenuItem } from '@awaisa/ui/Menu'
import type { ReportReason } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { REPORT_REASONS } from '../config/reasons'

interface ReportReasonsProps {
  onPick: (reason: ReportReason) => void
}

// The reasons as menu rows, for a menu that already has other actions (the feed's «⋯»).
export const ReportReasons = ({ onPick }: ReportReasonsProps) => {
  const t = useT()

  return REPORT_REASONS.map((reason) => (
    <MenuItem key={reason.value} onClick={() => onPick(reason.value)}>
      {t(reason.label)}
    </MenuItem>
  ))
}
