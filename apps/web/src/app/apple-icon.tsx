import { ImageResponse } from 'next/og'
import { MASCOT_PATH } from '@/shared/ui/Mascot/Mascot'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// The home-screen icon: the white mascot on the brand blue, full bleed (iOS rounds the corners).
const AppleIcon = () =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a6cf0',
      }}
    >
      <svg width='104' height='111' viewBox='0 0 30 32' fill='#fff' aria-hidden='true'>
        <path fillRule='evenodd' clipRule='evenodd' d={MASCOT_PATH} />
      </svg>
    </div>,
    size,
  )

// biome-ignore lint/style/noDefaultExport: Next reads metadata routes from the default export
export default AppleIcon
