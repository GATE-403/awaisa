'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarCheck, Camera, CaretRight, GearSix, Trash } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'
import { monogramTint, PersonAvatar } from '@/entities/business'
import { ProfileHead, ProfileHeadText, profileStyle } from '@/entities/profile'
import { useSession } from '@/entities/session'
import { useMyProfile } from '@/features/profileStyle'
import { getErrorMessage } from '@/shared/api/apiError'
import { removeAvatar, uploadAvatar } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { Mascot } from '@/shared/ui/Mascot/Mascot'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import settings from '../AccountSettings/AccountSettings.module.css'
import styles from './AccountCard.module.css'

interface AccountCardProps {
  /** Past and upcoming visits, for the one-line stats under the name. */
  bookings: Booking[]
  visits: number
  /** The gear at the row's end: the account's settings, a screen of their own. */
  onOpenSettings?: () => void
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// The account as one row above the records: the face (a tap changes the photo), the name and one
// line of facts - the rest of the row opens «Мой профиль» - and a gear for the settings at its
// end. The records lead the page; the account no longer pushes them down («профиль должен быть
// самой удобной частью»). The cabinet lives in the tab bar; masters keep «Мой день» here.
export const AccountCard = ({ bookings, visits, onOpenSettings }: AccountCardProps) => {
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
      // A guest's row like the signed-in account's: the mascot where the face would be, what
      // these records are and «Войти» at the row's end - not a centred title over the records.
      <section className={styles.guest} aria-label={t('Профиль')} style={look}>
        <span className={styles.guestFace} aria-hidden>
          <Mascot />
        </span>
        <span className={styles.guestText}>
          <h1 className={styles.guestTitle}>{t('Ваши записи')}</h1>
          <span className={styles.guestNote}>
            {t('Только на этом телефоне - войдите, будут везде')}
          </span>
        </span>
        <ButtonLink size='sm' render={<NextLink href='/login?next=/bookings' />}>
          {t('Войти')}
        </ButtonLink>
      </section>
    )
  }

  const displayName = customer.name || t('Без имени')
  const masterOf = customer.masterOf ?? []

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
  // The same head as the profile itself (`ProfileHead`): the name with the status emoji over
  // one quiet line «Уровень 4 · 20 визитов · 13 мест» («оставь один дизайн»).
  const meta = [
    ...(level ? [t('Уровень {level}', { level })] : []),
    ...stats.map((stat) => `${stat.value} ${stat.label}`),
  ].join(' · ')
  const identity = (
    <>
      <span className={styles.identity}>
        {/* The name heads the page, like the Apple Account row heads Settings. */}
        <ProfileHeadText
          isHeading
          name={displayName}
          emoji={myProfile.settings?.statusEmoji}
          meta={meta || undefined}
        />
      </span>
      {profileHref && (
        <CaretRight className={`${settings.chevron} ${styles.accountChevron}`} aria-hidden />
      )}
    </>
  )

  return (
    <section className={styles.header} aria-label={t('Профиль')}>
      {/* Like the Apple Account row at the top of Settings: the face (a tap changes the photo),
          then the name, number and one line of facts; the rest of the row opens the profile. */}
      <div className={`${settings.list} ${styles.plain}`}>
        <ProfileHead
          className={styles.account}
          face={
            customer.avatarUrl ? (
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
            )
          }
          end={
            onOpenSettings && (
              <button
                type='button'
                className={styles.gear}
                onClick={onOpenSettings}
                aria-label={t('Настройки')}
                title={t('Настройки')}
              >
                <GearSix aria-hidden />
              </button>
            )
          }
        >
          {profileHref ? (
            <NextLink href={profileHref} className={styles.accountLink}>
              {identity}
              <span className={styles.srOnly}>{t('Мой профиль')}</span>
            </NextLink>
          ) : (
            <div className={styles.accountLink}>{identity}</div>
          )}
        </ProfileHead>
      </div>
      <input
        ref={fileInput}
        type='file'
        accept={ACCEPT}
        hidden
        aria-label={t('Файл фото профиля')}
        onChange={handleFile}
      />

      {/* A master's day as a Settings row (owners reach the cabinet from the tab bar). */}
      {masterOf.length > 0 && (
        <div className={`${settings.list} ${styles.plain}`}>
          {masterOf.length > 0 && (
            <NextLink href={masterHref} className={settings.row}>
              <span className={settings.glyph} aria-hidden>
                <CalendarCheck />
              </span>
              <span className={settings.label}>{t('Мой день')}</span>
              {masterOf.length === 1 && <span className={settings.value}>{masterOf[0]?.name}</span>}
              <CaretRight className={settings.chevron} aria-hidden />
            </NextLink>
          )}
        </div>
      )}
    </section>
  )
}
