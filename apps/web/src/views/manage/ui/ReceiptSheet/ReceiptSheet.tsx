'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ArrowClockwise, ArrowSquareOut, Copy, ShareNetwork } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { retryReceipt } from '@/shared/api/clientApi'
import type { FiscalReceipt } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { canShareLinks, copyText, shareLink } from '@/shared/lib/share'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { ReceiptPaper } from '@/shared/ui/ReceiptPaper/ReceiptPaper'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './ReceiptSheet.module.css'

interface ReceiptSheetProps {
  slug: string
  receipt: FiscalReceipt
  onClose: () => void
  /** After "Send again", so the list shows the new state. */
  onChange?: (receipt: FiscalReceipt) => void
}

// A sale's or a visit's fiscal receipt: the paper with its QR, then one line - the client's link
// copied as the main action, opening it and the system share as glyphs. A receipt the provider
// refused is sent again from here instead.
export const ReceiptSheet = ({ slug, receipt: initial, onClose, onChange }: ReceiptSheetProps) => {
  const toast = useToast()
  const t = useT()
  const [receipt, setReceipt] = useState(initial)
  const [isSending, setIsSending] = useState(false)
  const canShare = canShareLinks()
  const link = receipt.providerUrl ?? receipt.viewUrl

  const copy = async () => {
    const isCopied = await copyText(link)
    if (isCopied) toast.show({ title: t('Receipt link copied'), type: 'success' })
    else toast.show({ title: t('Could not copy'), type: 'error' })
  }

  const share = async () => {
    const result = await shareLink({
      title: t('Receipt from {name}', { name: receipt.businessName }),
      url: link,
    })
    if (result === 'failed') toast.show({ title: t('Could not share'), type: 'error' })
  }

  const retry = async () => {
    setIsSending(true)
    try {
      const next = await retryReceipt(slug, receipt.id)
      setReceipt(next)
      onChange?.(next)
      toast.show({
        title: t(next.status === 'issued' ? 'Receipt issued' : 'Receipt queued again'),
        type: next.status === 'issued' ? 'success' : 'info',
      })
    } catch (error) {
      toast.show({ title: t('Not sent'), description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Sheet
      title={t(receipt.kind === 'refund' ? 'Refund receipt' : 'Receipt')}
      onClose={onClose}
      cancelLabel={t('Close')}
    >
      <div className={sheet.form}>
        <ReceiptPaper receipt={receipt} surface='sheet' />
        {receipt.status === 'issued' && (
          <div className={styles.actions}>
            <Button type='button' size='sm' className={styles.main} onClick={() => void copy()}>
              <Copy aria-hidden />
              {t('Copy link')}
            </Button>
            <GlyphGroup label={t('More')}>
              <GlyphButton
                icon={<ArrowSquareOut />}
                label={t('Open receipt')}
                onClick={() => window.open(link, '_blank', 'noopener')}
              />
              {canShare && (
                <GlyphButton
                  icon={<ShareNetwork />}
                  label={t('Send')}
                  onClick={() => void share()}
                />
              )}
            </GlyphGroup>
          </div>
        )}
        {receipt.status === 'failed' && (
          <div className={styles.actions}>
            <Button
              type='button'
              size='sm'
              className={styles.main}
              disabled={isSending}
              onClick={() => void retry()}
            >
              <ArrowClockwise aria-hidden />
              {t('Send again')}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
