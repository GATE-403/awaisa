'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { Copy, DownloadSimple, ShareNetwork } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import type { Branch } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { canShareLinks, copyText, shareLink } from '@/shared/lib/share'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PageTab.module.css'

interface ShareSheetProps {
  slug: string
  businessName: string
  branches: Branch[]
  onClose: () => void
}

type QrMatrix = { size: number; dark: boolean[] }

/** The printed QR's side in px: sharp on a counter card or a sticker. */
const QR_PNG_SIZE = 1024

// "Share": the page's QR for the counter (downloaded as a PNG to print), its link for an
// Instagram bio, and with several branches a booking link per branch (the client lands with that
// branch chosen). On a phone the system share sheet is one tap away too.
export const ShareSheet = ({ slug, businessName, branches, onClose }: ShareSheetProps) => {
  const toast = useToast()
  const t = useT()
  const [origin, setOrigin] = useState('')
  const [qr, setQr] = useState<QrMatrix | null>(null)
  const pageUrl = `${origin}/${slug}`
  const activeBranches = branches.filter((branch) => branch.isActive !== false)
  const canShare = canShareLinks()

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // The encoder is loaded with the sheet, so the cabinet never ships it otherwise.
  useEffect(() => {
    if (!origin) return
    let isCurrent = true
    import('qrcode').then((QRCode) => {
      const { modules } = QRCode.create(`${origin}/${slug}`, { errorCorrectionLevel: 'M' })
      if (isCurrent) setQr({ size: modules.size, dark: Array.from(modules.data, Boolean) })
    })
    return () => {
      isCurrent = false
    }
  }, [origin, slug])

  const copy = async (url: string, title: string) => {
    const isCopied = await copyText(url)
    if (isCopied) toast.show({ title, type: 'success' })
    else toast.show({ title: t('Could not copy'), type: 'error' })
  }

  const download = async () => {
    const QRCode = await import('qrcode')
    const href = await QRCode.toDataURL(pageUrl, { width: QR_PNG_SIZE, margin: 2 })
    const link = document.createElement('a')
    link.href = href
    link.download = `${slug}-qr.png`
    link.click()
  }

  const share = async () => {
    const result = await shareLink({ title: businessName, url: pageUrl })
    if (result === 'failed') toast.show({ title: t('Could not share'), type: 'error' })
  }

  // One path of unit squares: crisp at any size, no image to load.
  const path = qr
    ? qr.dark
        .map((isDark, index) =>
          isDark ? `M${index % qr.size} ${Math.floor(index / qr.size)}h1v1h-1z` : '',
        )
        .join('')
    : ''

  return (
    <Sheet title={t('Share')} onClose={onClose} cancelLabel={t('Close')}>
      <div className={sheet.form}>
        <figure className={styles.qr}>
          {qr ? (
            <svg
              viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
              className={styles.qrCode}
              role='img'
              aria-label={t('QR code of the {name} page', { name: businessName })}
              shapeRendering='crispEdges'
            >
              <rect x={-2} y={-2} width={qr.size + 4} height={qr.size + 4} fill='#fff' />
              <path d={path} fill='#000' />
            </svg>
          ) : (
            <span className={styles.qrCode} />
          )}
          <figcaption className={styles.qrCaption}>
            <span className={styles.qrUrl}>{pageUrl.replace(/^https?:\/\//, '')}</span>
            {t('Point the camera to open the page. Print it for the counter or the window.')}
          </figcaption>
        </figure>
        {/* One line: the link copied as the main action, the QR and the system share as glyphs. */}
        <div className={styles.shareActions}>
          <Button
            type='button'
            size='sm'
            className={styles.shareCopy}
            onClick={() => void copy(pageUrl, t('Page link copied'))}
          >
            <Copy aria-hidden />
            {t('Copy link')}
          </Button>
          <GlyphGroup label={t('More')}>
            <GlyphButton
              icon={<DownloadSimple />}
              label={t('Download QR')}
              onClick={() => void download()}
            />
            {canShare && (
              <GlyphButton icon={<ShareNetwork />} label={t('Send')} onClick={() => void share()} />
            )}
          </GlyphGroup>
        </div>

        {activeBranches.length > 1 && (
          <section className={sheet.group} aria-label={t('Booking links')}>
            <SectionCaption>{t('Booking by branch')}</SectionCaption>
            <div className={sheet.list}>
              {activeBranches.map((branch) => (
                <button
                  key={branch.id}
                  type='button'
                  className={`${sheet.row} ${styles.sheetLink}`}
                  onClick={() =>
                    void copy(
                      `${pageUrl}/book?branch=${branch.id}`,
                      t('Booking link for "{name}" copied', { name: branch.name }),
                    )
                  }
                >
                  <span className={sheet.rowLabel}>{branch.name}</span>
                  <span className={styles.sheetValue}>
                    {t('Copy')}
                    <Copy aria-hidden />
                  </span>
                </button>
              ))}
            </div>
            <p className={sheet.groupFooter}>
              {t(
                'The client lands in booking with this branch chosen. Put the page link in your Instagram bio and on 2GIS.',
              )}
            </p>
          </section>
        )}
      </div>
    </Sheet>
  )
}
