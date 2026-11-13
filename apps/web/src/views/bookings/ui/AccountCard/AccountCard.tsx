'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { useToast } from '@awaisa/ui/Toast'
import { CalendarCheck, Camera, CaretRight, Storefront, Trash } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ChangeEvent, useRef, useState } from 'react'
import { BusinessTile, monogramTint, PersonAvatar } from '@/entities/business'
import { useSession } from '@/entities/session'
import { getErrorMessage } from '@/shared/api/apiError'
import { removeAvatar, uploadAvatar } from '@/shared/api/clientApi'
import type { Booking } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { pluralWord } from '@/shared/lib/plural'
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
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const customer = session.customer
  const places = new Set(bookings.map((booking) => booking.business.slug)).size
  // Bold number, quiet word.
  const stats = [
    visits > 0 && { value: visits, label: pluralWord(visits, ['визит', 'визита', 'визитов']) },
    places > 0 && { value: places, label: pluralWord(places, ['место', 'места', 'мест']) },
  ].filter((stat): stat is { value: number; label: string } => Boolean(stat))

  if (session.status === 'loading') return <div className={styles.placeholder} />

  if (!customer) {
    return (
      <section className={styles.header} aria-label='Профиль'>
        <h1 className={styles.name}>Ваши записи</h1>
        <p className={styles.handle}>Только на этом телефоне — войдите, будут везде</p>
        <ButtonLink size='sm' render={<NextLink href='/login?next=/bookings' />}>
          Войти
        </ButtonLink>
      </section>
    )
  }

  const displayName = customer.name || 'Без имени'
  const businesses = customer.businesses ?? []
  const masterOf = customer.masterOf ?? []
  const hasCabinet = businesses.length > 0 || customer.isAdmin
  const cabinetHref =
    businesses.length === 1 && !customer.isAdmin ? `/manage/${businesses[0]?.slug}` : '/manage'
  const cabinetName =
    businesses.length === 1 ? businesses[0]?.name : `${businesses.length || 'Все'} бизнесы`

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
        title: 'Фото не сохранилось',
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

  const face = (
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

  return (
    <section className={styles.header} aria-label='Профиль'>
      {customer.avatarUrl ? (
        <Menu label='Фото профиля' className={styles.faceButton} trigger={face}>
          <MenuItem icon={<Camera aria-hidden />} onClick={() => fileInput.current?.click()}>
            Выбрать фото
          </MenuItem>
          <MenuItem
            variant='danger'
            icon={<Trash aria-hidden />}
            onClick={() => void setAvatar(null)}
          >
            Удалить фото
          </MenuItem>
        </Menu>
      ) : (
        <button
          type='button'
          className={styles.faceButton}
          onClick={() => fileInput.current?.click()}
          aria-label='Добавить фото профиля'
        >
          {face}
        </button>
      )}
      <input
        ref={fileInput}
        type='file'
        accept={ACCEPT}
        hidden
        aria-label='Файл фото профиля'
        onChange={handleFile}
      />

      <h1 className={styles.name}>{displayName}</h1>
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

      {/* Where the person works, as capsules right under their name — not a lone row. */}
      {(hasCabinet || masterOf.length > 0) && (
        <div className={styles.shortcuts}>
          {hasCabinet && (
            <NextLink href={cabinetHref} className={styles.shortcut}>
              {businesses.length === 1 && businesses[0] ? (
                <BusinessTile name={businesses[0].name} size='xs' />
              ) : (
                <Storefront weight='fill' aria-hidden className={styles.shortcutIcon} />
              )}
              Кабинет
              <span className={styles.shortcutValue}>{cabinetName}</span>
              <CaretRight weight='bold' aria-hidden className={styles.shortcutChevron} />
            </NextLink>
          )}
          {masterOf.length > 0 && (
            <NextLink
              href={masterOf.length === 1 ? `/master/${masterOf[0]?.slug}` : '/master'}
              className={styles.shortcut}
            >
              <CalendarCheck weight='fill' aria-hidden className={styles.shortcutIcon} />
              Мой день
              <CaretRight weight='bold' aria-hidden className={styles.shortcutChevron} />
            </NextLink>
          )}
        </div>
      )}
    </section>
  )
}
