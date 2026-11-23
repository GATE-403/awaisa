'use client'

import { useToast } from '@awaisa/ui/Toast'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef } from 'react'
import type { Business, Catalog } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import type { ManageTab } from '@/views/manage/manageTabs'
import styles from './SetupProgress.module.css'

interface SetupProgressProps {
  business: Business
  catalog: Catalog
}

export const SetupProgress = ({ business, catalog }: SetupProgressProps) => {
  const toast = useToast()
  const t = useT()
  const wasIncomplete = useRef(false)
  const steps: { label: string; tab: ManageTab; isDone: boolean }[] = [
    {
      label: t('Добавьте услуги'),
      tab: 'services',
      isDone: catalog.services.some((service) => service.isActive !== false),
    },
    {
      label: t('Добавьте мастеров'),
      tab: 'masters',
      isDone: catalog.specialists.some(
        (master) => master.isActive !== false && master.serviceIds.length > 0,
      ),
    },
    { label: t('Проверьте график'), tab: 'hours', isDone: business.hours.length > 0 },
  ]
  const doneCount = steps.filter((step) => step.isDone).length
  const next = steps.find((step) => !step.isDone)
  const isComplete = !next

  // The last step done: say plainly that booking is open and hand over the link to share —
  // a first-time owner otherwise does not know what to do with the page now.
  useEffect(() => {
    if (!isComplete) {
      wasIncomplete.current = true
      return
    }
    if (!wasIncomplete.current) return
    wasIncomplete.current = false
    const url = `${window.location.origin}/${business.slug}`
    toast.show({
      title: t('Запись открыта'),
      description: t('Отправьте клиентам ссылку на вашу страницу'),
      type: 'success',
      timeout: 12_000,
      action: {
        label: t('Скопировать ссылку'),
        onClick: () => void navigator.clipboard?.writeText(url).catch(() => undefined),
      },
    })
  }, [isComplete, business.slug, toast, t])

  if (!next) return null

  // Like a Settings group on the page: an uppercase caption with «2 из 3» on its right, then one
  // row that is the next step itself, whole a link ending in ›. A title3 heading with a sentence
  // and a link wrapping under it fought the day's own title on phones («очень плохо»).
  return (
    <section className={styles.setup} aria-labelledby='setup-title'>
      <SectionCaption as='h2' id='setup-title' isInset={false} className={styles.caption}>
        {t('Запуск записи')}
        <span className={styles.count}>
          {t('{done} из {total}', { done: doneCount, total: steps.length })}
        </span>
      </SectionCaption>
      <NextLink
        href={`/manage/${business.slug}?tab=${next.tab}`}
        scroll={false}
        className={styles.row}
      >
        <span className={styles.body}>
          <span className={styles.title}>{next.label}</span>
          <span className={styles.note}>
            {t('Ещё {count}, и клиенты смогут записываться', {
              count: steps.length - doneCount,
            })}
          </span>
        </span>
        <CaretRight weight='bold' className={styles.chevron} aria-hidden />
      </NextLink>
    </section>
  )
}
