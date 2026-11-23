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
import { useSearchParams } from 'next/navigation'
import { type ChangeEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import {
  formatWeekSchedule,
  getOpeningStatus,
  MasterCard,
  MasterGrid,
  PlaceCoverImage,
  PlaceDescription,
  PlaceLine,
  PlaceLogo,
  PlaceName,
  PlaceProfile,
  WeekHours,
  weekdayOf,
} from '@/entities/business'
import { OfferCard } from '@/entities/offer'
import {
  createCategory,
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
import { useT } from '@/shared/i18n'
import { useToday } from '@/shared/lib/hooks/useToday'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { FloatingToolbar } from '@/shared/ui/FloatingToolbar/FloatingToolbar'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { ProfileTabAction, ProfileTabs } from '@/shared/ui/ProfileTabs/ProfileTabs'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { PAGE_SECTIONS } from '@/views/manage/manageTabs'
import { useHasFeature } from '@/views/manage/model/usePlanAccess'
import { HoursSheet } from '@/views/manage/ui/Hours/HoursSheet'
import { MasterDialog } from '@/views/manage/ui/Masters/MasterDialog'
import { MasterPaySheet } from '@/views/manage/ui/Masters/MasterPaySheet'
import { MasterScheduleSheet } from '@/views/manage/ui/Masters/MasterScheduleSheet'
import { PhotosSection } from '@/views/manage/ui/PhotosSection/PhotosSection'
import { CategoryDialog } from '@/views/manage/ui/Services/CategoryDialog'
import { ServiceDialog } from '@/views/manage/ui/Services/ServiceDialog'
import { EditPageSheet } from './EditPageSheet'
import { PageChecklist } from './PageChecklist'
import { PageInsights } from './PageInsights'
import styles from './PageTab.module.css'
import { ShareSheet } from './ShareSheet'

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

// The business page laid out like a profile in Instagram: the cover with the logo over its edge, a
// short bio, «Редактировать · Поделиться» (everything written about the place is edited in one
// sheet, so the page stays what clients see), then tabs: the work as a grid, the masters, the
// week's hours. The logo and the cover change from their own buttons.
export const PageTab = ({ slug, business, catalog, run }: PageTabProps) => {
  const t = useT()
  const today = useToday()
  const hasPayroll = useHasFeature('payroll')
  const coverInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'cover' | 'logo' | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [photos, setPhotos] = useState<WorkPhoto[] | null>(null)
  const photoCount = photos?.length ?? null
  const searchParams = useSearchParams()
  // Old links to «Услуги», «Мастера» and «График» open that tab of the page.
  const [section, setSection] = useState<PageSection>(
    () => PAGE_SECTIONS[searchParams.get('tab') ?? ''] ?? 'works',
  )
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const linkedSection = PAGE_SECTIONS[searchParams.get('tab') ?? '']
  // Services, masters and hours are changed in sheets right here, never in another tab.
  const [editingService, setEditingService] = useState<Service | 'new' | null>(null)
  const [editingMaster, setEditingMaster] = useState<Specialist | 'new' | null>(null)
  const [schedulingMaster, setSchedulingMaster] = useState<Specialist | null>(null)
  const [payingMaster, setPayingMaster] = useState<Specialist | null>(null)
  const [isEditingHours, setIsEditingHours] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const masters = catalog.specialists.filter((master) => master.isActive !== false)
  const services = catalog.services.filter((service) => service.isActive !== false)
  // The owner also sees what is switched off, marked, so it can be switched back on here.
  const serviceGroups = catalog.categories
    .map((category) => ({
      category,
      items: catalog.services.filter((service) => service.categoryId === category.id),
    }))
    .filter((group) => group.items.length > 0)
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes, t) : null
  const todayWeekday = today ? weekdayOf(today.dayKey) : null
  const kindLabel = BUSINESS_KINDS.find((kind) => kind.value === business.kind)?.label
  const kindText = kindLabel ? t(kindLabel) : undefined
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

  // A link that names a section while the page is open («Запуск записи» → «Добавьте мастеров»)
  // switches to that tab here too.
  useEffect(() => {
    if (linkedSection) setSection(linkedSection)
  }, [linkedSection])

  const upload = (kind: 'cover' | 'logo') => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(kind)
    await run(
      () => (kind === 'cover' ? uploadCover(slug, file) : uploadLogo(slug, file)),
      kind === 'cover' ? t('Обложка обновлена') : t('Логотип обновлён'),
    )
    setBusy(null)
  }

  const save = (input: UpdateBusinessInput) =>
    run(() => updateBusiness(slug, input), t('Страница сохранена'))

  const share = () => setIsSharing(true)

  const plus = <Plus weight='bold' aria-hidden />
  const tabActions: Record<PageSection, TabAction | null> = {
    works:
      (photoCount ?? 0) < MAX_PHOTOS
        ? { label: t('Добавить'), ariaLabel: t('Добавить фото'), icon: plus, onClick: addPhotos }
        : null,
    services: {
      label: t('Добавить'),
      ariaLabel: t('Добавить услугу'),
      icon: plus,
      onClick: () => setEditingService('new'),
    },
    masters: {
      label: t('Добавить'),
      ariaLabel: t('Добавить мастера'),
      icon: plus,
      onClick: () => setEditingMaster('new'),
    },
    hours: {
      label: t('Изменить'),
      ariaLabel: t('Изменить часы'),
      icon: <PencilSimple weight='bold' aria-hidden />,
      onClick: () => setIsEditingHours(true),
    },
  }
  const tabAction = tabActions[section]

  const saveService = (input: ServiceInput) =>
    editingService && editingService !== 'new'
      ? run(() => updateService(slug, editingService.id, input), t('Услуга сохранена'))
      : run(() => createService(slug, input), t('Услуга добавлена'))

  const saveMaster = (input: SpecialistInput) =>
    editingMaster && editingMaster !== 'new'
      ? run(() => updateSpecialist(slug, editingMaster.id, input), t('Мастер сохранён'))
      : run(() => createSpecialist(slug, input), t('Мастер добавлен'))

  const logo = (
    <PlaceLogo name={business.name} logoUrl={business.logoUrl} isBusy={busy === 'logo'}>
      <span className={styles.logoBadge} aria-hidden='true'>
        <Camera weight='fill' />
      </span>
    </PlaceLogo>
  )

  return (
    <div className={styles.page} data-page-tab>
      <PlaceProfile
        name={business.name}
        hasCover={Boolean(business.coverUrl)}
        cover={
          <>
            {business.coverUrl && (
              <PlaceCoverImage src={business.coverUrl} alt={t('Обложка')} fetchPriority='high' />
            )}
            {business.coverUrl ? (
              <Menu
                label={t('Обложка')}
                className={styles.coverButton}
                trigger={
                  <>
                    <Camera weight='bold' aria-hidden />
                    {busy === 'cover' ? t('Загружаем…') : t('Обложка')}
                  </>
                }
              >
                <MenuItem icon={<Camera aria-hidden />} onClick={() => coverInput.current?.click()}>
                  {t('Заменить обложку')}
                </MenuItem>
                <MenuItem
                  variant='danger'
                  icon={<Trash aria-hidden />}
                  onClick={() => void run(() => removeCover(slug), t('Обложка удалена'))}
                >
                  {t('Удалить обложку')}
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
                {busy === 'cover' ? t('Загружаем…') : t('Добавить обложку')}
              </button>
            )}
          </>
        }
        logo={
          business.logoUrl ? (
            <Menu label={t('Логотип')} className={styles.logoButton} trigger={logo}>
              <MenuItem icon={<Camera aria-hidden />} onClick={() => logoInput.current?.click()}>
                {t('Заменить логотип')}
              </MenuItem>
              <MenuItem
                variant='danger'
                icon={<Trash aria-hidden />}
                onClick={() => void run(() => removeLogo(slug), t('Логотип удалён'))}
              >
                {t('Удалить логотип')}
              </MenuItem>
            </Menu>
          ) : (
            <button
              type='button'
              className={styles.logoButton}
              onClick={() => logoInput.current?.click()}
              disabled={busy !== null}
              aria-label={t('Добавить логотип')}
            >
              {logo}
            </button>
          )
        }
        // Where the public page keeps «Записаться» and its glyphs: one primary «Редактировать»
        // and the secondary actions as thin glyphs in one capsule.
        actions={
          <>
            <Button type='button' size='sm' onClick={() => setIsEditing(true)}>
              {t('Редактировать')}
            </Button>
            <GlyphGroup label={t('Страница')}>
              <GlyphButton icon={<ShareNetwork />} label={t('Поделиться')} onClick={share} />
              <a
                href={`/${slug}`}
                target='_blank'
                rel='noreferrer'
                aria-label={t('Как видят клиенты')}
                title={t('Как видят клиенты')}
              >
                <ArrowUpRight aria-hidden />
              </a>
            </GlyphGroup>
          </>
        }
        isActionsHiddenOnPhone
        footer={
          <>
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
            />
          </>
        }
      >
        <PlaceName>{business.name}</PlaceName>
        <PlaceLine>{[kindText, business.address].filter(Boolean).join(' · ')}</PlaceLine>
        {status && <PlaceLine tone={status.isOpen ? 'open' : undefined}>{status.label}</PlaceLine>}
        {!business.isPublished && <PlaceLine tone='danger'>{t('Скрыта от клиентов')}</PlaceLine>}
        {business.description ? (
          <PlaceDescription>{business.description}</PlaceDescription>
        ) : (
          <button type='button' className={styles.addBio} onClick={() => setIsEditing(true)}>
            {t('Добавить пару слов о себе')}
          </button>
        )}
      </PlaceProfile>

      <ProfileTabs
        label={t('Разделы страницы')}
        value={section}
        onChange={setSection}
        items={[
          {
            value: 'works',
            label: t('Работы'),
            count: photoCount ?? undefined,
            panelId: 'page-panel-works',
            panel: (
              <PhotosSection
                slug={slug}
                catalog={catalog}
                run={run}
                onPhotosChange={handlePhotos}
                inputId={PHOTO_INPUT_ID}
              />
            ),
          },
          {
            value: 'services',
            label: t('Услуги'),
            count: services.length,
            panelId: 'page-panel-services',
            panel: (
              <>
                {serviceGroups.length === 0 ? (
                  <EmptyState
                    variant='inline'
                    title={t('Добавьте услуги')}
                    text={t('С ценой и длительностью: по ним клиенты записываются.')}
                  />
                ) : (
                  <div className={styles.serviceGroups}>
                    {serviceGroups.map(({ category, items }) => (
                      <section
                        key={category.id}
                        className={styles.serviceGroup}
                        aria-label={category.name}
                      >
                        {serviceGroups.length > 1 && (
                          <SectionCaption as='h3' isInset={false}>
                            {category.name}{' '}
                            <span className={styles.captionCount}>{items.length}</span>
                          </SectionCaption>
                        )}
                        <ul className={styles.services}>
                          {items.map((service) => (
                            <li
                              key={service.id}
                              className={service.isActive === false ? styles.inactive : undefined}
                            >
                              <OfferCard
                                offer={toOffer(service)}
                                isHit={service.isPopular}
                                linkLabel={t(
                                  service.isActive === false
                                    ? 'Изменить «{name}», скрыта'
                                    : 'Изменить «{name}»',
                                  { name: service.name },
                                )}
                                actionLabel={t('Изменить')}
                                onSelect={() => setEditingService(service)}
                                action={
                                  service.isActive === false ? (
                                    <span className={styles.offMark}>{t('Скрыта')}</span>
                                  ) : undefined
                                }
                                isPlaceHidden
                              />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
                <button
                  type='button'
                  className={styles.addCategory}
                  onClick={() => setIsAddingCategory(true)}
                >
                  <Plus weight='bold' aria-hidden />
                  {t('Категория')}
                </button>
              </>
            ),
          },
          {
            value: 'masters',
            label: t('Мастера'),
            count: masters.length,
            panelId: 'page-panel-masters',
            panel:
              catalog.specialists.length === 0 ? (
                <EmptyState
                  variant='inline'
                  title={t('Добавьте мастеров')}
                  text={t('Клиенты выбирают мастера по фото при записи.')}
                />
              ) : (
                <MasterGrid>
                  {catalog.specialists.map((master) => (
                    <li
                      key={master.id}
                      className={master.isActive === false ? styles.inactive : undefined}
                    >
                      <MasterCard specialist={master} onSelect={() => setEditingMaster(master)}>
                        {master.isActive === false && (
                          <span className={styles.offMark}>{t('Не работает')}</span>
                        )}
                      </MasterCard>
                    </li>
                  ))}
                </MasterGrid>
              ),
          },
          {
            value: 'hours',
            label: t('Время'),
            panelId: 'page-panel-hours',
            panel: <WeekHours hours={business.hours} todayWeekday={todayWeekday} status={status} />,
          },
        ]}
        // One action per tab, always in the same place: the end of the tabs' row.
        action={
          tabAction && (
            <ProfileTabAction
              label={tabAction.label}
              ariaLabel={tabAction.ariaLabel}
              icon={tabAction.icon}
              onClick={tabAction.onClick}
              isHiddenOnPhone
            />
          )
        }
      />
      {/* Phones: the page's tools float at the window's foot (the cabinet's rule for a section's
          tools): thin glyphs in one capsule and the open tab's action as a labelled accent button. */}
      <FloatingToolbar align='end' className={styles.phoneTools}>
        <GlyphGroup label={t('Инструменты страницы')}>
          <GlyphButton
            icon={<PencilSimple />}
            label={t('Редактировать')}
            onClick={() => setIsEditing(true)}
          />
          <GlyphButton icon={<ShareNetwork />} label={t('Поделиться')} onClick={share} />
          <a
            href={`/${slug}`}
            target='_blank'
            rel='noreferrer'
            aria-label={t('Как видят клиенты')}
            title={t('Как видят клиенты')}
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

      <input
        ref={coverInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={upload('cover')}
        aria-label={t('Файл обложки')}
      />
      <input
        ref={logoInput}
        type='file'
        accept={ACCEPT}
        hidden
        onChange={upload('logo')}
        aria-label={t('Файл логотипа')}
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
            editingMaster === 'new' || !hasPayroll
              ? undefined
              : (file) =>
                  run(
                    () =>
                      file
                        ? uploadSpecialistPhoto(slug, editingMaster.id, file)
                        : removeSpecialistPhoto(slug, editingMaster.id),
                    file ? t('Фото обновлено') : t('Фото удалено'),
                  )
          }
          slug={slug}
          onOpenPay={
            editingMaster === 'new'
              ? undefined
              : () => {
                  setPayingMaster(editingMaster)
                  setEditingMaster(null)
                }
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
      {isAddingCategory && (
        <CategoryDialog
          onClose={() => setIsAddingCategory(false)}
          onSave={(name) => run(() => createCategory(slug, name), t('Категория добавлена'))}
        />
      )}
      {payingMaster && (
        <MasterPaySheet
          slug={slug}
          master={payingMaster}
          services={catalog.services}
          onClose={() => setPayingMaster(null)}
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
          slotMinutes={business.slotMinutes}
          run={run}
          onClose={() => setIsEditingHours(false)}
        />
      )}
      {isEditing && (
        <EditPageSheet
          business={business}
          hoursText={formatWeekSchedule(business.hours, t)}
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
