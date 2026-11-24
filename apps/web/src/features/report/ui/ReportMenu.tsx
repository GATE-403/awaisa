'use client'

import { Menu, MenuGroup } from '@awaisa/ui/Menu'
import { Flag } from '@phosphor-icons/react/ssr'
import type { ReportTargetType } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { useReport } from '../model/useReport'
import styles from './ReportMenu.module.css'
import { ReportReasons } from './ReportReasons'

interface ReportMenuProps {
  targetType: ReportTargetType
  targetId: string
  /** Read by screen readers and shown as the tooltip: «Report review». */
  label: string
  className?: string
  onReported?: () => void
}

// A thin flag that opens the reasons straight away: reporting is the only thing it does, so
// there is no «⋯» menu with one row in between.
export const ReportMenu = ({
  targetType,
  targetId,
  label,
  className,
  onReported,
}: ReportMenuProps) => {
  const report = useReport(targetType, targetId, onReported)
  const t = useT()

  return (
    <Menu label={label} className={className ?? styles.trigger} trigger={<Flag aria-hidden />}>
      <MenuGroup label={t('Report')}>
        <ReportReasons onPick={(reason) => void report(reason)} />
      </MenuGroup>
    </Menu>
  )
}
