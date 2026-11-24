'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { Star } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useEffect, useId, useState } from 'react'
import { formatPrice, getDateParts } from '@/entities/booking'
import { PersonAvatar, pickTint } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClient, updateClient } from '@/shared/api/clientApi'
import type { ClientCard } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { ContactRows } from '@/shared/ui/ContactRows/ContactRows'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { useHasFeature } from '@/views/manage/model/usePlanAccess'
import { BirthdayField, formatMomentDay, formatMonthYear, getBishkekDate } from './BirthdayField'
import { ClientLoyaltySection } from './ClientLoyaltySection'
import styles from './ClientSheet.module.css'

interface ClientSheetProps {
  slug: string
  phone: string
  onClose: () => void
  onSaved?: () => void
  /** Book this client again (the schedule passes it): their usual service, name and number. */
  onBook?: (client: { name: string; phone: string; serviceName: string | null }) => void
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'cash',
  card: 'card',
  transfer: 'transfer',
}

const sinceLabel = (iso: string, t: Translate) => {
  const { month, year } = getBishkekDate(iso)
  return formatMonthYear(month, year, t)
}

const FIRST_VISITS = 4
const VISIT_WORDS: [string, string] = ['visit', 'visits']
// «Не пришёл 2 раза»: the «many» form keys the counted word.
const TIMES_WORDS: [string, string] = ['time', 'times']

const visitStatus = (item: ClientCard['history'][number], t: Translate) => {
  if (item.status === 'cancelled') return { label: t('Cancelled'), tone: 'muted' }
  if (item.outcome === 'no_show') return { label: t('No-show'), tone: 'danger' }
  if (item.outcome === 'arrived') {
    const paid = item.paidAmount ?? item.price
    return {
      label: `${formatPrice(paid)}${item.paymentMethod ? `, ${t(METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod)}` : ''}`,
      tone: 'ok',
    }
  }

  return { label: formatPrice(item.price), tone: 'plain' }
}

// Everything the business knows about one client: what they come for, how reliable they are,
// private notes. Contacts are one tap away.
export const ClientSheet = ({ slug, phone, onClose, onSaved, onBook }: ClientSheetProps) => {
  const t = useT()
  const hasLoyalty = useHasFeature('loyalty')
  const toast = useToast()
  const noteId = useId()
  const [card, setCard] = useState<ClientCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [birthday, setBirthday] = useState('')
  const [isAllHistory, setIsAllHistory] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getClient(slug, phone, controller.signal)
      .then((loaded) => {
        setCard(loaded)
        setNote(loaded.note)
        setBirthday(loaded.birthday ?? '')
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })

    return () => controller.abort()
  }, [slug, phone])

  const isDirty = card !== null && (note !== card.note || birthday !== (card.birthday ?? ''))

  const handleDone = async () => {
    if (!card || !isDirty) {
      onClose()
      return
    }
    try {
      await updateClient(slug, card.phone, { note, birthday: birthday || null })
      toast.show({ title: t('Card saved'), type: 'success' })
      onSaved?.()
      onClose()
    } catch (saveError) {
      toast.show({
        title: t('Something went wrong'),
        description: getErrorMessage(saveError),
        type: 'error',
      })
    }
  }

  const name = card?.name || t('No name')
  const stats = card?.stats
  const history = card?.history ?? []
  const shownHistory = isAllHistory ? history : history.slice(0, FIRST_VISITS)

  return (
    <Sheet
      title={t('Client')}
      onClose={onClose}
      cancelLabel={null}
      action={{ label: isDirty ? t('Save') : t('Done'), onClick: handleDone }}
    >
      {error && <p className={styles.error}>{error}</p>}
      {!card && !error && <Skeleton className={styles.skeleton} />}
      {card && stats && (
        <>
          {/* The quiet profile head: a wash of the person's colour, the face, one line of facts. */}
          <header
            className={styles.head}
            style={{ '--client-tint': pickTint(card.name || card.phone) } as CSSProperties}
          >
            <PersonAvatar name={card.name || card.phone.slice(-2)} size='lg' />
            <h3 className={styles.name}>{name}</h3>
            {stats.visits > 0 && (
              <p className={styles.facts}>
                <strong>{stats.visits}</strong>{' '}
                {t.count(stats.visits, VISIT_WORDS).replace(/^\d+ /, '')}
                {stats.spent ? (
                  <>
                    {' · '}
                    <strong>{formatPrice(stats.spent)}</strong>
                  </>
                ) : null}
                {stats.firstVisit &&
                  ` · ${t('since {date}', { date: sinceLabel(stats.firstVisit, t) })}`}
              </p>
            )}
            {stats.favoriteService && (
              <p className={styles.usual}>
                {t('Usually: {service}', { service: stats.favoriteService })}
                {stats.favoriteMaster && ` · ${stats.favoriteMaster}`}
              </p>
            )}
            {stats.nextVisit && (
              <p className={styles.next}>
                {t('Next visit {date}', {
                  date: formatMomentDay(stats.nextVisit, t),
                })}
              </p>
            )}
            {stats.noShows > 0 && (
              <p className={styles.warning}>
                {t('No-show {times}', { times: t.count(stats.noShows, TIMES_WORDS) })}
              </p>
            )}
            {onBook && (
              <div className={styles.actions}>
                <Button
                  size='sm'
                  onClick={() =>
                    onBook({
                      name: card.name,
                      phone: card.phone,
                      serviceName: stats.favoriteService,
                    })
                  }
                >
                  {t('Book again')}
                </Button>
              </div>
            )}
          </header>

          <ContactRows phone={card.phone} />

          <section className={sheet.group} aria-label={t('Only for you')}>
            <SectionCaption>{t('Only for you')}</SectionCaption>
            <div className={sheet.list}>
              <BirthdayField value={birthday} onChange={setBirthday} />
              <textarea
                id={noteId}
                aria-label={t('Note about the client')}
                className={styles.note}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder={t('Note: allergies, favourite specialist, how to address them')}
              />
            </div>
          </section>

          {hasLoyalty && <ClientLoyaltySection slug={slug} phone={card.phone} />}

          {history.length > 0 && (
            <section className={sheet.group} aria-label={t('History')}>
              <SectionCaption>
                {t('History')} <span className={styles.count}>{history.length}</span>
              </SectionCaption>
              <MoreFade
                hiddenCount={Math.max(0, history.length - FIRST_VISITS)}
                isOpen={isAllHistory}
                onToggle={() => setIsAllHistory((value) => !value)}
                label={t.count(history.length - FIRST_VISITS, VISIT_WORDS).replace(/^\d+ /, '')}
                surface='sheet'
                isLessFloating={false}
              >
                <ul className={`${sheet.list} ${styles.history}`}>
                  {shownHistory.map((item) => {
                    const status = visitStatus(item, t)
                    const { day, month } = getDateParts(item.date)
                    return (
                      <li key={item.id} className={styles.visit}>
                        <span className={styles.leaf} aria-hidden='true'>
                          <span className={styles.leafMonth}>{month}</span>
                          <span className={styles.leafDay}>{day}</span>
                        </span>
                        <span className={styles.visitText}>
                          <span className={styles.visitTitle}>{item.serviceName}</span>
                          <span className={styles.visitMeta}>
                            <span className={styles.srOnly}>
                              {day} {month},{' '}
                            </span>
                            {item.time} · {item.specialistName}
                          </span>
                          {item.rating !== null && (
                            <span className={styles.visitRating}>
                              <Star weight='fill' aria-hidden />
                              {item.rating}
                              {item.reviewComment && ` · «${item.reviewComment}»`}
                            </span>
                          )}
                        </span>
                        <span className={styles.visitStatus} data-tone={status.tone}>
                          {status.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </MoreFade>
            </section>
          )}
        </>
      )}
    </Sheet>
  )
}
