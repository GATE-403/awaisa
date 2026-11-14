'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { Camera, X } from '@phosphor-icons/react/ssr'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { addReviewPhoto, createReview } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { Review, ReviewAccess } from '@/shared/api/types'
import { haptic } from '@/shared/lib/nativeBridge'
import { StarRating } from '../StarRating/StarRating'
import styles from './RateVisitForm.module.css'

const MAX_PHOTOS = 3

type Picked = { file: File; preview: string }

interface RateVisitFormProps {
  bookingId: string
  access: ReviewAccess
  specialistName: string
  /** The stars already tapped outside the sheet («Как прошло?»). */
  initialRating?: number
  /** The booking link for this service (no master): the thank-you toast offers it again. */
  rebookHref?: string
  /** With a good rating the toast books the same master again. */
  specialistId?: string
  onRated: (review: Review) => void
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const RateVisitForm = ({
  bookingId,
  access,
  specialistName,
  initialRating = 0,
  rebookHref,
  specialistId,
  onRated,
}: RateVisitFormProps) => {
  const router = useRouter()
  const toast = useToast()
  const commentId = useId()
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [photos, setPhotos] = useState<Picked[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const previews = useRef<string[]>([])

  useEffect(() => {
    previews.current = photos.map((photo) => photo.preview)
  }, [photos])

  useEffect(
    () => () => {
      for (const url of previews.current) URL.revokeObjectURL(url)
    },
    [],
  )

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    event.target.value = ''
    setPhotos((current) =>
      [...current, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(
        0,
        MAX_PHOTOS,
      ),
    )
  }

  const handleRemovePhoto = (preview: string) => {
    URL.revokeObjectURL(preview)
    setPhotos((current) => current.filter((photo) => photo.preview !== preview))
  }

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
      // The review is saved already; a picture that fails to upload does not undo it.
      let uploaded: string[] = []
      for (const photo of photos) {
        try {
          uploaded = (await addReviewPhoto(bookingId, access, photo.file)).photos
        } catch (photoError) {
          toast.show({
            title: 'Фото не загрузилось',
            description: getErrorMessage(photoError),
            type: 'error',
          })
          break
        }
      }
      haptic('success')
      // The shortest way back: liked the master → the same master; didn't → the same service.
      const isLiked = rating >= 4 && Boolean(specialistId)
      const href = rebookHref && (isLiked ? `${rebookHref}&specialist=${specialistId}` : rebookHref)
      toast.show({
        title: 'Спасибо за отзыв',
        type: 'success',
        action: href
          ? {
              label: isLiked ? `Снова к ${firstName(specialistName)}` : 'Другой мастер',
              onClick: () => router.push(href),
            }
          : undefined,
      })
      void refreshBusiness(review.slug)
      onRated({ ...review, photos: uploaded })
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
      <div className={styles.photos}>
        {photos.map((photo, index) => (
          <span key={photo.preview} className={styles.thumb}>
            {/* biome-ignore lint/performance/noImgElement: a local preview (blob: URL) */}
            <img src={photo.preview} alt={`Фото ${index + 1}`} />
            <button
              type='button'
              className={styles.removePhoto}
              aria-label={`Убрать фото ${index + 1}`}
              onClick={() => handleRemovePhoto(photo.preview)}
            >
              <X weight='bold' aria-hidden />
            </button>
          </span>
        ))}
        {photos.length < MAX_PHOTOS && (
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className={styles.addPhoto}
            onClick={() => fileInput.current?.click()}
          >
            <Camera aria-hidden />
            {photos.length === 0 ? 'Добавить фото' : 'Ещё фото'}
          </Button>
        )}
        <input
          ref={fileInput}
          type='file'
          accept='image/*'
          multiple
          hidden
          onChange={handlePick}
          aria-label='Фото к отзыву'
        />
      </div>
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
