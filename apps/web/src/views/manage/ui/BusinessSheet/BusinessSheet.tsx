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

/** «awaisa.kg»: the page's address reads as it does in a link. */
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

// «Скрыть или удалить», a sheet of its own behind a settings row, so the red action is never in
// plain view: hiding the page for a while (the same switch as in «Редактировать») and, last,
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
    const title = isOpen ? 'Страница открыта' : 'Страница скрыта'
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
      toast.show({ title: t('Не сохранили'), description: getErrorMessage(error), type: 'error' })
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
      toast.show({ title: t('Бизнес удалён'), type: 'success' })
      router.replace(others.length > 0 ? '/manage' : '/bookings')
    } catch (error) {
      setIsDeleting(false)
      toast.show({ title: t('Не удалили'), description: getErrorMessage(error), type: 'error' })
    }
  }

  const Glyph = isPublished ? Eye : EyeSlash

  return (
    <Sheet title={t('Скрыть или удалить')} onClose={onClose} cancelLabel='Готово'>
      <div className={sheet.form}>
        {/* Right on the sheet, no inset fill: the glyph, the switch and a ↳ note under it. */}
        <section className={styles.group} aria-label={t('Публикация')}>
          <label className={styles.row}>
            <Glyph className={styles.glyph} aria-hidden />
            <span className={styles.label}>{t('Страница открыта')}</span>
            <Switch checked={isPublished} onCheckedChange={(value) => void savePublished(value)} />
          </label>
          <RowNote>
            {t('Скрытую страницу не найдут в каталоге. Записи и кабинет остаются.')}
          </RowNote>
        </section>

        {/* What happens is read before the button, not after it. */}
        <section className={styles.group} aria-label={t('Удалить бизнес')}>
          <p className={styles.note}>
            {t(
              'Будущие записи отменим и напишем клиентам, предоплату вернём. Страница пропадёт, адрес освободится, команда потеряет доступ. Прошлые визиты и чеки останутся в учёте.',
            )}
          </p>
          <label className={styles.note} htmlFor={confirmId}>
            {t('Чтобы удалить, введите адрес страницы:')}{' '}
            <strong className={styles.slug}>{slug}</strong>
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
            {t('Удалить бизнес')}
          </HoldButton>
        </section>
      </div>
    </Sheet>
  )
}
