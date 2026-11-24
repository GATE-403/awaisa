'use client'

import { useToast } from '@awaisa/ui/Toast'
import { CaretRight } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef } from 'react'
import type { Business, Catalog } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { copyText } from '@/shared/lib/share'
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
        onClick: () => void copyText(url),
      },
    })
  }, [isComplete, business.slug, toast, t])

  if (!next) return null

  // A card on a soft wash of the accent, the one place the cabinet lifts something off the page
  // («добавь фон градиент но чтобы сочетался, а то совсем незаметный»): the caption with
  // «2 из 3», a bar of three steps, then the next step and a small «Начать ›». The whole card is
  // one link to that step.
  return (
    <section className={styles.setup} aria-labelledby='setup-title'>
      <NextLink
        href={`/manage/${business.slug}?tab=${next.tab}`}
        scroll={false}
        className={styles.card}
      >
        <div className={styles.head}>
          <h2 id='setup-title' className={styles.caption}>
            {t('Запуск записи')}
          </h2>
          <span className={styles.count}>
            {t('{done} из {total}', { done: doneCount, total: steps.length })}
          </span>
        </div>
        <span className={styles.steps} aria-hidden='true'>
          {/* A progress bar fills from the left, whichever steps are done. */}
          {steps.map((step, index) => (
            <span
              key={step.tab}
              className={styles.step}
              data-done={index < doneCount || undefined}
            />
          ))}
        </span>
        <span className={styles.body}>
          <span className={styles.text}>
            <span className={styles.title}>{next.label}</span>
            <span className={styles.note}>
              {t('Ещё {count}, и клиенты смогут записываться', {
                count: steps.length - doneCount,
              })}
            </span>
          </span>
          <span className={styles.start}>
            {t('Начать')}
            <CaretRight aria-hidden />
          </span>
        </span>
      </NextLink>
    </section>
  )
}
