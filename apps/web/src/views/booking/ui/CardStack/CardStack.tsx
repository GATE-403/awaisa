'use client'

import { type CSSProperties, type ReactNode, useState } from 'react'
import { useT } from '@/shared/i18n'
import styles from './CardStack.module.css'

interface StackCardProps {
  /** The step's id: the card keeps the step's `#step-<id>` so links and tests find it. */
  id: string
  /** The step's name, for screen readers (the card shows what was chosen). */
  title: string
  media: ReactNode
  primary: string
  secondary?: string
  trailing?: string
  /** The card's colour: dark for the service, the master's own, the accent for the time. */
  tone: string
}

interface CardStackProps {
  cards: StackCardProps[]
  onEdit: (id: string) => void
}

// Done steps become cards — torn-off parts of the ticket the booking turns into — and slide into a
// stack above the open question, the newest in front. One tap fans the stack out so each card can
// be changed; a single card is changed straight away.
export const CardStack = ({ cards, onEdit }: CardStackProps) => {
  const t = useT()
  const [isFanned, setIsFanned] = useState(false)
  const count = cards.length
  const isOpen = isFanned || count === 1

  if (count === 0) return null

  return (
    <div
      className={styles.stack}
      data-fanned={isOpen || undefined}
      style={{ '--count': count } as CSSProperties}
    >
      {cards.map((card, index) => (
        <section
          key={card.id}
          id={`step-${card.id}`}
          aria-labelledby={`step-${card.id}-title`}
          className={styles.card}
          style={
            { '--i': index, '--depth': count - 1 - index, '--tone': card.tone } as CSSProperties
          }
        >
          <h2 id={`step-${card.id}-title`} className={styles.srOnly}>
            {card.title}
          </h2>
          <span className={styles.media}>{card.media}</span>
          <span className={styles.text}>
            <span className={styles.primary}>{card.primary}</span>
            {card.secondary && <span className={styles.secondary}>{card.secondary}</span>}
          </span>
          {card.trailing && <span className={styles.trailing}>{card.trailing}</span>}
          <button
            type='button'
            className={styles.edit}
            tabIndex={isOpen ? undefined : -1}
            onClick={() => {
              setIsFanned(false)
              onEdit(card.id)
            }}
          >
            {t('Изменить')}
          </button>
        </section>
      ))}
      {!isOpen && (
        <button
          type='button'
          className={styles.reveal}
          aria-expanded={false}
          onClick={() => setIsFanned(true)}
        >
          <span className={styles.srOnly}>{t('Показать выбор')}</span>
        </button>
      )}
      {isFanned && count > 1 && (
        <button type='button' className={styles.fold} onClick={() => setIsFanned(false)}>
          {t('Свернуть')}
        </button>
      )}
    </div>
  )
}

export type { StackCardProps }
