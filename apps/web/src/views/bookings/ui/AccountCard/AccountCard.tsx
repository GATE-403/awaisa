'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarCheck, Camera, CaretRight, Storefront, Trash } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { profileStyle } from '@/entities/profile'
import { getCabinetHref, hasCabinet, useSession } from '@/entities/session'
import { useMyProfile } from '@/features/profileStyle'
import { getErrorMessage } from '@/shared/api/apiError'
import { removeAvatar, uploadAvatar } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { formatPhone } from '@/shared/lib/formatPhone'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import settings from '../AccountSettings/AccountSettings.module.css'
import styles from './AccountCard.module.css'

interface AccountCardProps {
  /** Past and upcoming visits, for the one-line stats under the name. */
  bookings: Booking[]
  visits: number
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// The account like the Apple Account row at the top of iOS Settings: one inset row with the face,
// the name, number and facts (it opens «Мой профиль»), then Settings rows for the cabinet and
// «Мой день». The centred face with two capsules under it asked for a redesign.
export const AccountCard = ({ bookings, visits }: AccountCardProps) => {
  const session = useSession()
  const t = useT()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const myProfile = useMyProfile(session.status === 'signedIn')
  const look = myProfile.settings ? profileStyle(myProfile.settings.accent) : undefined
  const customer = session.customer
  const places = new Set(bookings.map((booking) => booking.business.slug)).size
  // Bold number, quiet word.
  const countWord = (count: number, forms: [string, string, string]) =>
    t.count(count, forms).replace(/^\d+ /, '')
  const stats = [
    visits > 0 && { value: visits, label: countWord(visits, ['визит', 'визита', 'визитов']) },
    places > 0 && { value: places, label: countWord(places, ['место', 'места', 'мест']) },
  ].filter((stat): stat is { value: number; label: string } => Boolean(stat))

  if (session.status === 'loading') return <div className={styles.placeholder} />

  if (!customer) {
    return (
      <section className={styles.guest} aria-label={t('Профиль')} style={look}>
        <h1 className={styles.guestTitle}>{t('Ваши записи')}</h1>
        <p className={styles.guestText}>{t('Только на этом телефоне — войдите, будут везде')}</p>
        <ButtonLink size='sm' render={<NextLink href='/login?next=/bookings' />}>
          {t('Войти')}
        </ButtonLink>
      </section>
    )
  }

  const displayName = customer.name || t('Без имени')
  const businesses = customer.businesses ?? []
  const masterOf = customer.masterOf ?? []
  const isCabinetShown = hasCabinet(customer)
  const cabinetHref = getCabinetHref(customer)
  const cabinetName =
    businesses.length === 1
      ? businesses[0]?.name
      : businesses.length
        ? t('{count} бизнесы', { count: businesses.length })
        : t('Все бизнесы')

  const setAvatar = async (file: File | null) => {
    setIsUploading(true)
    try {
      if (file) {
        const { avatarUrl } = await uploadAvatar(file)
        session.setCustomer({ ...customer, avatarUrl })
      } else {
        await removeAvatar()
        session.setCustomer({ ...customer, avatarUrl: null })
      }
    } catch (error) {
      toast.show({
        title: t('Фото не сохранилось'),
        description: getErrorMessage(error),
        type: 'error',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void setAvatar(file)
  }

  const rank = myProfile.profile?.rank ?? null
  const plainFace = (
    <span
      className={styles.face}
      style={monogramTint(displayName)}
      data-busy={isUploading || undefined}
    >
      <PersonAvatar
        name={customer.name || customer.phone.slice(-2)}
        src={customer.avatarUrl ?? undefined}
        size='xl'
        className={styles.avatar}
      />
      <span className={styles.camera} aria-hidden>
        <Camera weight='fill' />
      </span>
    </span>
  )
  // One of the platform's three most active clients: their face in a laurel wreath.
  const face = rank ? (
    <Wreath rank={rank} className={styles.wreath}>
      {plainFace}
    </Wreath>
  ) : (
    plainFace
  )

  const profileHref = myProfile.settings
    ? `/u/${myProfile.settings.handle ?? myProfile.settings.id}`
    : null
  const level = myProfile.profile?.level.level
  const masterHref = masterOf.length === 1 ? `/master/${masterOf[0]?.slug}` : '/master'
  const identity = (
    <>
      <div className={styles.identity}>
        <h1 className={styles.name}>{displayName}</h1>
        {(myProfile.settings?.status || myProfile.settings?.statusEmoji) && (
          <span className={styles.status}>
            {myProfile.settings.statusEmoji} {myProfile.settings.status}
          </span>
        )}
        <span className={styles.handle}>{formatPhone(customer.phone)}</span>
        {(stats.length > 0 || level) && (
          <span className={styles.stats}>
            {stats.map((stat, index) => (
              <span key={stat.label}>
                {index > 0 && <span className={styles.dot}> · </span>}
                <strong>{stat.value}</strong> {stat.label}
              </span>
            ))}
            {level && (
              <>
                {stats.length > 0 && <span className={styles.dot}> · </span>}
                <span className={styles.level}>{t('Уровень {level}', { level })}</span>
              </>
            )}
          </span>
        )}
      </div>
      {profileHref && <CaretRight className={settings.chevron} weight='bold' aria-hidden />}
    </>
  )

  return (
    <section className={styles.header} aria-label={t('Профиль')}>
      {/* Like the Apple Account row at the top of Settings: the face (a tap changes the photo),
          then the name, number and one line of facts; the rest of the row opens the profile. */}
      <div className={`${settings.list} ${styles.plain}`}>
        <div className={styles.account}>
          {customer.avatarUrl ? (
            <Menu label={t('Фото профиля')} className={styles.faceButton} trigger={face}>
              <MenuItem icon={<Camera aria-hidden />} onClick={() => fileInput.current?.click()}>
                {t('Выбрать фото')}
              </MenuItem>
              <MenuItem
                variant='danger'
                icon={<Trash aria-hidden />}
                onClick={() => void setAvatar(null)}
              >
                {t('Удалить фото')}
              </MenuItem>
            </Menu>
          ) : (
            <button
              type='button'
              className={styles.faceButton}
              onClick={() => fileInput.current?.click()}
              aria-label={t('Добавить фото профиля')}
            >
              {face}
            </button>
          )}
          {profileHref ? (
            <NextLink href={profileHref} className={styles.accountLink}>
              {identity}
              <span className={styles.srOnly}>{t('Мой профиль')}</span>
            </NextLink>
          ) : (
            <div className={styles.accountLink}>{identity}</div>
          )}
        </div>
      </div>
      <input
        ref={fileInput}
        type='file'
        accept={ACCEPT}
        hidden
        aria-label={t('Файл фото профиля')}
        onChange={handleFile}
      />

      {/* Work places as Settings rows, the same as the settings under them: a thin glyph, the
          label, what it opens on the right, a chevron. */}
      {(isCabinetShown || masterOf.length > 0) && (
        <div className={`${settings.list} ${styles.plain}`}>
          {isCabinetShown && (
            <NextLink href={cabinetHref} className={settings.row}>
              <span className={settings.glyph} aria-hidden>
                <Storefront />
              </span>
              <span className={settings.label}>{t('Кабинет')}</span>
              <span className={settings.value}>{cabinetName}</span>
              <CaretRight className={settings.chevron} weight='bold' aria-hidden />
            </NextLink>
          )}
          {masterOf.length > 0 && (
            <NextLink href={masterHref} className={settings.row}>
              <span className={settings.glyph} aria-hidden>
                <CalendarCheck />
              </span>
              <span className={settings.label}>{t('Мой день')}</span>
              {masterOf.length === 1 && <span className={settings.value}>{masterOf[0]?.name}</span>}
              <CaretRight className={settings.chevron} weight='bold' aria-hidden />
            </NextLink>
          )}
        </div>
      )}
    </section>
  )
}
