'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import {
  CalendarCheck,
  Camera,
  IdentificationBadge,
  Storefront,
  Trash,
} from '@phosphor-icons/react/ssr'
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
import styles from './AccountCard.module.css'

interface AccountCardProps {
  /** Past and upcoming visits, for the one-line stats under the name. */
  bookings: Booking[]
  visits: number
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

// The account like Apple Account in Settings: the face in the middle (a tap changes the photo),
// name and number under it, a quiet line of stats, then an inset group of rows — the cabinet for
// owners, «Мой день» for masters, and settings.
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
      <section className={styles.header} aria-label={t('Профиль')} style={look}>
        <h1 className={styles.name}>{t('Ваши записи')}</h1>
        <p className={styles.handle}>{t('Только на этом телефоне — войдите, будут везде')}</p>
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

  return (
    <section className={styles.header} aria-label={t('Профиль')}>
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
      <input
        ref={fileInput}
        type='file'
        accept={ACCEPT}
        hidden
        aria-label={t('Файл фото профиля')}
        onChange={handleFile}
      />

      <h1 className={styles.name}>{displayName}</h1>
      {(myProfile.settings?.status || myProfile.settings?.statusEmoji) && (
        <p className={styles.status}>
          {myProfile.settings.statusEmoji} {myProfile.settings.status}
        </p>
      )}
      <p className={styles.handle}>{formatPhone(customer.phone)}</p>
      {stats.length > 0 && (
        <p className={styles.stats}>
          {stats.map((stat, index) => (
            <span key={stat.label}>
              {index > 0 && <span className={styles.dot}> · </span>}
              <strong>{stat.value}</strong> {stat.label}
            </span>
          ))}
        </p>
      )}

      {myProfile.profile && (
        <p className={styles.level}>
          {t('Уровень {level}', { level: myProfile.profile.level.level })}
        </p>
      )}

      {/* Small secondary capsules of one height, centred on the column's axis under the face. */}
      {(isCabinetShown || masterOf.length > 0 || myProfile.settings) && (
        <div className={styles.shortcuts}>
          {myProfile.settings && (
            <ButtonLink
              variant='secondary'
              size='sm'
              render={
                <NextLink href={`/u/${myProfile.settings.handle ?? myProfile.settings.id}`} />
              }
            >
              <IdentificationBadge aria-hidden />
              {t('Мой профиль')}
            </ButtonLink>
          )}
          {isCabinetShown && (
            <ButtonLink variant='secondary' size='sm' render={<NextLink href={cabinetHref} />}>
              <Storefront aria-hidden />
              {t('Кабинет')}
              <span className={styles.srOnly}> · {cabinetName}</span>
            </ButtonLink>
          )}
          {masterOf.length > 0 && (
            <ButtonLink
              variant='secondary'
              size='sm'
              render={
                <NextLink
                  href={masterOf.length === 1 ? `/master/${masterOf[0]?.slug}` : '/master'}
                />
              }
            >
              <CalendarCheck aria-hidden />
              {t('Мой день')}
            </ButtonLink>
          )}
        </div>
      )}
    </section>
  )
}
