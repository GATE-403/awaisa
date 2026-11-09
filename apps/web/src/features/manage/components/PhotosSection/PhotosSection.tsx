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
    <section className={styles.group} aria-label='Фото'>
      <h3 className={styles.groupTitle}>Фото</h3>
      <div className={styles.list}>
        <div className={styles.coverRow} data-busy={busy === 'cover' || undefined}>
          <button
            type='button'
            className={styles.coverThumb}
            style={{ '--tint': pickTint(business.name) } as CSSProperties}
            onClick={() => coverInput.current?.click()}
            disabled={busy !== null}
            aria-label={business.coverUrl ? 'Заменить обложку' : 'Добавить обложку'}
          >
            {business.coverUrl ? (
              // biome-ignore lint/performance/noImgElement: already resized WebP from our API
              <img src={business.coverUrl} alt='Обложка' className={styles.image} />
            ) : (
              <BusinessTile name={business.name} size='sm' />
            )}
          </button>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Обложка</span>
            <span className={styles.rowHint}>
              {busy === 'cover' ? 'Загружаем…' : 'Карточка в каталоге и шапка страницы'}
            </span>
          </span>
          <span className={styles.rowActions}>
            <button
              type='button'
              className={styles.textButton}
              onClick={() => coverInput.current?.click()}
              disabled={busy !== null}
            >
              <Camera weight='bold' aria-hidden />
              {business.coverUrl ? 'Заменить' : 'Добавить'}
            </button>
            {business.coverUrl && (
              <button
                type='button'
                className={styles.textButton}
                data-danger
                onClick={() => run(() => removeCover(slug), 'Обложка удалена')}
                disabled={busy !== null}
              >
                Удалить
              </button>
            )}
          </span>
        </div>

        <div className={styles.photosRow}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Фото работ</span>
            <span className={styles.rowHint}>
              {busy === 'photo'
                ? 'Загружаем…'
                : `${business.photos.length} из ${MAX_PHOTOS} · полка «Работы» на странице`}
            </span>
          </span>
          <ul className={styles.strip}>
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
                  aria-label='Добавить фото'
                >
                  <Plus weight='bold' aria-hidden />
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
      <p className={styles.groupFooter}>
        Горизонтальное фото зала или работы, без текста. JPG, PNG или HEIC до 10 МБ.
      </p>
      <input
        ref={coverInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={handleCover}
        aria-label='Файл обложки'
      />
      <input
        ref={photoInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={handlePhoto}
        aria-label='Файл фото'
      />
    </section>
  )
}
