'use client'

import { Skeleton } from '@awaisa/ui/Skeleton'
import { useToast } from '@awaisa/ui/Toast'
import { PencilSimple } from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { ReviewItem } from '@/entities/review'
import { getErrorMessage } from '@/shared/api/apiError'
import { getManagedQuestions, getManagedReviews, replyToReview } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { BusinessQuestion, ManagedReview, ReviewSummary } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralize } from '@/shared/lib/plural'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { EmptyState } from '@/views/manage/ui/EmptyState/EmptyState'
import forms from '@/views/manage/ui/manageForms.module.css'
import { SectionHeader } from '@/views/manage/ui/SectionHeader/SectionHeader'
import { QuestionsPanel } from './QuestionsPanel'
import styles from './ReviewsTab.module.css'

interface ReviewsTabProps {
  slug: string
  businessName: string
}

const _dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const REPLY_FORM = 'review-reply'

// What clients said after their visits; a public reply is one tap away.
export const ReviewsTab = ({ slug, businessName }: ReviewsTabProps) => {
  const toast = useToast()
  const [data, setData] = useState<ReviewSummary<ManagedReview> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ManagedReview | null>(null)
  const [text, setText] = useState('')
  const [view, setView] = useState<'reviews' | 'questions'>('reviews')
  const [questions, setQuestions] = useState<BusinessQuestion[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getManagedReviews(slug, controller.signal)
      .then(setData)
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(getErrorMessage(loadError))
      })
    getManagedQuestions(slug, controller.signal)
      .then(setQuestions)
      .catch(() => {
        if (!controller.signal.aborted) setQuestions([])
      })

    return () => controller.abort()
  }, [slug])

  const openQuestions = questions?.filter((question) => !question.answer).length ?? 0

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
      <TextTabs
        label='Отзывы и вопросы'
        items={[
          {
            label: 'Отзывы',
            count: data?.count,
            isActive: view === 'reviews',
            onSelect: () => setView('reviews'),
          },
          {
            label: 'Вопросы',
            count: openQuestions > 0 ? `${openQuestions} без ответа` : questions?.length,
            isActive: view === 'questions',
            onSelect: () => setView('questions'),
          },
        ]}
      />
      {view === 'questions' && (
        <QuestionsPanel slug={slug} questions={questions} onChange={setQuestions} />
      )}
      {view === 'reviews' && error && <p className={styles.error}>{error}</p>}
      {view === 'reviews' && !data && !error && <Skeleton className={styles.skeleton} />}
      {view === 'reviews' && data?.count === 0 && (
        <EmptyState
          title='Отзывов пока нет'
          text='Они появятся после первых визитов: клиенты оценивают мастера по ссылке из SMS или в «Моих записях».'
        />
      )}
      {view === 'reviews' && data && data.count > 0 && (
        // The same thread as on the business page, with the phone and visit under the name and
        // the reply action in the thread.
        <ul className={styles.thread}>
          {data.items.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              businessName={businessName}
              meta={
                <>
                  <a href={`tel:${review.customerPhone}`} className={styles.phone}>
                    {formatPhone(review.customerPhone)}
                  </a>
                  {' · '}
                  {review.serviceName} · мастер {review.specialistName}
                </>
              }
              replyAction={
                <button
                  type='button'
                  className={review.reply ? styles.replyEdit : styles.replyButton}
                  onClick={() => openReply(review)}
                >
                  {review.reply ? (
                    <>
                      <PencilSimple weight='bold' aria-hidden />
                      Изменить
                    </>
                  ) : (
                    'Ответить'
                  )}
                </button>
              }
            />
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
