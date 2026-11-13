'use client'

import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import {
  CalendarCheck,
  CaretRight,
  CircleHalf,
  Phone,
  PlusCircle,
  SignOut,
  Sparkle,
  Storefront,
  User,
} from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/entities/session'
import { INTERESTS, PreferencesSheet, usePreferences } from '@/features/forYou'
import { getMasterPlaces } from '@/shared/api/clientApi'
import type { MasterPlace } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import type { Theme } from '@/shared/lib/theme'
import { NameDialog } from '../NameDialog'
import styles from './AccountSettings.module.css'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлое' },
  { value: 'dark', label: 'Тёмное' },
]

// The account's settings right on the profile, at its foot like iOS Settings — no sheet to open:
// name and number, the theme, the business side, and signing out.
interface AccountSettingsProps {
  /** Inside the «Настройки» tab the tab names it. */
  isTitleHidden?: boolean
}

export const AccountSettings = ({ isTitleHidden = false }: AccountSettingsProps) => {
  const session = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [places, setPlaces] = useState<MasterPlace[]>([])
  const [isNaming, setIsNaming] = useState(false)
  const [isTuning, setIsTuning] = useState(false)
  const preferences = usePreferences()
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
          ? 'Женщине'
          : preferences.gender === 'male'
            ? 'Мужчине'
            : null,
        preferences.interests
          .slice(0, 2)
          .map((value) => INTERESTS.find((item) => item.value === value)?.label.toLowerCase())
          .filter(Boolean)
          .join(', ') || null,
        preferences.budget ? `до ${preferences.budget.toLocaleString('ru-RU')}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Без предпочтений'
    : 'Не настроено'

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  return (
    <section className={styles.settings} aria-labelledby='settings-title'>
      <h2 id='settings-title' className={styles.title} data-hidden={isTitleHidden || undefined}>
        Настройки
      </h2>

      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsNaming(true)}>
          <span className={styles.glyph} data-tone='gray' aria-hidden>
            <User weight='fill' />
          </span>
          <span className={styles.label}>Имя</span>
          <span className={styles.value}>{customer.name || 'Указать'}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </button>
        <div className={styles.row}>
          <span className={styles.glyph} data-tone='green' aria-hidden>
            <Phone weight='fill' />
          </span>
          <span className={styles.label}>Телефон</span>
          <span className={styles.value}>{formatPhone(customer.phone)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.glyph} data-tone='blue' aria-hidden>
            <CircleHalf weight='fill' />
          </span>
          <span className={styles.label}>Оформление</span>
          <Select
            variant='plain'
            aria-label='Оформление'
            items={THEMES}
            value={theme}
            onValueChange={(value) => value && setTheme(value as Theme)}
          />
        </div>
      </div>

      <h3 className={styles.groupTitle}>Подборка</h3>
      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsTuning(true)}>
          <span className={styles.glyph} data-tone='orange' aria-hidden>
            <Sparkle weight='fill' />
          </span>
          <span className={styles.label}>Для вас</span>
          <span className={styles.value}>{tasteSummary}</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </button>
      </div>
      <p className={styles.footnote}>
        Для кого, что интересно и бюджет: по ним подбираем услуги в каталоге и после записи.
      </p>

      <h3 className={styles.groupTitle}>Бизнес</h3>
      <div className={styles.list}>
        {places.length > 0 && (
          <NextLink href='/master' className={styles.row}>
            <span className={styles.glyph} data-tone='green' aria-hidden>
              <CalendarCheck weight='fill' />
            </span>
            <span className={styles.label}>Мой день</span>
            <span className={styles.value}>
              {places.length === 1 ? places[0]?.businessName : `${places.length} места`}
            </span>
            <CaretRight className={styles.chevron} weight='bold' aria-hidden />
          </NextLink>
        )}
        <NextLink href='/manage' className={styles.row}>
          <span className={styles.glyph} data-tone='blue' aria-hidden>
            <Storefront weight='fill' />
          </span>
          <span className={styles.label}>Мои бизнесы</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </NextLink>
        <NextLink href='/business/new' className={styles.row}>
          <span className={styles.glyph} data-tone='orange' aria-hidden>
            <PlusCircle weight='fill' />
          </span>
          <span className={styles.label}>Подключить бизнес</span>
          <CaretRight className={styles.chevron} weight='bold' aria-hidden />
        </NextLink>
      </div>

      {/* Destructive, as on iOS: a red row, and a confirmation by the row before it happens. */}
      <div className={styles.list}>
        <Menu
          label='Выйти'
          className={styles.danger}
          trigger={
            <>
              <span className={styles.glyph} data-tone='red' aria-hidden>
                <SignOut weight='bold' />
              </span>
              <span className={styles.label}>Выйти</span>
            </>
          }
        >
          <MenuItem
            variant='danger'
            icon={<SignOut aria-hidden />}
            onClick={() => void handleSignOut()}
          >
            Выйти из аккаунта
          </MenuItem>
        </Menu>
      </div>
      <p className={styles.footnote}>
        Записи, сделанные на этом телефоне, останутся на нём и после выхода.
      </p>

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
