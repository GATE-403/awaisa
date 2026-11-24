'use client'

import { MenuItem } from '@awaisa/ui/Menu'
import { useLingui } from '@lingui/react/macro'
import type { ReportReason } from '@/shared/api/types'
import { REPORT_REASONS } from '../config/reasons'

interface ReportReasonsProps {
  onPick: (reason: ReportReason) => void
}

// The reasons as menu rows, for a menu that already has other actions (the feed's «⋯»).
export const ReportReasons = ({ onPick }: ReportReasonsProps) => {
  const { t } = useLingui()

  return REPORT_REASONS.map((reason) => (
    <MenuItem key={reason.value} onClick={() => onPick(reason.value)}>
      {t(reason.label)}
    </MenuItem>
  ))
}
