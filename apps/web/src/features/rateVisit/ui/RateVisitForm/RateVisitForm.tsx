'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { useId, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { createReview } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { Review, ReviewAccess } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import { StarRating } from '../StarRating/StarRating'
import styles from './RateVisitForm.module.css'

interface RateVisitFormProps {
  bookingId: string
  access: ReviewAccess
  specialistName: string
  onRated: (review: Review) => void
}

export const RateVisitForm = ({
  bookingId,
  access,
  specialistName,
  onRated,
}: RateVisitFormProps) => {
  const toast = useToast()
  const commentId = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    // The button stays active: a tap without stars explains what is missing instead.
    if (rating === 0) {
      setError('Поставьте оценку — от одной до пяти звёзд')
      return
    }
    setIsSending(true)
    try {
      const review = await createReview(bookingId, access, { rating, comment })
      haptic('success')
      toast.show({ title: 'Спасибо за отзыв', type: 'success' })
      void refreshBusiness(review.slug)
      onRated(review)
    } catch (submitError) {
      haptic('error')
      setError(getErrorMessage(submitError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.question}>Как вам у мастера {specialistName}?</p>
      <StarRating
        value={rating}
        onChange={(value) => {
          setRating(value)
          setError(null)
        }}
      />
      <label htmlFor={commentId} className={styles.label}>
        Расскажите подробнее <span className={styles.optional}>— по желанию</span>
      </label>
      <textarea
        id={commentId}
        className={styles.comment}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        rows={4}
        placeholder='Что понравилось, что можно лучше'
      />
      {error && (
        <p className={styles.error} role='alert'>
          {error}
        </p>
      )}
      <Button type='submit' size='lg' disabled={isSending} className={styles.submit}>
        {isSending ? 'Отправляем…' : 'Отправить отзыв'}
      </Button>
    </form>
  )
}
