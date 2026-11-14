import { Camera, EyeSlash, Plus } from '@phosphor-icons/react/ssr'
import { type ChangeEvent, type CSSProperties, useEffect, useRef, useState } from 'react'
import { BusinessTile, pickTint } from '@/entities/business'
import {
  addPhoto,
  getWorkPhotos,
  removeCover,
  removeLogo,
  removePhoto,
  updateWorkPhoto,
  uploadCover,
  uploadLogo,
} from '@/shared/api/clientApi'
import type { Business, Catalog, WorkPhoto } from '@/shared/api/types'
import styles from './PhotosSection.module.css'
import { WorkPhotoSheet } from './WorkPhotoSheet'

interface PhotosSectionProps {
  slug: string
  business: Business
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

const MAX_PHOTOS = 30

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// Pictures lead, like on apple.com: a cover for the catalog card and photos of the work — each
// tagged with its service and master, so the «Работы» feed books exactly that from the photo.
export const PhotosSection = ({ slug, business, catalog, run }: PhotosSectionProps) => {
  const coverInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'cover' | 'logo' | 'photo' | null>(null)
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

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = pick(event)
    if (!file) return
    setBusy('logo')
    await run(() => uploadLogo(slug, file), 'Логотип обновлён')
    setBusy(null)
  }

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = pick(event)
    if (!file) return
    setBusy('photo')
    let added: WorkPhoto | null = null
    await run(async () => {
      const next = await addPhoto(slug, file)
      added = next.find((photo) => !photos.some((known) => known.id === photo.id)) ?? null
      setPhotos(next)
    }, 'Фото добавлено')
    setBusy(null)
    // Right away: what is on it, like tagging a photo after taking it.
    if (added) setOpenId((added as WorkPhoto).id)
  }

  return (
    <section className={styles.group} aria-label='Фото'>
      <h3 className={styles.groupTitle}>Фото</h3>
      <div className={styles.list}>
        {/* The logo first: it stands for the place everywhere — catalog, page, booking, map. */}
        <div className={styles.coverRow} data-busy={busy === 'logo' || undefined}>
          <button
            type='button'
            className={styles.logoThumb}
            onClick={() => logoInput.current?.click()}
            disabled={busy !== null}
            aria-label={business.logoUrl ? 'Заменить логотип' : 'Добавить логотип'}
          >
            <BusinessTile name={business.name} logoUrl={business.logoUrl} size='lg' />
          </button>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Логотип</span>
            <span className={styles.rowHint}>
              {busy === 'logo'
                ? 'Загружаем…'
                : 'Квадратная картинка, в круге везде, где видно место'}
            </span>
            <span className={styles.rowActions}>
              <button
                type='button'
                className={styles.textButton}
                onClick={() => logoInput.current?.click()}
                disabled={busy !== null}
              >
                <Camera weight='bold' aria-hidden />
                {business.logoUrl ? 'Заменить' : 'Добавить'}
              </button>
              {business.logoUrl && (
                <button
                  type='button'
                  className={styles.textButton}
                  data-danger
                  onClick={() => run(() => removeLogo(slug), 'Логотип удалён')}
                  disabled={busy !== null}
                >
                  Удалить
                </button>
              )}
            </span>
          </span>
        </div>

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
              <BusinessTile name={business.name} logoUrl={business.logoUrl} size='sm' />
            )}
          </button>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Обложка</span>
            <span className={styles.rowHint}>
              {busy === 'cover' ? 'Загружаем…' : 'Карточка в каталоге и шапка страницы'}
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
          </span>
        </div>

        <div className={styles.photosRow}>
          <span className={styles.rowText}>
            <span className={styles.rowTitle}>Фото работ</span>
            <span className={styles.rowHint}>
              {busy === 'photo'
                ? 'Загружаем…'
                : `${photos.length} из ${MAX_PHOTOS} · лента «Работы» и полка на странице`}
            </span>
          </span>
          <ul className={styles.strip}>
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
            {photos.length < MAX_PHOTOS && (
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
        Фото работ — крупно и без текста. Нажмите на фото, чтобы указать услугу и мастера: так оно
        попадёт в ленту «Работы» с кнопкой записи. JPG, PNG или HEIC до 10 МБ.
      </p>
      <input
        ref={logoInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={handleLogo}
        aria-label='Файл логотипа'
      />
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
