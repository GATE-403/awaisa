'use client'

import { Button, ButtonLink } from '@awaisa/ui/Button'
import { Input } from '@awaisa/ui/Input'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { ArrowUpRight, Camera, CaretRight, Plus, Trash } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ChangeEvent, type CSSProperties, type FormEvent, useRef, useState } from 'react'
import {
  BusinessTile,
  formatWeekSchedule,
  getOpeningStatus,
  PersonAvatar,
  pickTint,
} from '@/entities/business'
import {
  removeCover,
  removeLogo,
  updateBusiness,
  uploadCover,
  uploadLogo,
} from '@/shared/api/clientApi'
import type { Business, BusinessKind, Catalog, UpdateBusinessInput } from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useToday } from '@/shared/lib/hooks/useToday'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { pluralWord } from '@/shared/lib/plural'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import forms from '@/views/manage/ui/manageForms.module.css'
import { PhotosSection } from '@/views/manage/ui/PhotosSection/PhotosSection'
import styles from './PageTab.module.css'

interface PageTabProps {
  slug: string
  business: Business
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

type ContactField = 'city' | 'address' | 'phone' | 'whatsapp' | 'mapUrl'

const CONTACTS: { key: ContactField; label: string; placeholder?: string; type?: string }[] = [
  { key: 'city', label: 'Город' },
  { key: 'address', label: 'Адрес', placeholder: 'ул. Токтогула, 125' },
  { key: 'phone', label: 'Телефон', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: 'Необязательно' },
  { key: 'mapUrl', label: 'Ссылка на карту', placeholder: 'https://2gis.kg/…' },
]

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

const FACES_SHOWN = 6

// The business page as clients see it, edited where it stands: the cover and the logo change from
// their own buttons, the name and the words are typed in place, «+» adds work and masters.
export const PageTab = ({ slug, business, catalog, run }: PageTabProps) => {
  const today = useToday()
  const coverInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'cover' | 'logo' | null>(null)
  const [draft, setDraft] = useState<UpdateBusinessInput>({})
  const [isSaving, setIsSaving] = useState(false)
  const values = { ...business, ...draft }
  const hasChanges = Object.keys(draft).length > 0
  const masters = catalog.specialists.filter((master) => master.isActive !== false)
  const services = catalog.services.filter((service) => service.isActive !== false)
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes) : null
  const settingsHref = (tab: string) => `/manage/${slug}?tab=${tab}`

  const change = (patch: UpdateBusinessInput) => setDraft((current) => ({ ...current, ...patch }))

  const upload = (kind: 'cover' | 'logo') => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(kind)
    await run(
      () => (kind === 'cover' ? uploadCover(slug, file) : uploadLogo(slug, file)),
      kind === 'cover' ? 'Обложка обновлена' : 'Логотип обновлён',
    )
    setBusy(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSaving(true)
    if (await run(() => updateBusiness(slug, draft), 'Страница сохранена')) setDraft({})
    setIsSaving(false)
  }

  const coverPicture = business.coverUrl ? (
    // biome-ignore lint/performance/noImgElement: already resized WebP from our API
    <img src={business.coverUrl} alt='Обложка' className={styles.coverImage} fetchPriority='high' />
  ) : null

  const logo = (
    <span className={styles.logo} data-busy={busy === 'logo' || undefined}>
      <BusinessTile name={business.name} logoUrl={business.logoUrl} size='lg' />
      <span className={styles.logoBadge} aria-hidden='true'>
        <Camera weight='fill' />
      </span>
    </span>
  )

  return (
    <form className={styles.page} onSubmit={handleSubmit} aria-label='Страница'>
      <div className={styles.toolbar}>
        <span className={styles.toolbarNote}>
          <span className={styles.statusDot} data-on={values.isPublished || undefined} />
          {values.isPublished ? 'Страница открыта для записи' : 'Страница скрыта'}
        </span>
        <ButtonLink
          href={`/${slug}`}
          target='_blank'
          rel='noreferrer'
          variant='secondary'
          size='sm'
        >
          Как видят клиенты
          <ArrowUpRight weight='bold' aria-hidden />
        </ButtonLink>
      </div>

      {/* The head of the public page: cover, the logo over its edge, name, kind, words. */}
      <header
        className={styles.head}
        style={{ '--place-tint': pickTint(business.name) } as CSSProperties}
      >
        <div className={styles.cover} data-empty={!business.coverUrl || undefined}>
          {coverPicture}
          {business.coverUrl ? (
            <Menu
              label='Обложка'
              className={styles.coverButton}
              trigger={
                <>
                  <Camera weight='bold' aria-hidden />
                  {busy === 'cover' ? 'Загружаем…' : 'Обложка'}
                </>
              }
            >
              <MenuItem icon={<Camera aria-hidden />} onClick={() => coverInput.current?.click()}>
                Заменить обложку
              </MenuItem>
              <MenuItem
                variant='danger'
                icon={<Trash aria-hidden />}
                onClick={() => void run(() => removeCover(slug), 'Обложка удалена')}
              >
                Удалить обложку
              </MenuItem>
            </Menu>
          ) : (
            <button
              type='button'
              className={styles.coverAdd}
              onClick={() => coverInput.current?.click()}
              disabled={busy !== null}
            >
              <Camera weight='bold' aria-hidden />
              {busy === 'cover' ? 'Загружаем…' : 'Добавить обложку'}
            </button>
          )}
        </div>

        <div className={styles.identity}>
          {business.logoUrl ? (
            <Menu label='Логотип' className={styles.logoButton} trigger={logo}>
              <MenuItem icon={<Camera aria-hidden />} onClick={() => logoInput.current?.click()}>
                Заменить логотип
              </MenuItem>
              <MenuItem
                variant='danger'
                icon={<Trash aria-hidden />}
                onClick={() => void run(() => removeLogo(slug), 'Логотип удалён')}
              >
                Удалить логотип
              </MenuItem>
            </Menu>
          ) : (
            <button
              type='button'
              className={styles.logoButton}
              onClick={() => logoInput.current?.click()}
              disabled={busy !== null}
              aria-label='Добавить логотип'
            >
              {logo}
            </button>
          )}
        </div>

        <input
          className={styles.name}
          aria-label='Название'
          value={values.name}
          maxLength={80}
          onChange={(event) => change({ name: event.target.value })}
        />
        <div className={styles.handle}>
          <Select
            variant='plain'
            aria-label='Чем занимаетесь'
            className={styles.kind}
            items={BUSINESS_KINDS}
            value={values.kind}
            onValueChange={(value) => value && change({ kind: value as BusinessKind })}
          />
          {values.address && <span className={styles.street}>· {values.address}</span>}
        </div>
        <p className={styles.facts}>
          <span>
            <strong>{services.length}</strong>{' '}
            {pluralWord(services.length, ['услуга', 'услуги', 'услуг'])}
          </span>
          <span>
            <strong>{masters.length}</strong>{' '}
            {pluralWord(masters.length, ['мастер', 'мастера', 'мастеров'])}
          </span>
          {status && (
            <span className={styles.open} data-open={status.isOpen || undefined}>
              {status.label}
            </span>
          )}
        </p>
        <textarea
          className={styles.description}
          aria-label='Коротко о вас'
          value={values.description}
          maxLength={500}
          rows={2}
          placeholder='Пара слов о вас: чем вы хороши и для кого'
          onChange={(event) => change({ description: event.target.value })}
        />
      </header>

      <PhotosSection
        slug={slug}
        catalog={catalog}
        run={run}
        renderHeading={(count) => (
          <h2 className={styles.sectionTitle}>
            Работы <span className={styles.count}>{count}</span>
          </h2>
        )}
      />

      <section className={styles.section} aria-label='Мастера'>
        <h2 className={styles.sectionTitle}>
          Мастера <span className={styles.count}>{masters.length}</span>
          <NextLink href={settingsHref('masters')} scroll={false} className={styles.more}>
            Все
            <CaretRight weight='bold' aria-hidden />
          </NextLink>
        </h2>
        <ul className={styles.faces}>
          <li>
            <NextLink
              href={settingsHref('masters')}
              scroll={false}
              className={styles.face}
              data-add
            >
              <span className={styles.addFace} aria-hidden='true'>
                <Plus weight='bold' />
              </span>
              Добавить
            </NextLink>
          </li>
          {masters.slice(0, FACES_SHOWN).map((master) => (
            <li key={master.id}>
              <NextLink href={settingsHref('masters')} scroll={false} className={styles.face}>
                <PersonAvatar name={master.name} src={master.photoUrl ?? undefined} size='lg' />
                {master.name.split(' ')[0]}
              </NextLink>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-label='Часы работы'>
        <h2 className={styles.sectionTitle}>Часы</h2>
        <NextLink href={settingsHref('hours')} scroll={false} className={styles.hoursRow}>
          <span className={styles.hoursText}>{formatWeekSchedule(business.hours)}</span>
          <span className={styles.hoursAction}>
            Изменить
            <CaretRight weight='bold' aria-hidden />
          </span>
        </NextLink>
      </section>

      <div className={forms.group}>
        <SectionCaption>Контакты</SectionCaption>
        <div className={forms.list}>
          {CONTACTS.map(({ key, label, placeholder, type }) => (
            <label key={key} className={forms.fieldRow}>
              <span className={forms.fieldLabel}>{label}</span>
              <Input
                variant='plain'
                type={type}
                inputMode={type === 'tel' ? 'tel' : undefined}
                value={type === 'tel' ? maskPhoneInput(values[key]) : values[key]}
                placeholder={placeholder ?? 'Не указано'}
                onValueChange={(value) =>
                  change({ [key]: type === 'tel' ? maskPhoneInput(value) : value })
                }
              />
            </label>
          ))}
        </div>
      </div>

      <div className={forms.group}>
        <SectionCaption>Публикация</SectionCaption>
        <div className={forms.list}>
          <label className={forms.settingRow}>
            <span className={forms.rowBody}>
              <span className={forms.rowTitle}>Страница открыта</span>
              <span className={forms.rowMeta}>Выключите, чтобы временно остановить запись</span>
            </span>
            <Switch
              checked={values.isPublished}
              onCheckedChange={(isPublished) => change({ isPublished })}
            />
          </label>
        </div>
      </div>

      <input
        ref={coverInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={upload('cover')}
        aria-label='Файл обложки'
      />
      <input
        ref={logoInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={upload('logo')}
        aria-label='Файл логотипа'
      />

      {hasChanges && (
        <section className={forms.saveBar} aria-label='Несохранённые изменения'>
          <span className={forms.saveText}>Есть несохранённые изменения</span>
          <Button type='button' variant='secondary' size='sm' onClick={() => setDraft({})}>
            Отменить
          </Button>
          <Button type='submit' size='sm' disabled={isSaving}>
            Сохранить
          </Button>
        </section>
      )}
    </form>
  )
}
