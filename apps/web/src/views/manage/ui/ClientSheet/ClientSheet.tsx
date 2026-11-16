'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircle, Phone, Star, WhatsappLogo } from '@phosphor-icons/react/ssr'
import { useEffect, useId, useState } from 'react'
import { formatDayLong, formatPrice } from '@/entities/booking'
import { PersonAvatar } from '@/entities/business'
import { getErrorMessage } from '@/shared/api/apiError'
import { getClient, updateClient } from '@/shared/api/clientApi'
import type { ClientCard } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { formatPhone } from '@/shared/lib/formatPhone'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { useCanSeeMoney } from '@/views/manage/model/useManageRole'
import { ClientLoyaltySection } from './ClientLoyaltySection'
import styles from './ClientSheet.module.css'

interface ClientSheetProps {
  slug: string
  phone: string
  onClose: () => void
  onSaved?: () => void
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const METHOD_LABELS: Record<string, string> = {
  cash: 'наличные',
  card: 'карта',
  transfer: 'перевод',
}

const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '—')

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
export const ClientSheet = ({ slug, phone, onClose, onSaved }: ClientSheetProps) => {
  const canSeeMoney = useCanSeeMoney()
  const toast = useToast()
  const noteId = useId()
  const birthdayId = useId()
  const [card, setCard] = useState<ClientCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [birthday, setBirthday] = useState('')

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

  return (
    <Sheet
      title='Клиент'
      onClose={onClose}
      cancelLabel={null}
      action={{ label: isDirty ? 'Сохранить' : 'Готово', onClick: handleDone }}
    >
      {error && <p className={styles.error}>{error}</p>}
      {!card && !error && <Skeleton className={styles.skeleton} />}
      {card && (
        <>
          <div className={styles.identity}>
            <PersonAvatar name={card.name || card.phone.slice(-2)} size='xl' />
            <p className={styles.name}>{card.name || 'Без имени'}</p>
            <p className={styles.phone}>{formatPhone(card.phone)}</p>
            {card.stats.noShows > 0 && (
              <p className={styles.warning}>
                Не пришёл {card.stats.noShows} {card.stats.noShows === 1 ? 'раз' : 'раза'}
              </p>
            )}
          </div>
          <div className={styles.contacts}>
            {contacts.map(({ href, label, icon: Icon, external }) => (
              <a
                key={label}
                href={href}
                className={styles.contact}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <Icon weight='fill' aria-hidden />
                {label}
              </a>
            ))}
          </div>

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Визиты</dt>
              <dd>{card.stats.visits}</dd>
            </div>
            {canSeeMoney && (
              <>
                <div className={styles.stat}>
                  <dt>Потратил</dt>
                  <dd>{formatPrice(card.stats.spent)}</dd>
                </div>
                <div className={styles.stat}>
                  <dt>Средний чек</dt>
                  <dd>{formatPrice(card.stats.averageCheck)}</dd>
                </div>
              </>
            )}
            <div className={styles.stat}>
              <dt>Неявки</dt>
              <dd>{card.stats.noShows}</dd>
            </div>
          </dl>

          <div className={sheet.list}>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Следующий визит</span>
              <span className={styles.value}>{formatDate(card.stats.nextVisit)}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Последний визит</span>
              <span className={styles.value}>{formatDate(card.stats.lastVisit)}</span>
            </div>
            <div className={sheet.row}>
              <span className={sheet.rowLabel}>Клиент с</span>
              <span className={styles.value}>{formatDate(card.stats.firstVisit)}</span>
            </div>
            {card.stats.favoriteService && (
              <div className={sheet.row}>
                <span className={sheet.rowLabel}>Чаще всего</span>
                <span className={styles.value}>
                  {card.stats.favoriteService}
                  {card.stats.favoriteMaster && ` · ${card.stats.favoriteMaster}`}
                </span>
              </div>
            )}
          </div>

          <ClientLoyaltySection slug={slug} phone={card.phone} />

          <section className={sheet.group} aria-label='Заметки'>
            <SectionCaption>Только для вас</SectionCaption>
            <div className={sheet.list}>
              <label className={sheet.row} htmlFor={birthdayId}>
                <span className={sheet.rowLabel}>День рождения</span>
                <input
                  id={birthdayId}
                  type='date'
                  className={styles.date}
                  value={birthday}
                  onChange={(event) => setBirthday(event.target.value)}
                />
              </label>
              <textarea
                id={noteId}
                aria-label='Заметка о клиенте'
                className={styles.note}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder='Аллергия, любимый мастер, как обращаться…'
              />
            </div>
          </section>

          <section className={sheet.group} aria-label='История'>
            <SectionCaption>История · {card.history.length}</SectionCaption>
            <ul className={`${sheet.list} ${styles.history}`}>
              {card.history.map((item) => {
                const status = visitStatus(item)
                return (
                  <li key={item.id} className={styles.visit}>
                    <span className={styles.visitText}>
                      <span className={styles.visitTitle}>{item.serviceName}</span>
                      <span className={styles.visitMeta}>
                        {formatDayLong(item.date)}, {item.time} · {item.specialistName}
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
          </section>
        </>
      )}
    </Sheet>
  )
}
