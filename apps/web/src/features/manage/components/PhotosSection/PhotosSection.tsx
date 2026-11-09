import { Camera, Plus, X } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, type CSSProperties, useRef, useState } from 'react'
import { addPhoto, removeCover, removePhoto, uploadCover } from '@/common/api/clientApi'
import type { Business } from '@/common/api/types'
import { BusinessTile, pickTint } from '@/common/components/BusinessTile/BusinessTile'
import styles from './PhotosSection.module.css'

interface PhotosSectionProps {
  slug: string
  business: Business
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

const MAX_PHOTOS = 6

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// Pictures lead, like on apple.com: a cover for the catalog card and up to six photos of the work.
export const PhotosSection = ({ slug, business, run }: PhotosSectionProps) => {
  const coverInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'cover' | 'photo' | null>(null)

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    return file
  }

  const handleCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = pick(event)
    if (!file) return
    setBusy('cover')
    await run(() => uploadCover(slug, file), 'Обложка обновлена')
    setBusy(null)
  }

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = pick(event)
    if (!file) return
    setBusy('photo')
    await run(() => addPhoto(slug, file), 'Фото добавлено')
    setBusy(null)
  }

  return (
    <section className={styles.section} aria-label='Фото'>
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Обложка</h3>
        <div
          className={styles.cover}
          style={{ '--tint': pickTint(business.name) } as CSSProperties}
          data-busy={busy === 'cover' || undefined}
        >
          {business.coverUrl ? (
            // biome-ignore lint/performance/noImgElement: already resized WebP from our API
            <img src={business.coverUrl} alt='Обложка' className={styles.image} />
          ) : (
            <BusinessTile name={business.name} size='lg' />
          )}
          <div className={styles.coverActions}>
            <button
              type='button'
              className={styles.pill}
              onClick={() => coverInput.current?.click()}
              disabled={busy !== null}
            >
              <Camera weight='bold' aria-hidden />
              {busy === 'cover'
                ? 'Загружаем…'
                : business.coverUrl
                  ? 'Заменить'
                  : 'Добавить обложку'}
            </button>
            {business.coverUrl && (
              <button
                type='button'
                className={styles.pill}
                onClick={() => run(() => removeCover(slug), 'Обложка удалена')}
                disabled={busy !== null}
              >
                Удалить
              </button>
            )}
          </div>
        </div>
        <p className={styles.groupFooter}>
          Первое, что видят в каталоге. Горизонтальное фото зала или работы, без текста.
        </p>
        <input
          ref={coverInput}
          type='file'
          accept={ACCEPT}
          hidden
          onChange={handleCover}
          aria-label='Файл обложки'
        />
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>
          Фото работ · {business.photos.length} из {MAX_PHOTOS}
        </h3>
        <ul className={styles.grid}>
          {business.photos.map((url, index) => (
            <li key={url} className={styles.tile}>
              {/* biome-ignore lint/performance/noImgElement: already resized WebP from our API */}
              <img src={url} alt={`Фото ${index + 1}`} className={styles.image} loading='lazy' />
              <button
                type='button'
                className={styles.remove}
                aria-label={`Удалить фото ${index + 1}`}
                onClick={() => run(() => removePhoto(slug, url), 'Фото удалено')}
              >
                <X weight='bold' aria-hidden />
              </button>
            </li>
          ))}
          {business.photos.length < MAX_PHOTOS && (
            <li>
              <button
                type='button'
                className={styles.add}
                onClick={() => photoInput.current?.click()}
                disabled={busy !== null}
              >
                <Plus weight='bold' aria-hidden />
                {busy === 'photo' ? 'Загружаем…' : 'Добавить фото'}
              </button>
            </li>
          )}
        </ul>
        <input
          ref={photoInput}
          type='file'
          accept={ACCEPT}
          hidden
          onChange={handlePhoto}
          aria-label='Файл фото'
        />
      </div>
    </section>
  )
}
