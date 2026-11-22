'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Check } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useEffect, useRef } from 'react'
import type { Business, Catalog } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
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

  return (
    // A checklist, not just a bar: what is done, and the one step to do now.
    <section className={styles.card} aria-labelledby='setup-title'>
      <div className={styles.top}>
        <div>
          <h2 id='setup-title' className={styles.title}>
            {t('Запуск записи')}
          </h2>
          <p className={styles.subtitle}>
            {t('Ещё {count}, и клиенты смогут записываться', {
              count: steps.length - doneCount,
            })}
          </p>
        </div>
        <span
          className={styles.count}
          role='img'
          aria-label={t('Готово {done} из {total}', { done: doneCount, total: steps.length })}
        >
          <svg viewBox='0 0 36 36' className={styles.ring} aria-hidden='true'>
            <circle cx='18' cy='18' r='15' className={styles.ringTrack} />
            <circle
              cx='18'
              cy='18'
              r='15'
              className={styles.ringValue}
              pathLength={steps.length}
              strokeDasharray={`${doneCount} ${steps.length}`}
            />
          </svg>
          <span className={styles.countText}>
            {doneCount}/{steps.length}
          </span>
        </span>
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const state = step.isDone ? 'done' : step === next ? 'next' : 'todo'
          return (
            <li key={step.tab}>
              <NextLink
                href={`/manage/${business.slug}?tab=${step.tab}`}
                scroll={false}
                className={styles.step}
                data-state={state}
                aria-current={state === 'next' ? 'step' : undefined}
              >
                <span className={styles.mark} aria-hidden>
                  {step.isDone ? <Check weight='bold' /> : index + 1}
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
                {state === 'next' && <span className={styles.go}>{t('Начать ›')}</span>}
              </NextLink>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
