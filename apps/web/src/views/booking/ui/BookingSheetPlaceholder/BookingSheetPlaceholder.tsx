'use client'

import { X } from '@phosphor-icons/react/ssr'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useT } from '@/shared/i18n'
import { Container } from '@/shared/ui/Container/Container'
import { Block, Picture, TextLine } from '@/shared/ui/Placeholder/Placeholder'
import pageStyles from '../../BookingPage.module.css'
import stepStyles from '../BookingStep/BookingStep.module.css'
import summaryStyles from '../BookingSummary/BookingSummary.module.css'
import barStyles from '../BookingTopBar/BookingTopBar.module.css'
import masterStyles from '../MasterPicker/MasterPicker.module.css'
import pickerStyles from '../ServicePicker/ServicePicker.module.css'
import styles from './BookingSheetPlaceholder.module.css'

type OpenStep = 'service' | 'specialist' | 'datetime'

// What a link has already chosen decides where the form opens: a catalog card names the service
// (the form opens on the masters), «Снова» the master too (on the time).
const getOpenStep = (query: URLSearchParams): OpenStep => {
  if (!query.get('service')) return 'service'
  if (!query.get('specialist')) return 'specialist'
  return 'datetime'
}

const STEP_INDEX: Record<OpenStep, number> = { service: 0, specialist: 1, datetime: 2 }

// What the sheet holds while the form is on its way (the slot's Suspense fallback, inside
// `BookingSheet`, which stays): the form's own shapes from its own classes (the stack of done
// steps as ticket cards, its foot line («Начать заново», the offered service), the open step (the service pictures, the masters or the
// time) and the bar with the total and the action), so the form lands on what was already there.
// The open step follows the link: the service pictures swapped for the masters read as a flicker.
export const BookingSheetPlaceholder = () => {
  const router = useRouter()
  const t = useT()
  const step = getOpenStep(useSearchParams())
  const doneCount = STEP_INDEX[step]

  return (
    <div className={styles.placeholder} aria-busy='true'>
      <header className={barStyles.bar}>
        <span className={barStyles.grabber} aria-hidden />
        <div className={barStyles.inner}>
          <button
            type='button'
            className={barStyles.close}
            aria-label={t('Close booking')}
            onClick={() => router.back()}
          >
            <X aria-hidden />
          </button>
          <span className={barStyles.title}>
            <Block className={styles.tile} />
            <span className={barStyles.text}>
              <span className={barStyles.heading}>{t('Booking')}</span>
            </span>
          </span>
          <span className={barStyles.spacer} aria-hidden />
        </div>
      </header>

      <Container className={pageStyles.layout}>
        <div className={pageStyles.steps}>
          {doneCount > 0 && (
            <div className={styles.stack} style={{ '--count': doneCount } as CSSProperties}>
              {Array.from({ length: doneCount }, (_, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder cards that never reorder
                  key={index}
                  className={styles.ticket}
                  style={{ '--i': index, '--depth': doneCount - 1 - index } as CSSProperties}
                >
                  {index === doneCount - 1 && (
                    <>
                      <Block className={styles.ticketMedia} />
                      <span className={styles.ticketText}>
                        <TextLine chars={16} />
                        <TextLine chars={11} className={styles.ticketSecondary} />
                      </span>
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
          {doneCount > 0 && (
            // The stack's foot line: «Начать заново» on the left, the offered service on the right.
            <div className={styles.foot}>
              <span className={styles.footLine}>
                <TextLine chars={14} />
              </span>
              <span className={styles.footLine}>
                <TextLine chars={18} />
              </span>
            </div>
          )}

          <div className={stepStyles.step}>
            <p className={stepStyles.eyebrow}>
              <TextLine chars={10} />
            </p>
            {/* Not a heading: an empty one would be read out (and flagged by axe). */}
            <p className={stepStyles.title}>
              <TextLine chars={16} />
            </p>
            <div className={stepStyles.body}>
              {step === 'service' && (
                <div className={pickerStyles.picker}>
                  <div className={styles.chips}>
                    <Block className={styles.chip} />
                    <Block className={styles.chip} />
                    <Block className={styles.chip} />
                  </div>
                  <div className={pickerStyles.grid}>
                    <Picture className={styles.picture} />
                    <Picture className={styles.picture} />
                    <Picture className={styles.picture} />
                    <Picture className={styles.picture} />
                  </div>
                </div>
              )}
              {step === 'specialist' && (
                <div className={masterStyles.row}>
                  <Picture className={styles.picture} />
                  <Picture className={styles.picture} />
                  <Picture className={styles.picture} />
                </div>
              )}
              {step === 'datetime' && (
                <div className={styles.ruler}>
                  <span className={styles.rulerTime}>
                    <TextLine chars={5} />
                  </span>
                  <Block className={styles.rulerDial} />
                  <div className={styles.chips}>
                    <Block className={styles.day} />
                    <Block className={styles.day} />
                    <Block className={styles.day} />
                    <Block className={styles.day} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      <div className={pageStyles.bar}>
        <div className={summaryStyles.bar}>
          <span className={summaryStyles.barInfo}>
            <span className={summaryStyles.barPrice}>
              <TextLine chars={8} />
            </span>
            <span className={summaryStyles.barHint}>
              <TextLine chars={10} />
            </span>
          </span>
          <Block className={styles.action} />
        </div>
      </div>
    </div>
  )
}
