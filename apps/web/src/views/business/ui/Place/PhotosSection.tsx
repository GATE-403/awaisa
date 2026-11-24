'use client'

import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { useState } from 'react'
import type { Business } from '@/shared/api/types'
import { PhotoGrid, PhotoGridTile } from '@/shared/ui/PhotoGrid/PhotoGrid'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'

interface PhotosSectionProps {
  business: Business
}

// «Work»: the owner's grid as clients see it, square photos three a row in the owner's order.
// A tap opens them full screen, every one of them.
export const PhotosSection = ({ business }: PhotosSectionProps) => {
  const { t } = useLingui()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <PhotoGrid>
        {business.photos.map((url, index) => (
          <PhotoGridTile
            key={url}
            src={url}
            label={t`Open photo ${ph({ index: index + 1 })} of ${ph({ total: business.photos.length })}`}
            onOpen={() => setOpenIndex(index)}
          />
        ))}
      </PhotoGrid>
      {openIndex !== null && (
        <PhotoViewer
          photos={business.photos}
          startIndex={openIndex}
          label={business.name}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}
