import { ImageResponse } from 'next/og'
import { BUSINESS_KINDS, PLATFORM } from '@/shared/config/platform'
import { getI18nInstance } from '@/shared/i18n/instances'
import { OG_IMAGE_SIZE } from '@/shared/lib/seo/businessMetadata'
import { PlatformOgCard } from '@/shared/lib/seo/OgCard'
import { SITE_TAGLINE, say } from '@/shared/lib/seo/seoText'

export const alt = `${PLATFORM.name} - online booking at salons in Bishkek`
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

// Images cannot read root params: the language comes from the segment itself.
const PlatformOgImage = async ({ params }: { params: Promise<{ lang: string }> }) => {
  const i18n = getI18nInstance((await params).lang)

  return new ImageResponse(
    <PlatformOgCard
      kinds={BUSINESS_KINDS.filter((kind) => kind.value !== 'other').map((kind) =>
        say(i18n, kind.label),
      )}
      tagline={i18n._(SITE_TAGLINE)}
    />,
    size,
  )
}

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default PlatformOgImage
