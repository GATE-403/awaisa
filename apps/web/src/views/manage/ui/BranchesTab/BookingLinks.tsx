'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Copy } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import type { Branch } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { copyText } from '@/shared/lib/share'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from '@/views/manage/ui/manageForms.module.css'
import links from './BookingLinks.module.css'

interface BookingLinksProps {
  slug: string
  branches: Branch[]
}

// One link per address for 2ГИС, Instagram or a QR on the door: the client lands on booking with
// their branch already chosen.
export const BookingLinks = ({ slug, branches }: BookingLinksProps) => {
  const toast = useToast()
  const t = useT()
  // The page's own origin, read after hydration so server and client render the same.
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  const items = [
    ...(branches.length > 1
      ? [{ id: 'all', title: t('Все филиалы'), path: `/${slug}/book` }]
      : [{ id: 'one', title: branches[0]?.name ?? t('Запись'), path: `/${slug}/book` }]),
    ...(branches.length > 1
      ? branches
          .filter((branch) => branch.isActive !== false)
          .map((branch) => ({
            id: branch.id,
            title: branch.name,
            path: `/${slug}/book?branch=${branch.id}`,
          }))
      : []),
  ]

  const handleCopy = async (url: string) => {
    const isCopied = await copyText(url)
    if (isCopied) toast.show({ title: t('Ссылка скопирована'), description: url, type: 'success' })
    else toast.show({ title: t('Не удалось скопировать'), description: url, type: 'error' })
  }

  return (
    <div className={styles.group}>
      <SectionCaption>{t('Ссылки для записи')}</SectionCaption>
      <ul className={styles.list}>
        {items.map((item) => {
          const url = `${origin}${item.path}`
          return (
            <li key={item.id} className={links.row}>
              <span className={links.text}>
                <span className={links.title}>{item.title}</span>
                <span className={links.url}>{url.replace(/^https?:\/\//, '')}</span>
              </span>
              <button
                type='button'
                className={links.copy}
                onClick={() => handleCopy(url)}
                aria-label={t('Скопировать ссылку: {name}', { name: item.title })}
              >
                <Copy aria-hidden />
                {t('Скопировать')}
              </button>
            </li>
          )
        })}
      </ul>
      <RowNote>
        {t(
          'Поставьте ссылку филиала в его карточку в 2ГИС, в Instagram или на QR у входа: клиент сразу попадёт в запись в нужный филиал.',
        )}
      </RowNote>
    </div>
  )
}
