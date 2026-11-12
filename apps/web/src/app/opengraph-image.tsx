import { ImageResponse } from 'next/og'
import { BUSINESS_KINDS, PLATFORM } from '@/shared/config/platform'
import { OG_IMAGE_SIZE } from '@/shared/lib/seo/businessMetadata'
import { PlatformOgCard } from '@/shared/lib/seo/OgCard'

export const alt = `${PLATFORM.name} — онлайн-запись в салоны Бишкека`
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

const PlatformOgImage = () =>
  new ImageResponse(
    <PlatformOgCard
      kinds={BUSINESS_KINDS.filter((kind) => kind.value !== 'other').map((kind) => kind.label)}
    />,
    size,
  )

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default PlatformOgImage
