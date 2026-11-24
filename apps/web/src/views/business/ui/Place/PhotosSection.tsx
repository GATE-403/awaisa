'use client'

import { useState } from 'react'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { PhotoGrid, PhotoGridTile } from '@/shared/ui/PhotoGrid/PhotoGrid'
import { PhotoViewer } from '@/shared/ui/PhotoViewer/PhotoViewer'

interface PhotosSectionProps {
  business: Business
}

// «Work»: the owner's grid as clients see it, square photos three a row in the owner's order.
// A tap opens them full screen, every one of them.
export const PhotosSection = ({ business }: PhotosSectionProps) => {
  const t = useT()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <>
      <PhotoGrid>
        {business.photos.map((url, index) => (
          <PhotoGridTile
            key={url}
            src={url}
            label={t('Open photo {index} of {total}', {
              index: index + 1,
              total: business.photos.length,
            })}
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
