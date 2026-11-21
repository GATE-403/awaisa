'use client'

import { Button } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import {
  ArrowUpRight,
  Camera,
  PencilSimple,
  Plus,
  ShareNetwork,
  Trash,
} from '@phosphor-icons/react/ssr'
import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react'
import {
  BusinessTile,
  formatWeekSchedule,
  getOpeningStatus,
  MasterCard,
  pickTint,
  weekdayOf,
} from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import {
  createService,
  createSpecialist,
  removeCover,
  removeLogo,
  removeSpecialistPhoto,
  updateBusiness,
  updateService,
  updateSpecialist,
  uploadCover,
  uploadLogo,
  uploadSpecialistPhoto,
} from '@/shared/api/clientApi'
import type {
  Business,
  Catalog,
  Offer,
  Service,
  ServiceInput,
  Specialist,
  SpecialistInput,
  UpdateBusinessInput,
  WorkPhoto,
} from '@/shared/api/types'
import { BUSINESS_KINDS } from '@/shared/config/platform'
import { useToday } from '@/shared/lib/hooks/useToday'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { HoursSheet } from '@/views/manage/ui/HoursTab/HoursSheet'
import { MasterDialog } from '@/views/manage/ui/MastersTab/MasterDialog'
import { MasterScheduleSheet } from '@/views/manage/ui/MastersTab/MasterScheduleSheet'
import { PhotosSection } from '@/views/manage/ui/PhotosSection/PhotosSection'
import { ServiceDialog } from '@/views/manage/ui/ServicesTab/ServiceDialog'
import { EditPageSheet } from './EditPageSheet'
import { PageChecklist } from './PageChecklist'
import { PageInsights } from './PageInsights'
import styles from './PageTab.module.css'
import { ShareSheet } from './ShareSheet'
import { WeekHours } from './WeekHours'

interface PageTabProps {
  slug: string
  business: Business
  catalog: Catalog
  run: (action: () => Promise<unknown>, successTitle: string) => Promise<boolean>
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

type PageSection = 'works' | 'services' | 'masters' | 'hours'

type TabAction = { label: string; ariaLabel: string; icon: ReactNode; onClick: () => void }

const MAX_PHOTOS = 30
const PHOTO_INPUT_ID = 'page-work-photo'

const SECTIONS: { value: PageSection; label: string }[] = [
  { value: 'works', label: 'Работы' },
  { value: 'services', label: 'Услуги' },
  { value: 'masters', label: 'Мастера' },
  { value: 'hours', label: 'Время' },
]

// The business page laid out like a profile in Instagram: the cover with the logo over its edge, a
// short bio, «Редактировать · Поделиться» (everything written about the place is edited in one
// sheet, so the page stays what clients see), then tabs: the work as a grid, the masters, the
// week's hours. The logo and the cover change from their own buttons.
export const PageTab = ({ slug, business, catalog, run }: PageTabProps) => {
  const today = useToday()
  const coverInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'cover' | 'logo' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [photos, setPhotos] = useState<WorkPhoto[] | null>(null)
  const photoCount = photos?.length ?? null
  const [section, setSection] = useState<PageSection>('works')
  // Services, masters and hours are changed in sheets right here, never in another tab.
  const [editingService, setEditingService] = useState<Service | 'new' | null>(null)
  const [editingMaster, setEditingMaster] = useState<Specialist | 'new' | null>(null)
  const [schedulingMaster, setSchedulingMaster] = useState<Specialist | null>(null)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const masters = catalog.specialists.filter((master) => master.isActive !== false)
  const services = catalog.services.filter((service) => service.isActive !== false)
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes) : null
  const todayWeekday = today ? weekdayOf(today.dayKey) : null
  const kindLabel = BUSINESS_KINDS.find((kind) => kind.value === business.kind)?.label
  const settingsHref = (tab: string) => `/manage/${slug}?tab=${tab}`
  const handlePhotos = useCallback((next: WorkPhoto[]) => setPhotos(next), [])
  // Each service pictured as on the public page: its first visible tagged work, else the cover.
  const servicePhoto = (serviceId: string) =>
    photos?.find((photo) => photo.serviceId === serviceId && !photo.isHidden)?.url ??
    business.coverUrl ??
    null
  const toOffer = (service: Service): Offer => ({
    id: service.id,
    name: service.name,
    price: service.price,
    durationMinutes: service.durationMinutes,
    isPopular: service.isPopular,
    slug: business.slug,
    businessName: business.name,
    kind: business.kind,
    coverUrl: servicePhoto(service.id),
    rating: null,
    address: business.address ?? null,
    discountPercent: null,
  })

  const addPhotos = () => {
    setSection('works')
    document.getElementById(PHOTO_INPUT_ID)?.click()
  }

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

  const save = (input: UpdateBusinessInput) =>
    run(() => updateBusiness(slug, input), 'Страница сохранена')

  const share = () => setIsSharing(true)

  const plus = <Plus weight='bold' aria-hidden />
  const tabActions: Record<PageSection, TabAction | null> = {
    works:
      (photoCount ?? 0) < MAX_PHOTOS
        ? { label: 'Добавить', ariaLabel: 'Добавить фото', icon: plus, onClick: addPhotos }
        : null,
    services: {
      label: 'Добавить',
      ariaLabel: 'Добавить услугу',
      icon: plus,
      onClick: () => setEditingService('new'),
    },
    masters: {
      label: 'Добавить',
      ariaLabel: 'Добавить мастера',
      icon: plus,
      onClick: () => setEditingMaster('new'),
    },
    hours: {
      label: 'Изменить',
      ariaLabel: 'Изменить часы',
      icon: <PencilSimple weight='bold' aria-hidden />,
      onClick: () => setIsEditingHours(true),
    },
  }
  const tabAction = tabActions[section]

  const saveService = (input: ServiceInput) =>
    editingService && editingService !== 'new'
      ? run(() => updateService(slug, editingService.id, input), 'Услуга сохранена')
      : run(() => createService(slug, input), 'Услуга добавлена')

  const saveMaster = (input: SpecialistInput) =>
    editingMaster && editingMaster !== 'new'
      ? run(() => updateSpecialist(slug, editingMaster.id, input), 'Мастер сохранён')
      : run(() => createSpecialist(slug, input), 'Мастер добавлен')

  const tabCounts: Partial<Record<PageSection, () => number | undefined>> = {
    works: () => photoCount ?? undefined,
    services: () => services.length,
    masters: () => masters.length,
  }

  const logo = (
    <span className={styles.logo} data-busy={busy === 'logo' || undefined}>
      <BusinessTile name={business.name} logoUrl={business.logoUrl} size='lg' />
      <span className={styles.logoBadge} aria-hidden='true'>
        <Camera weight='fill' />
      </span>
    </span>
  )

  return (
    <div className={styles.page} data-page-tab>
      <header
        className={styles.head}
        style={{ '--place-tint': pickTint(business.name) } as CSSProperties}
      >
        <div className={styles.cover} data-empty={!business.coverUrl || undefined}>
          {business.coverUrl && (
            // biome-ignore lint/performance/noImgElement: already resized WebP from our API
            <img
              src={business.coverUrl}
              alt='Обложка'
              className={styles.coverImage}
              fetchPriority='high'
            />
          )}
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

        <div className={styles.profileRow}>
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
          {/* Where the public page keeps its quick actions: one primary «Редактировать» and the
              secondary ones as thin glyphs in one capsule. */}
          <div className={styles.actions}>
            <Button
              type='button'
              size='sm'
              className={styles.edit}
              onClick={() => setIsEditing(true)}
            >
              Редактировать
            </Button>
            <GlyphGroup label='Страница'>
              <GlyphButton icon={<ShareNetwork />} label='Поделиться' onClick={share} />
              <a
                href={`/${slug}`}
                target='_blank'
                rel='noreferrer'
                aria-label='Как видят клиенты'
                title='Как видят клиенты'
              >
                <ArrowUpRight aria-hidden />
              </a>
            </GlyphGroup>
          </div>
        </div>

        <div className={styles.bio}>
          <h2 className={styles.name}>{business.name}</h2>
          <p className={styles.line}>{[kindLabel, business.address].filter(Boolean).join(' · ')}</p>
          {status && (
            <p className={styles.open} data-open={status.isOpen || undefined}>
              {status.label}
            </p>
          )}
          {!business.isPublished && <p className={styles.unpublished}>Скрыта от клиентов</p>}
          {business.description ? (
            <p className={styles.description}>{business.description}</p>
          ) : (
            <button type='button' className={styles.addBio} onClick={() => setIsEditing(true)}>
              Добавить пару слов о себе
            </button>
          )}
        </div>

        <PageInsights
          slug={slug}
          analyticsHref={settingsHref('analytics')}
          services={catalog.services}
          run={run}
          todayKey={today?.dayKey ?? null}
        />
        <PageChecklist
          business={business}
          photoCount={photoCount}
          onAddCover={() => coverInput.current?.click()}
          onAddLogo={() => logoInput.current?.click()}
          onAddPhotos={addPhotos}
          onAddDescription={() => setIsEditing(true)}
        />
      </header>

      <div className={styles.sections}>
        <TextTabs
          label='Разделы страницы'
          items={SECTIONS.map((item) => ({
            label: item.label,
            count: tabCounts[item.value]?.(),
            isActive: section === item.value,
            onSelect: () => setSection(item.value),
            id: `page-tab-${item.value}`,
            controls: `page-panel-${item.value}`,
          }))}
        />
        {/* One action per tab, always in the same place: the end of the tabs' row. */}
        {tabAction && (
          <button
            type='button'
            className={styles.sectionAction}
            onClick={tabAction.onClick}
            aria-label={tabAction.ariaLabel}
          >
            {tabAction.icon}
            {tabAction.label}
          </button>
        )}
      </div>

      {/* Phones: the page's tools float at the window's foot (the cabinet's rule for a section's
          tools): thin glyphs in one capsule and the open tab's action as a labelled accent button. */}
      <FloatingToolbar align='end' className={styles.phoneTools}>
        <GlyphGroup label='Инструменты страницы'>
          <GlyphButton
            icon={<PencilSimple />}
            label='Редактировать'
            onClick={() => setIsEditing(true)}
          />
          <GlyphButton icon={<ShareNetwork />} label='Поделиться' onClick={share} />
          <a
            href={`/${slug}`}
            target='_blank'
            rel='noreferrer'
            aria-label='Как видят клиенты'
            title='Как видят клиенты'
          >
            <ArrowUpRight aria-hidden />
          </a>
        </GlyphGroup>
        {tabAction && (
          <Button
            type='button'
            size='sm'
            className={styles.phoneAction}
            onClick={tabAction.onClick}
            aria-label={tabAction.ariaLabel}
          >
            {tabAction.icon}
            {tabAction.label}
          </Button>
        )}
      </FloatingToolbar>

      {/* Every panel stays mounted (the work grid keeps its photos); only the chosen one shows. */}
      <div
        id='page-panel-works'
        role='tabpanel'
        aria-labelledby='page-tab-works'
        hidden={section !== 'works'}
      >
        <PhotosSection
          slug={slug}
          catalog={catalog}
          run={run}
          onPhotosChange={handlePhotos}
          inputId={PHOTO_INPUT_ID}
        />
      </div>

      <div
        id='page-panel-services'
        role='tabpanel'
        aria-labelledby='page-tab-services'
        hidden={section !== 'services'}
      >
        {services.length === 0 ? (
          <EmptyState
            variant='inline'
            title='Добавьте услуги'
            text='С ценой и длительностью: по ним клиенты записываются.'
          />
        ) : (
          <ul className={styles.services}>
            {services.map((service) => (
              <li key={service.id}>
                <OfferCard
                  offer={toOffer(service)}
                  isHit={service.isPopular}
                  linkLabel={`Изменить «${service.name}»`}
                  actionLabel='Изменить'
                  onSelect={() => setEditingService(service)}
                  isPlaceHidden
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        id='page-panel-masters'
        role='tabpanel'
        aria-labelledby='page-tab-masters'
        hidden={section !== 'masters'}
      >
        {masters.length === 0 ? (
          <EmptyState
            variant='inline'
            title='Добавьте мастеров'
            text='Клиенты выбирают мастера по фото при записи.'
          />
        ) : (
          <ul className={styles.masters}>
            {masters.map((master) => (
              <li key={master.id}>
                <MasterCard specialist={master} onSelect={() => setEditingMaster(master)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        id='page-panel-hours'
        role='tabpanel'
        aria-labelledby='page-tab-hours'
        hidden={section !== 'hours'}
        className={styles.hours}
      >
        <WeekHours hours={business.hours} todayWeekday={todayWeekday} status={status} />
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

      {editingService && (
        <ServiceDialog
          key={editingService === 'new' ? 'new' : editingService.id}
          service={editingService === 'new' ? null : editingService}
          categories={catalog.categories}
          onClose={() => setEditingService(null)}
          onSave={saveService}
        />
      )}
      {editingMaster && (
        <MasterDialog
          key={editingMaster === 'new' ? 'new' : editingMaster.id}
          master={editingMaster === 'new' ? null : editingMaster}
          services={catalog.services}
          branches={business.branches}
          onClose={() => setEditingMaster(null)}
          onSave={saveMaster}
          onPhotoChange={
            editingMaster === 'new'
              ? undefined
              : (file) =>
                  run(
                    () =>
                      file
                        ? uploadSpecialistPhoto(slug, editingMaster.id, file)
                        : removeSpecialistPhoto(slug, editingMaster.id),
                    file ? 'Фото обновлено' : 'Фото удалено',
                  )
          }
          onOpenSchedule={
            editingMaster === 'new'
              ? undefined
              : () => {
                  setSchedulingMaster(editingMaster)
                  setEditingMaster(null)
                }
          }
        />
      )}
      {schedulingMaster && (
        <MasterScheduleSheet
          slug={slug}
          master={schedulingMaster}
          businessHours={business.hours}
          onClose={() => setSchedulingMaster(null)}
        />
      )}
      {isSharing && (
        <ShareSheet
          slug={slug}
          businessName={business.name}
          branches={business.branches}
          onClose={() => setIsSharing(false)}
        />
      )}
      {isEditingHours && (
        <HoursSheet
          slug={slug}
          hours={business.hours}
          run={run}
          onClose={() => setIsEditingHours(false)}
        />
      )}
      {isEditing && (
        <EditPageSheet
          business={business}
          hoursText={formatWeekSchedule(business.hours)}
          onEditHours={() => {
            setIsEditing(false)
            setIsEditingHours(true)
          }}
          onSave={save}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  )
}
