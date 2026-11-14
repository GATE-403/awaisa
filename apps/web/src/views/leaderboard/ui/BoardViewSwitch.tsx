'use client'

import { useRouter } from 'next/navigation'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'

type View = 'masters' | 'places'

interface BoardViewSwitchProps {
  view: View
  hrefs: Record<View, string>
}

// «Мастера · Места» as the kit's segmented control: one obvious switch, the board follows the URL.
export const BoardViewSwitch = ({ view, hrefs }: BoardViewSwitchProps) => {
  const router = useRouter()

  return (
    <SegmentedControl
      label='Рейтинг'
      value={view}
      items={[
        { value: 'masters', label: 'Мастера' },
        { value: 'places', label: 'Места' },
      ]}
      onChange={(next) => router.push(hrefs[next], { scroll: false })}
    />
  )
}
