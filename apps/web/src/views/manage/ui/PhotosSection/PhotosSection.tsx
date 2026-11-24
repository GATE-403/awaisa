'use client'

import { EyeSlash } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, type DragEvent, useEffect, useState } from 'react'
import {
  addPhoto,
  getWorkPhotos,
  removePhoto,
  reorderWorkPhotos,
  updateWorkPhoto,
} from '@/shared/api/clientApi'
import type { Catalog, WorkPhoto } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PhotoGrid, PhotoGridTile } from '@/shared/ui/PhotoGrid/PhotoGrid'
import styles from './PhotosSection.module.css'
import { WorkPhotoSheet } from './WorkPhotoSheet'

interface PhotosSectionProps {
  slug: string
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
  /** Every change of the list: the page counts the photos and pictures its services with them. */
  onPhotosChange?: (photos: WorkPhoto[]) => void
  /** The file input's id: the page's own "Add" opens it. */
  inputId: string
}

const MAX_PHOTOS = 30

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

const moveTo = (ids: string[], id: string, index: number) => {
  const rest = ids.filter((item) => item !== id)
  rest.splice(index, 0, id)
  return rest
}

// "Work" like a profile's grid in Instagram: square photos three a row, nearly touching; the page
// adds to it from its own "Add". Several photos go up at once and are tagged one after another
// ("Photo 1 of 3"): each names its service and master, so the feed books exactly that. The first five
// lead the public page, so the order is the owner's: dragged with a mouse, "Put first" in a
// photo's sheet on a phone.
export const PhotosSection = ({
  slug,
  catalog,
  run,
  onPhotosChange,
  inputId,
}: PhotosSectionProps) => {
  const t = useT()
  const [isBusy, setIsBusy] = useState(false)
  const [photos, setPhotos] = useState<WorkPhoto[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  // Photos just uploaded, tagged in turn.
  const [queue, setQueue] = useState<string[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [order, setOrder] = useState<string[] | null>(null)
  const open = photos.find((photo) => photo.id === openId) ?? null
  const queueIndex = openId ? queue.indexOf(openId) : -1
  const shown = order
    ? order.flatMap((id) => photos.find((photo) => photo.id === id) ?? [])
    : photos

  useEffect(() => {
    const controller = new AbortController()
    getWorkPhotos(slug, controller.signal)
      .then(setPhotos)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    onPhotosChange?.(photos)
  }, [photos, onPhotosChange])

  const handlePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const room = MAX_PHOTOS - photos.length
    const files = Array.from(event.target.files ?? []).slice(0, room)
    event.target.value = ''
    if (files.length === 0) return
    setIsBusy(true)
    const known = new Set(photos.map((photo) => photo.id))
    const added: string[] = []
    await run(
      async () => {
        for (const file of files) {
          const next = await addPhoto(slug, file)
          for (const photo of next) {
            if (!known.has(photo.id)) {
              known.add(photo.id)
              added.push(photo.id)
            }
          }
          setPhotos(next)
        }
      },
      files.length > 1 ? t('Photos added: {count}', { count: files.length }) : t('Photo added'),
    )
    setIsBusy(false)
    // Right away: what is on each, like tagging photos after taking them.
    const [first] = added
    if (!first) return
    setQueue(added)
    setOpenId(first)
  }

  const closeSheet = () => {
    const next = queueIndex >= 0 ? queue[queueIndex + 1] : undefined
    if (next) {
      setOpenId(next)
      return
    }
    setQueue([])
    setOpenId(null)
  }

  const saveOrder = (ids: string[]) =>
    run(async () => setPhotos(await reorderWorkPhotos(slug, ids)), t('Order saved'))

  const handleDragOver = (event: DragEvent, overId: string) => {
    if (!draggedId || draggedId === overId) return
    event.preventDefault()
    const ids = order ?? photos.map((photo) => photo.id)
    setOrder(moveTo(ids, draggedId, ids.indexOf(overId)))
  }

  const handleDragEnd = async () => {
    const ids = order
    const isMoved = ids && ids.join() !== photos.map((photo) => photo.id).join()
    setDraggedId(null)
    if (isMoved) await saveOrder(ids)
    setOrder(null)
  }

  return (
    <section className={styles.group} aria-label={t('Work')}>
      <PhotoGrid isBusy={isBusy}>
        {shown.map((photo, index) => (
          <PhotoGridTile
            key={photo.id}
            src={photo.url}
            label={t(
              photo.isHidden ? 'Photo {index}: {service}, hidden' : 'Photo {index}: {service}',
              {
                index: index + 1,
                service: photo.serviceName ?? t('no service set'),
              },
            )}
            onOpen={() => setOpenId(photo.id)}
            isDimmed={photo.isHidden}
            data-dragged={draggedId === photo.id || undefined}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              setDraggedId(photo.id)
            }}
            onDragOver={(event) => handleDragOver(event, photo.id)}
            onDrop={(event) => event.preventDefault()}
            onDragEnd={() => void handleDragEnd()}
          >
            {photo.isHidden ? (
              <span className={styles.badge}>
                <EyeSlash aria-hidden />
              </span>
            ) : (
              !photo.serviceId && <span className={styles.badge}>?</span>
            )}
          </PhotoGridTile>
        ))}
      </PhotoGrid>
      {photos.length === 0 && (
        <EmptyState
          variant='inline'
          title={t('Show your work')}
          text={t('Clients book from photos: add up to 30, several at once if you like.')}
        />
      )}
      {photos.length > 1 && (
        <p className={styles.hint}>{t('The first five photos lead the page.')}</p>
      )}
      <input
        id={inputId}
        type='file'
        accept={ACCEPT}
        multiple
        hidden
        onChange={handlePhotos}
        aria-label={t('Photo file')}
      />
      {open && (
        <WorkPhotoSheet
          key={open.id}
          photo={open}
          services={catalog.services}
          specialists={catalog.specialists}
          step={queue.length > 1 ? { index: queueIndex + 1, total: queue.length } : undefined}
          onClose={closeSheet}
          onSave={(input) =>
            run(async () => setPhotos(await updateWorkPhoto(slug, open.id, input)), t('Saved'))
          }
          onMakeFirst={
            photos[0]?.id === open.id
              ? undefined
              : () =>
                  void saveOrder(
                    moveTo(
                      photos.map((photo) => photo.id),
                      open.id,
                      0,
                    ),
                  )
          }
          onDelete={() =>
            void run(async () => setPhotos(await removePhoto(slug, open.id)), t('Photo deleted'))
          }
        />
      )}
    </section>
  )
}
