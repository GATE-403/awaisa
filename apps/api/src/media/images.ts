import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'

type ImageKind = 'cover' | 'photo' | 'avatar' | 'logo'

const SIZES: Record<ImageKind, { width: number; height?: number }> = {
  cover: { width: 1600, height: 1000 },
  photo: { width: 1400 },
  avatar: { width: 480, height: 480 },
  logo: { width: 512, height: 512 },
}

const MAX_INPUT_PIXELS = 50_000_000

// Every upload is re-encoded: EXIF (incl. GPS) is dropped, orientation applied, size capped, WebP out.
const processImage = async (input: Buffer, kind: ImageKind) => {
  const { width, height } = SIZES[kind]
  try {
    return await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width,
        height,
        fit: height ? 'cover' : 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    throw new BadRequestException('Не получилось прочитать изображение - попробуйте JPG или PNG')
  }
}

export type { ImageKind }
export { processImage }
