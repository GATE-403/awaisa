'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { DownloadSimple } from '@phosphor-icons/react/ssr'
import { useRef, useState } from 'react'
import { Ticket } from '@/entities/booking'
import type { Booking } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './TicketViewer.module.css'

interface TicketViewerProps {
  booking: Booking
  onClose: () => void
}

const toFileName = (booking: Booking) =>
  `talon-${booking.business.slug}-${booking.date}-${booking.time.replace(':', '')}.png`

// Like showing a ticket at the door: only the ticket, large and bright, and a way to keep it.
export const TicketViewer = ({ booking, onClose }: TicketViewerProps) => {
  const toast = useToast()
  const ticketRef = useRef<HTMLDivElement>(null)
  const [isSaving, setIsSaving] = useState(false)

  const download = async () => {
    const node = ticketRef.current
    if (!node) return
    setIsSaving(true)
    try {
      const { toBlob } = await import('html-to-image')
      const background = getComputedStyle(document.documentElement).getPropertyValue(
        '--color-sheet',
      )
      const blob = await toBlob(node, { pixelRatio: 3, backgroundColor: background.trim() })
      if (!blob) throw new Error('empty image')
      const file = new File([blob], toFileName(booking), { type: 'image/png' })

      // Phones save images through the share sheet; desktops get a regular download.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Талон: ${booking.serviceName}` })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        link.click()
        URL.revokeObjectURL(url)
      }
      haptic('success')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: 'Не получилось сохранить талон', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title='Талон'
      cancelLabel='Закрыть'
      onClose={onClose}
      action={{
        label: isSaving ? 'Сохраняем…' : 'Скачать',
        onClick: download,
        disabled: isSaving,
      }}
    >
      <div className={styles.stage}>
        <div ref={ticketRef} className={styles.ticket}>
          <Ticket booking={booking} />
        </div>
        <p className={styles.hint}>Покажите талон администратору или сохраните картинкой.</p>
        <Button variant='outline' onClick={download} disabled={isSaving}>
          <DownloadSimple weight='bold' aria-hidden />
          {isSaving ? 'Сохраняем…' : 'Скачать картинкой'}
        </Button>
      </div>
    </Sheet>
  )
}
