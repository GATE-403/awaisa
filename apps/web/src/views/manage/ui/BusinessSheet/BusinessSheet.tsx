'use client'

import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { CheckCircle, Eye, EyeSlash, Link } from '@phosphor-icons/react/ssr'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { deleteBusiness, getMyBusinesses, updateBusiness } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import { useT } from '@/shared/i18n'
import { SITE_URL } from '@/shared/lib/seo/siteUrl'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BusinessSheet.module.css'

/** "awaisa.kg": the page's address reads as it does in a link. */
const SITE_HOST = new URL(SITE_URL).host

interface BusinessSheetProps {
  slug: string
  isPublished: boolean
  /** The switch was saved (the settings row shows it at once). */
  onPublishedChange: (isPublished: boolean) => void
  /** The cabinet's own runner: saves, says so in a toast and reloads the cabinet. Without it the
   * switch saves and reports by itself. */
  run?: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
  onClose: () => void
}

// "Hide or delete", a sheet of its own behind a settings row, so the red action is never in
// plain view: hiding the page for a while (the same switch as in "Edit") and, last,
// deleting the business by holding (no dialog on top).
export const BusinessSheet = ({
  slug,
  isPublished,
  onPublishedChange,
  run,
  onClose,
}: BusinessSheetProps) => {
  const t = useT()
  const toast = useToast()
  const router = useRouter()
  const session = useSession()
  const [isDeleting, setIsDeleting] = useState(false)
  const confirmId = useId()
  // Like deleting a repository on GitHub: the page's address typed by hand unlocks the button,
  // so a child with the phone or a stray tap cannot delete the business (the API checks it too).
  const [typed, setTyped] = useState('')
  const isConfirmed = typed.trim().toLowerCase() === slug

  const savePublished = async (isOpen: boolean) => {
    const title = isOpen ? 'Page is open' : 'Page hidden'
    const save = () => updateBusiness(slug, { isPublished: isOpen })
    if (run) {
      if (await run(save, title)) onPublishedChange(isOpen)
      return
    }
    try {
      await save()
      onPublishedChange(isOpen)
      toast.show({ title: t(title), type: 'success' })
      void refreshBusiness(slug)
    } catch (error) {
      toast.show({ title: t('Not saved'), description: getErrorMessage(error), type: 'error' })
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBusiness(slug, typed)
      await refreshBusiness(slug).catch(() => undefined)
      const [others] = await Promise.all([
        getMyBusinesses().catch(() => []),
        session.refreshSession(),
      ])
      toast.show({ title: t('Business deleted'), type: 'success' })
      router.replace(others.length > 0 ? '/manage' : '/bookings')
    } catch (error) {
      setIsDeleting(false)
      toast.show({ title: t('Not deleted'), description: getErrorMessage(error), type: 'error' })
    }
  }

  const Glyph = isPublished ? Eye : EyeSlash

  return (
    <Sheet title={t('Hide or delete')} onClose={onClose} cancelLabel='Done'>
      <div className={sheet.form}>
        {/* Right on the sheet, no inset fill: the glyph, the switch and a ↳ note under it. */}
        <section className={styles.group} aria-label={t('Publishing')}>
          <label className={styles.row}>
            <Glyph className={styles.glyph} aria-hidden />
            <span className={styles.label}>{t('Page is open')}</span>
            <Switch checked={isPublished} onCheckedChange={(value) => void savePublished(value)} />
          </label>
          <RowNote>
            {t('A hidden page is not found in the catalog. Bookings and the cabinet stay.')}
          </RowNote>
        </section>

        {/* What happens is read before the button, not after it. */}
        <section className={styles.group} aria-label={t('Delete business')}>
          <p className={styles.note}>
            {t(
              'We will cancel upcoming bookings, message the clients and refund deposits. The page goes, its address is freed and the team loses access. Past visits and receipts stay in the books.',
            )}
          </p>
          <label className={styles.note} htmlFor={confirmId}>
            {t('To delete, type the page address:')} <strong className={styles.slug}>{slug}</strong>
          </label>
          {/* The address as it reads in a link, typed in place: no box, a hairline under it. */}
          <div className={styles.address} data-confirmed={isConfirmed || undefined}>
            <Link className={styles.glyph} aria-hidden />
            <span className={styles.host} aria-hidden>
              {SITE_HOST}/
            </span>
            <input
              id={confirmId}
              className={styles.addressInput}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete='off'
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              enterKeyHint='done'
            />
            {isConfirmed && <CheckCircle className={styles.check} weight='fill' aria-hidden />}
          </div>
          <HoldButton disabled={!isConfirmed || isDeleting} onConfirm={() => void handleDelete()}>
            {t('Delete business')}
          </HoldButton>
        </section>
      </div>
    </Sheet>
  )
}
