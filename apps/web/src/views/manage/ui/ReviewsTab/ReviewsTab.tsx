'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { Star } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { getManagedReviews, replyToReview } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { ManagedReview, ReviewSummary } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralize } from '@/shared/lib/plural'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import styles from './ReviewsTab.module.css'

interface ReviewsTabProps {
  slug: string
  businessName: string
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const REPLY_FORM = 'review-reply'

// What clients said after their visits; a public reply is one tap away.
export const ReviewsTab = ({ slug, businessName }: ReviewsTabProps) => {
  const toast = useToast()
  const [data, setData] = useState<ReviewSummary<ManagedReview> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ManagedReview | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getManagedReviews(slug, controller.signal)
      .then(setData)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })

    return () => controller.abort()
  }, [slug])

  const openReply = (review: ManagedReview) => {
    setEditing(review)
    setText(review.reply ?? '')
  }

  const handleReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing || !data) return
    try {
      const saved = await replyToReview(slug, editing.id, text)
      setData({
        ...data,
        items: data.items.map((item) =>
          item.id === editing.id ? { ...item, reply: saved.reply } : item,
        ),
      })
      void refreshBusiness(slug)
      toast.show({ title: saved.reply ? 'Ответ опубликован' : 'Ответ удалён', type: 'success' })
      setEditing(null)
    } catch (replyError) {
      toast.show({
        title: 'Не получилось',
        description: getErrorMessage(replyError),
        type: 'error',
      })
    }
  }

  return (
    <section className={forms.section}>
      <SectionHeader
        title='Отзывы'
        description={
          data && data.count > 0
            ? `${data.average.toFixed(1)} из 5 · ${pluralize(data.count, ['отзыв', 'отзыва', 'отзывов'])}`
            : 'Через два часа после визита клиент получает SMS с просьбой оценить мастера.'
        }
      />
      {error && <p className={styles.error}>{error}</p>}
      {!data && !error && <Skeleton className={styles.skeleton} />}
      {data?.count === 0 && (
        <EmptyState
          title='Отзывов пока нет'
          text='Они появятся после первых визитов: клиенты оценивают мастера по ссылке из SMS или в «Моих записях».'
        />
      )}
      {data && data.count > 0 && (
        <ul className={forms.list}>
          {data.items.map((review) => (
            <li key={review.id} className={styles.review}>
              <div className={styles.head}>
                <span className={styles.stars} role='img' aria-label={`${review.rating} из 5`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      weight={value <= review.rating ? 'fill' : 'regular'}
                      aria-hidden
                    />
                  ))}
                </span>
                <span className={styles.date}>
                  {dateFormatter.format(new Date(review.createdAt))}
                </span>
              </div>
              <p className={styles.author}>
                {review.authorName}
                <a href={`tel:${review.customerPhone}`} className={styles.phone}>
                  {formatPhone(review.customerPhone)}
                </a>
              </p>
              <p className={styles.meta}>
                {review.serviceName} · мастер {review.specialistName}
              </p>
              {review.comment && <p className={styles.comment}>{review.comment}</p>}
              {review.reply ? (
                <button type='button' className={styles.reply} onClick={() => openReply(review)}>
                  <span className={styles.replyTitle}>Ваш ответ · изменить</span>
                  <span className={styles.comment}>{review.reply}</span>
                </button>
              ) : (
                <button
                  type='button'
                  className={styles.replyButton}
                  onClick={() => openReply(review)}
                >
                  Ответить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <Sheet
          title='Ответ на отзыв'
          onClose={() => setEditing(null)}
          action={{ label: 'Готово', form: REPLY_FORM }}
        >
          <form id={REPLY_FORM} className={styles.form} onSubmit={handleReply}>
            <p className={styles.quote}>
              {editing.authorName}: «{editing.comment || `${editing.rating} из 5`}»
            </p>
            <textarea
              aria-label='Ответ'
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder={`Спасибо, что выбрали ${businessName}!`}
            />
            <p className={styles.hint}>
              Ответ увидят все на странице бизнеса. Пустой ответ удаляет его.
            </p>
          </form>
        </Sheet>
      )}
    </section>
  )
}
