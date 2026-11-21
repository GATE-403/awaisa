'use client'

import { CaretRight } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { ROW_NOTES } from '../../config/copy'
import type { FeedScope } from '../../lib/feedLinks'
import { useCalendarFeed } from '../../model/useCalendarFeed'
import styles from './CalendarFeedGroup.module.css'
import { CalendarFeedSheet } from './CalendarFeedSheet'

interface CalendarFeedGroupProps {
  scope: FeedScope
  masters?: { id: string; name: string }[]
  canSetPhones?: boolean
  /** The host's list look, so the row lies on the page like the rows around it. */
  listClassName?: string
}

// «Календарь на телефоне ›» as a Settings row; the sheet does the rest.
export const CalendarFeedGroup = ({
  scope,
  masters,
  canSetPhones,
  listClassName,
}: CalendarFeedGroupProps) => {
  const state = useCalendarFeed(scope)
  const [isOpen, setIsOpen] = useState(false)

  if (state.error) return null

  return (
    <section className={sheet.group} aria-label='Календарь'>
      <SectionCaption>Календарь</SectionCaption>
      <div className={listClassName}>
        <button
          type='button'
          className={`${sheet.row} ${styles.row}`}
          disabled={!state.feed}
          onClick={() => setIsOpen(true)}
        >
          <span className={sheet.rowLabel}>Календарь на телефоне</span>
          <span className={styles.value}>
            {state.feed?.isActive && 'Подключён'}
            <CaretRight weight='bold' className={styles.chevron} aria-hidden />
          </span>
        </button>
      </div>
      <RowNote>{ROW_NOTES[scope.kind]}</RowNote>
      {isOpen && (
        <CalendarFeedSheet
          scope={scope}
          state={state}
          masters={masters}
          canSetPhones={canSetPhones}
          onClose={() => setIsOpen(false)}
        />
      )}
    </section>
  )
}
