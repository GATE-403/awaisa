'use client'

import { Select } from '@awaisa/ui/Select'
import { useToast } from '@awaisa/ui/Toast'
import {
  CalendarCheck,
  CaretRight,
  ChartBar,
  CircleHalf,
  DownloadSimple,
  Flag,
  Phone,
  PlusCircle,
  SignOut,
  Sparkle,
  Storefront,
  User,
  UserMinus,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { useFavorites } from '@/features/favorites'
import { INTERESTS, PreferencesSheet, usePreferences } from '@/features/forYou'
import { getErrorMessage } from '@/shared/api/apiError'
import { deleteMyAccount, exportMyData, getMasterPlaces } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { MasterPlace } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { NameDialog } from '../NameDialog'
import styles from './AccountSettings.module.css'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлое' },
  { value: 'dark', label: 'Тёмное' },
]

// The account's settings right on the profile, at its foot like iOS Settings — no sheet to open:
// name and number, the theme, the business side, one's data, signing out and deleting the account.
interface AccountSettingsProps {
  /** Inside the «Настройки» tab the tab names it. */
  isTitleHidden?: boolean
}

export const AccountSettings = ({ isTitleHidden = false }: AccountSettingsProps) => {
  const session = useSession()
  const t = useT()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [places, setPlaces] = useState<MasterPlace[]>([])
  const [isNaming, setIsNaming] = useState(false)
  const [isTuning, setIsTuning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const preferences = usePreferences()
  const favorites = useFavorites()
  const toast = useToast()
  const customer = session.customer

  useEffect(() => {
    if (!customer) return
    const controller = new AbortController()
    getMasterPlaces(controller.signal)
      .then(setPlaces)
      .catch(() => undefined)

    return () => controller.abort()
  }, [customer])

  if (!customer) return null

  // «Женщине · маникюр, брови · до 2 500»: what the picks go by, at a glance.
  const tasteSummary = preferences
    ? [
        preferences.gender === 'female'
          ? t('Женщине')
          : preferences.gender === 'male'
            ? t('Мужчине')
            : null,
        preferences.interests
          .slice(0, 2)
          .map((value) => INTERESTS.find((item) => item.value === value)?.label)
          .filter((label): label is string => Boolean(label))
          .map((label) => t(label).toLowerCase())
          .filter(Boolean)
          .join(', ') || null,
        preferences.budget
          ? t('до {amount}', { amount: preferences.budget.toLocaleString('ru-RU') })
          : null,
      ]
        .filter(Boolean)
        .join(' · ') || t('Без предпочтений')
    : t('Не настроено')

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  // One JSON file of what we keep; hearted services live on the device, so they are added here.
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportMyData()
      const blob = new Blob(
        [JSON.stringify({ ...data, deviceFavorites: { serviceIds: favorites.ids } }, null, 2)],
        { type: 'application/json' },
      )
      const file = new File([blob], `awaisa-${data.exportedAt.slice(0, 10)}.json`, {
        type: 'application/json',
      })
      const isTouch = window.matchMedia('(pointer: coarse)').matches
      if (isTouch && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Мои данные Awaisa' })
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.append(link)
      link.click()
      link.remove()
      // Safari starts the download after this tick: revoking at once can cancel it.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.show({ title: 'Не скачалось', description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { slugs } = await deleteMyAccount()
      await Promise.all(slugs.map((slug) => refreshBusiness(slug))).catch(() => undefined)
      session.setCustomer(null)
      toast.show({ title: 'Аккаунт удалён', type: 'success' })
      router.replace('/')
    } catch (error) {
      setIsDeleting(false)
      toast.show({ title: 'Не удалили', description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className={styles.settings} aria-labelledby='settings-title'>
      <h2 id='settings-title' className={styles.title} data-hidden={isTitleHidden || undefined}>
        {t('Настройки')}
      </h2>

      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsNaming(true)}>
          <span className={styles.glyph} aria-hidden>
            <User />
          </span>
          <span className={styles.label}>{t('Имя')}</span>
          <span className={styles.value}>{customer.name || t('Указать')}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </button>
        <div className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <Phone />
          </span>
          <span className={styles.label}>{t('Телефон')}</span>
          <span className={styles.value}>{formatPhone(customer.phone)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <CircleHalf />
          </span>
          <span className={styles.label}>{t('Оформление')}</span>
          <Select
            variant='plain'
            aria-label={t('Оформление')}
            items={THEMES.map((item) => ({ ...item, label: t(item.label) }))}
            value={theme}
            onValueChange={(value) => value && setTheme(value as Theme)}
          />
        </div>
      </div>

      <SectionCaption className={styles.caption}>{t('Подборка')}</SectionCaption>
      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsTuning(true)}>
          <span className={styles.glyph} aria-hidden>
            <Sparkle />
          </span>
          <span className={styles.label}>{t('Для вас')}</span>
          <span className={styles.value}>{tasteSummary}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </button>
      </div>
      <p className={styles.footnote}>
        {t('Для кого, что интересно и бюджет: по ним подбираем услуги в каталоге и после записи.')}
      </p>

      <SectionCaption className={styles.caption}>{t('Бизнес')}</SectionCaption>
      <div className={styles.list}>
        {places.length > 0 && (
          <NextLink href='/master' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <CalendarCheck />
            </span>
            <span className={styles.label}>{t('Мой день')}</span>
            <span className={styles.value}>
              {places.length === 1
                ? places[0]?.businessName
                : t('{count} места', { count: places.length })}
            </span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
        )}
        <NextLink href='/manage' className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <Storefront />
          </span>
          <span className={styles.label}>{t('Мои бизнесы')}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </NextLink>
        <NextLink href='/business/new' className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <PlusCircle />
          </span>
          <span className={styles.label}>{t('Подключить бизнес')}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </NextLink>
        {/* Platform admins: where people drop out of each scenario, on which devices. */}
        {customer.isAdmin && (
          <NextLink href='/insights' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <ChartBar />
            </span>
            <span className={styles.label}>{t('Воронки')}</span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
        )}
        {/* Platform admins: what viewers reported and what was decided about it. */}
        {customer.isAdmin && (
          <NextLink href='/moderation' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <Flag />
            </span>
            <span className={styles.label}>Модерация</span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
        )}
      </div>

      <SectionCaption className={styles.caption}>Ваши данные</SectionCaption>
      <div className={styles.list}>
        <button
          type='button'
          className={styles.row}
          disabled={isExporting}
          onClick={() => void handleExport()}
        >
          <span className={styles.glyph} aria-hidden>
            <DownloadSimple />
          </span>
          <span className={styles.label}>Скачать мои данные</span>
          <span className={styles.value}>{isExporting ? 'Готовим…' : 'JSON'}</span>
        </button>
      </div>
      <p className={styles.footnote}>
        Профиль, записи, отзывы, бонусы, уведомления и избранное одним файлом.
      </p>

      {/* Destructive and quiet: a red glyph and the word right on the page, no group, no tile.
          It signs out at once: a menu of one «Выйти из аккаунта» under «Выйти» was a second tap
          asking the same thing («доп подтверждение сделано плохо»), and signing in again is easy. */}
      <div className={styles.signOut}>
        <button type='button' className={styles.danger} onClick={() => void handleSignOut()}>
          <SignOut aria-hidden />
          {t('Выйти')}
        </button>
        <p className={styles.footnote}>
          {t('Записи, сделанные на этом телефоне, останутся на нём и после выхода.')}
        </p>
      </div>

      {/* Deleting is held, not confirmed in a dialog (HoldButton), and says what happens. */}
      <div className={styles.deleteAccount}>
        <HoldButton
          icon={<UserMinus weight='bold' aria-hidden />}
          disabled={isDeleting}
          onConfirm={() => void handleDelete()}
        >
          Удалить аккаунт
        </HoldButton>
        <p className={styles.footnote}>
          Удалим профиль, фото, вход и уведомления, будущие записи отменим. Прошлые визиты останутся
          в учёте мест, а ваши отзывы будут подписаны «Клиент».
        </p>
      </div>

      {isTuning && <PreferencesSheet initial={preferences} onClose={() => setIsTuning(false)} />}
      {isNaming && (
        <NameDialog
          name={customer.name}
          onClose={() => setIsNaming(false)}
          onSaved={session.setCustomer}
        />
      )}
    </section>
  )
}
