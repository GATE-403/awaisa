'use client'

import { plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MasterCard, MasterGrid } from '@/entities/business'
import type { PublicProfile } from '@/shared/api/types'
import { toBusinessDayKey } from '@/shared/lib/businessTime'
import { useToday } from '@/shared/lib/hooks/useToday'
import { agoLabel } from '../lib/since'

type Master = PublicProfile['masters'][number]

interface ProfileMastersProps {
  masters: Master[]
}

// The masters as the place page shows them, 3:4 picture cards three a row (`MasterCard`), the
// one visited most first; each says how often and how long ago («4 visits · 3 wk ago») and
// books that master. A big lead row with faces under it was rejected as a poor choice and awkward.
export const ProfileMasters = ({ masters }: ProfileMastersProps) => {
  const { t } = useLingui()
  const today = useToday()

  return (
    <MasterGrid>
      {masters.map((master) => {
        // When is read on the client only: the server does not know today.
        const ago =
          today && master.lastVisitAt
            ? agoLabel(toBusinessDayKey(master.lastVisitAt), today.dayKey, t)
            : null
        return (
          <li key={master.id}>
            <MasterCard
              specialist={{ ...master, rating: null }}
              href={`/${master.slug}/book?specialist=${master.id}`}
              meta={[t`${plural(master.visits, { one: '# visit', other: '# visits' })}`, ago]
                .filter(Boolean)
                .join(' · ')}
            />
          </li>
        )
      })}
    </MasterGrid>
  )
}
