'use client'

import { useRouter } from 'next/navigation'
import { useT } from '@/shared/i18n'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'

type View = 'masters' | 'places'

interface BoardViewSwitchProps {
  view: View
  hrefs: Record<View, string>
}

// «Мастера · Места» as the kit's segmented control: one obvious switch, the board follows the URL.
export const BoardViewSwitch = ({ view, hrefs }: BoardViewSwitchProps) => {
  const t = useT()
  const router = useRouter()

  return (
    <SegmentedControl
      label={t('Рейтинг')}
      value={view}
      items={[
        { value: 'masters', label: t('Мастера') },
        { value: 'places', label: t('Места') },
      ]}
      onChange={(next) => router.push(hrefs[next], { scroll: false })}
    />
  )
}
