'use client'

import { useLingui } from '@lingui/react/macro'
import { useRouter } from '@/shared/i18n/navigation'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'

type View = 'masters' | 'places'

interface BoardViewSwitchProps {
  view: View
  hrefs: Record<View, string>
}

// «Specialists · Places» as the kit's segmented control: one obvious switch, the board follows the URL.
export const BoardViewSwitch = ({ view, hrefs }: BoardViewSwitchProps) => {
  const { t } = useLingui()
  const router = useRouter()

  return (
    <SegmentedControl
      label={t`Rating`}
      value={view}
      items={[
        { value: 'masters', label: t`Specialists` },
        { value: 'places', label: t`Places` },
      ]}
      onChange={(next) => router.push(hrefs[next], { scroll: false })}
    />
  )
}
