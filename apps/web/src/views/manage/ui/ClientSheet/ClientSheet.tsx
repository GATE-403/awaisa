'use client'

import { Button } from '@awaisa/ui/Button'
import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircle, Phone, Star, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { type CSSProperties, useEffect, useId, useState } from 'react'
import { formatPrice, getDateParts } from '@/entities/booking'
import { PersonAvatar, pickTint } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClient, updateClient } from '@/shared/api/clientApi'
import type { ClientCard } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { MoreFade } from '@/shared/ui/MoreFade/MoreFade'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { BirthdayField } from './BirthdayField'
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

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
const sinceFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const METHOD_LABELS: Record<string, string> = {
  cash: 'наличные',
  card: 'карта',
  transfer: 'перевод',
}

// «с ноября 2026»: the month in the genitive, as people say it.
const formatSince = (iso: string) =>
  sinceFormatter
    .format(new Date(iso))
    .replace(/^(\S+)/, (month) => month.replace(/ь$|й$/, 'я').replace(/т$/, 'та'))
    .replace(/\s?г\.$/, '')

const FIRST_VISITS = 4

const visitStatus = (item: ClientCard['history'][number]) => {
  if (item.status === 'cancelled') return { label: 'Отменена', tone: 'muted' }
  if (item.outcome === 'no_show') return { label: 'Не пришёл', tone: 'danger' }
  if (item.outcome === 'arrived') {
    const paid = item.paidAmount ?? item.price
    return {
      label: `${formatPrice(paid)}${item.paymentMethod ? `, ${METHOD_LABELS[item.paymentMethod]}` : ''}`,
      tone: 'ok',
    }
  }

  return { label: formatPrice(item.price), tone: 'plain' }
}

// Everything the business knows about one client: what they come for, how reliable they are,
// private notes. Contacts are one tap away.
export const ClientSheet = ({ slug, phone, onClose, onSaved, onBook }: ClientSheetProps) => {
  const canSeeMoney = useCanSeeMoney()
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
      toast.show({ title: 'Карточка сохранена', type: 'success' })
      onSaved?.()
      onClose()
    } catch (saveError) {
      toast.show({ title: 'Не получилось', description: getErrorMessage(saveError), type: 'error' })
    }
  }

  const digits = phone.replace(/\D/g, '')
  const contacts = [
    { href: `tel:${phone}`, label: 'Позвонить', icon: Phone },
    { href: `https://wa.me/${digits}`, label: 'WhatsApp', icon: WhatsappLogo, external: true },
    { href: `sms:${phone}`, label: 'SMS', icon: ChatCircle },
  ]
  const name = card?.name || 'Без имени'
  const stats = card?.stats
  const history = card?.history ?? []
  const shownHistory = isAllHistory ? history : history.slice(0, FIRST_VISITS)

  return (
    <Sheet
      title='Клиент'
      onClose={onClose}
      cancelLabel={null}
      action={{ label: isDirty ? 'Сохранить' : 'Готово', onClick: handleDone }}
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
            <p className={styles.phone}>{formatPhone(card.phone)}</p>
            {stats.visits > 0 && (
              <p className={styles.facts}>
                <strong>{stats.visits}</strong>{' '}
                {pluralWord(stats.visits, ['визит', 'визита', 'визитов'])}
                {canSeeMoney && stats.spent > 0 && (
                  <>
                    {' · '}
                    <strong>{formatPrice(stats.spent)}</strong>
                  </>
                )}
                {stats.firstVisit && ` · с ${formatSince(stats.firstVisit)}`}
              </p>
            )}
            {stats.favoriteService && (
              <p className={styles.usual}>
                Обычно: {stats.favoriteService}
                {stats.favoriteMaster && ` · ${stats.favoriteMaster}`}
              </p>
            )}
            {stats.nextVisit && (
              <p className={styles.next}>
                Следующий визит {dayFormatter.format(new Date(stats.nextVisit))}
              </p>
            )}
            {stats.noShows > 0 && (
              <p className={styles.warning}>
                Не пришёл {pluralize(stats.noShows, ['раз', 'раза', 'раз'])}
              </p>
            )}
            <div className={styles.actions}>
              <ul className={styles.contacts}>
                {contacts.map(({ href, label, icon: Icon, external }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className={styles.contact}
                      aria-label={label}
                      title={label}
                      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    >
                      <Icon weight='fill' aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              {onBook && (
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
                  Записать снова
                </Button>
              )}
            </div>
          </header>

          <section className={sheet.group} aria-label='Только для вас'>
            <SectionCaption>Только для вас</SectionCaption>
            <div className={sheet.list}>
              <BirthdayField value={birthday} onChange={setBirthday} />
              <textarea
                id={noteId}
                aria-label='Заметка о клиенте'
                className={styles.note}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder='Заметка: аллергия, любимый мастер, как обращаться'
              />
            </div>
          </section>

          <ClientLoyaltySection slug={slug} phone={card.phone} />

          {history.length > 0 && (
            <section className={sheet.group} aria-label='История'>
              <SectionCaption>
                История <span className={styles.count}>{history.length}</span>
              </SectionCaption>
              <MoreFade
                hiddenCount={Math.max(0, history.length - FIRST_VISITS)}
                isOpen={isAllHistory}
                onToggle={() => setIsAllHistory((value) => !value)}
                label={pluralWord(history.length - FIRST_VISITS, ['визит', 'визита', 'визитов'])}
                surface='sheet'
                isLessFloating={false}
              >
                <ul className={`${sheet.list} ${styles.history}`}>
                  {shownHistory.map((item) => {
                    const status = visitStatus(item)
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
