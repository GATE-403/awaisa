'use client'

import { useToast } from '@awaisa/ui/Toast'
import { ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretRight } from '@phosphor-icons/react/ssr'
import { useEffect, useRef } from 'react'
import type { Business, Catalog } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { copyText } from '@/shared/lib/share'
import type { ManageTab } from '@/views/manage/manageTabs'
import styles from './SetupProgress.module.css'

interface SetupProgressProps {
  business: Business
  catalog: Catalog
}

export const SetupProgress = ({ business, catalog }: SetupProgressProps) => {
  const toast = useToast()
  const { t } = useLingui()
  const wasIncomplete = useRef(false)
  const steps: { label: string; tab: ManageTab; isDone: boolean }[] = [
    {
      label: t`Add services`,
      tab: 'services',
      isDone: catalog.services.some((service) => service.isActive !== false),
    },
    {
      label: t`Add specialists`,
      tab: 'masters',
      isDone: catalog.specialists.some(
        (master) => master.isActive !== false && master.serviceIds.length > 0,
      ),
    },
    { label: t`Check the opening hours`, tab: 'hours', isDone: business.hours.length > 0 },
  ]
  const doneCount = steps.filter((step) => step.isDone).length
  const next = steps.find((step) => !step.isDone)
  const isComplete = !next

  // The last step done: say plainly that booking is open and hand over the link to share -
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
      title: t`Booking is open`,
      description: t`Send clients the link to your page`,
      type: 'success',
      timeout: 12_000,
      action: {
        label: t`Copy link`,
        onClick: () => void copyText(url),
      },
    })
  }, [isComplete, business.slug, toast, t])

  if (!next) return null

  // A card on a soft wash of the accent, the one place the cabinet lifts something off the page
  // ("add a gradient background that matches, it's barely visible"): the caption with
  // "2 of 3", a bar of three steps, then the next step and a small "Start ›". The whole card is
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
            {t`Opening for bookings`}
          </h2>
          <span className={styles.count}>
            {t`${ph({ done: doneCount })} of ${ph({ total: steps.length })}`}
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
              {t`${ph({ count: steps.length - doneCount })} more, and clients can book`}
            </span>
          </span>
          <span className={styles.start}>
            {t`Get started`}
            <CaretRight aria-hidden />
          </span>
        </span>
      </NextLink>
    </section>
  )
}
