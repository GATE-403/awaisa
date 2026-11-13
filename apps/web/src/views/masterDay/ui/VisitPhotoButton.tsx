'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Camera, Check } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { addVisitPhoto } from '@/shared/api/clientApi'
import { haptic } from '@/shared/lib/nativeBridge'
import styles from '../MasterDayPage.module.css'

interface VisitPhotoButtonProps {
  slug: string
  bookingId: string
}

// Right after the visit the master snaps the result; the photo knows its service and master,
// so it books exactly that from the «Работы» feed.
export const VisitPhotoButton = ({ slug, bookingId }: VisitPhotoButtonProps) => {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'done'>('idle')

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setState('uploading')
    try {
      await addVisitPhoto(slug, bookingId, file)
      setState('done')
      haptic('success')
      toast.show({ title: 'Фото в ленте «Работы»', type: 'success' })
    } catch (error) {
      setState('idle')
      toast.show({ title: 'Не загрузилось', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <>
      <button
        type='button'
        className={styles.photoButton}
        onClick={() => input.current?.click()}
        disabled={state === 'uploading'}
      >
        {state === 'done' ? (
          <Check weight='bold' aria-hidden />
        ) : (
          <Camera weight='bold' aria-hidden />
        )}
        {state === 'uploading'
          ? 'Загружаем…'
          : state === 'done'
            ? 'Ещё фото работы'
            : 'Фото работы'}
      </button>
      <input
        ref={input}
        type='file'
        accept='image/*'
        capture='environment'
        hidden
        aria-label={`Фото работы ${bookingId}`}
        onChange={(event) => void handleFile(event)}
      />
    </>
  )
}
