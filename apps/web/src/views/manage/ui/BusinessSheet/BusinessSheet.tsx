'use client'

import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { deleteBusiness, getMyBusinesses, updateBusiness } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import { useT } from '@/shared/i18n'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BusinessSheet.module.css'

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
      await deleteBusiness(slug)
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

  return (
    <Sheet title={t('Скрыть или удалить')} onClose={onClose} cancelLabel='Готово'>
      <div className={sheet.form}>
        <section className={sheet.group} aria-label={t('Публикация')}>
          <div className={sheet.list}>
            <label className={sheet.row}>
              <span className={sheet.rowLabel}>{t('Страница открыта')}</span>
              <Switch
                checked={isPublished}
                onCheckedChange={(value) => void savePublished(value)}
              />
            </label>
          </div>
          <p className={sheet.groupFooter}>
            {t('Скрытую страницу не найдут в каталоге. Записи и кабинет остаются.')}
          </p>
        </section>

        <div className={styles.delete}>
          <HoldButton disabled={isDeleting} onConfirm={() => void handleDelete()}>
            {t('Удалить бизнес')}
          </HoldButton>
          <p className={sheet.groupFooter}>
            {t(
              'Будущие записи отменим и напишем клиентам, предоплату вернём. Страница пропадёт, адрес освободится, команда потеряет доступ. Прошлые визиты и чеки останутся в учёте.',
            )}
          </p>
        </div>
      </div>
    </Sheet>
  )
}
