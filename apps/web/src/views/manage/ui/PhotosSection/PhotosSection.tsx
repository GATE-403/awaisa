import { EyeSlash, Plus } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { addPhoto, getWorkPhotos, removePhoto, updateWorkPhoto } from '@/shared/api/clientApi'
import type { Catalog, WorkPhoto } from '@/shared/api/types'
import styles from './PhotosSection.module.css'
import { WorkPhotoSheet } from './WorkPhotoSheet'

interface PhotosSectionProps {
  slug: string
  catalog: Catalog
  /** The heading the page draws over the mosaic, with the count of photos. */
  renderHeading: (count: number) => ReactNode
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

const MAX_PHOTOS = 30

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// «Работы» as the client sees them: a mosaic of square photos, «+» first. Each is tagged with its
// service and master, so the feed books exactly that from the photo.
export const PhotosSection = ({ slug, catalog, run, renderHeading }: PhotosSectionProps) => {
  const photoInput = useRef<HTMLInputElement>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [photos, setPhotos] = useState<WorkPhoto[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const open = photos.find((photo) => photo.id === openId) ?? null

  useEffect(() => {
    const controller = new AbortController()
    getWorkPhotos(slug, controller.signal)
      .then(setPhotos)
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    setIsBusy(true)
    let added: WorkPhoto | null = null
    await run(async () => {
      const next = await addPhoto(slug, file)
      added = next.find((photo) => !photos.some((known) => known.id === photo.id)) ?? null
      setPhotos(next)
    }, 'Фото добавлено')
    setIsBusy(false)
    // Right away: what is on it, like tagging a photo after taking it.
    if (added) setOpenId((added as WorkPhoto).id)
  }

  return (
    <section className={styles.group} aria-label='Работы'>
      {renderHeading(photos.length)}
      <ul className={styles.strip}>
        {photos.length < MAX_PHOTOS && (
          <li>
            <button
              type='button'
              className={styles.add}
              onClick={() => photoInput.current?.click()}
              disabled={isBusy}
              aria-label='Добавить фото'
              data-busy={isBusy || undefined}
            >
              <Plus weight='bold' aria-hidden />
            </button>
          </li>
        )}
        {photos.map((photo, index) => (
          <li key={photo.id} className={styles.tile} data-hidden={photo.isHidden || undefined}>
            <button
              type='button'
              className={styles.tileButton}
              aria-label={`Фото ${index + 1}: ${photo.serviceName ?? 'услуга не указана'}${photo.isHidden ? ', скрыто' : ''}`}
              onClick={() => setOpenId(photo.id)}
            >
              {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
              <img src={photo.url} alt='' className={styles.image} loading='lazy' />
              {photo.isHidden ? (
                <span className={styles.badge}>
                  <EyeSlash weight='bold' aria-hidden />
                </span>
              ) : (
                !photo.serviceId && <span className={styles.badge}>?</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={photoInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={handlePhoto}
        aria-label='Файл фото'
      />
      {open && (
        <WorkPhotoSheet
          key={open.id}
          photo={open}
          services={catalog.services}
          specialists={catalog.specialists}
          onClose={() => setOpenId(null)}
          onSave={(input) =>
            run(async () => setPhotos(await updateWorkPhoto(slug, open.id, input)), 'Сохранено')
          }
          onDelete={() =>
            void run(async () => setPhotos(await removePhoto(slug, open.id)), 'Фото удалено')
          }
        />
      )}
    </section>
  )
}
