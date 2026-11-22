'use client'

import { useToast } from '@awaisa/ui/Toast'
import { type ChangeEvent, useRef, useState } from 'react'
import { getErrorMessage } from '@/shared/api/apiError'
import { haptic } from '@/shared/lib/nativeBridge'

interface UseVisitPhotoOptions {
  upload: (bookingId: string, file: File) => Promise<unknown>
  onDone?: (bookingId: string) => void
}

/**
 * The camera for a visit's work photo: one hidden input for the whole page, opened for any
 * visit (`pick`), also from a toast's action right after «Пришёл». The photo knows its visit,
 * so its service and master come from it and it books exactly that from «Образы».
 */
const useVisitPhoto = ({ upload, onDone }: UseVisitPhotoOptions) => {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const target = useRef<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const pick = (bookingId: string) => {
    target.current = bookingId
    input.current?.click()
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const bookingId = target.current
    event.target.value = ''
    if (!file || !bookingId) return
    setUploadingId(bookingId)
    try {
      await upload(bookingId, file)
      haptic('success')
      toast.show({ title: 'Фото в «Образах»', type: 'success' })
      onDone?.(bookingId)
    } catch (error) {
      toast.show({ title: 'Не загрузилось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setUploadingId(null)
    }
  }

  const field = (
    <input
      ref={input}
      type='file'
      accept='image/*'
      capture='environment'
      hidden
      aria-label='Фото работы'
      onChange={(event) => void handleFile(event)}
    />
  )

  return { pick, uploadingId, field }
}

export { useVisitPhoto }
