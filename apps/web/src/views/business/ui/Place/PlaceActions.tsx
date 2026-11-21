'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircleText, NavigationArrow, Phone, ShareNetwork } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { type ComponentType, useEffect } from 'react'
import type { Business } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { trackStep } from '@/shared/lib/telemetry'
import styles from './Place.module.css'

interface PlaceActionsProps {
  business: Business
}

type Action = {
  label: string
  icon: ComponentType<{ weight?: 'fill'; 'aria-hidden'?: boolean }>
  href?: string
  onClick?: () => void
  isExternal?: boolean
}

const toWhatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`

const directionsOf = (business: Business) => {
  const pinned = business.branches.find(
    (branch) => branch.latitude !== null && branch.longitude !== null,
  )
  if (pinned) {
    return `https://www.google.com/maps/dir/?api=1&destination=${pinned.latitude},${pinned.longitude}`
  }
  return business.mapUrl || null
}

// One primary action (book) and quiet secondary ones beside it.
export const PlaceActions = ({ business }: PlaceActionsProps) => {
  const toast = useToast()
  const t = useT()
  const directions = directionsOf(business)

  useEffect(() => {
    trackStep('business', business.slug)
  }, [business.slug])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: business.name, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    toast.show({ title: t('Ссылка скопирована'), type: 'success' })
  }

  const actions: Action[] = [
    business.phone ? { label: t('Позвонить'), icon: Phone, href: `tel:${business.phone}` } : null,
    business.whatsapp
      ? {
          label: t('Написать'),
          icon: ChatCircleText,
          href: toWhatsappHref(business.whatsapp),
          isExternal: true,
        }
      : null,
    directions
      ? { label: t('Маршрут'), icon: NavigationArrow, href: directions, isExternal: true }
      : null,
    { label: t('Поделиться'), icon: ShareNetwork, onClick: handleShare },
  ].filter((action) => action !== null)

  return (
    // Across from the tile, like a profile's buttons: round glyph buttons, then one primary capsule.
    <div className={styles.actions}>
      <ul className={styles.quickActions}>
        {actions.map(({ label, icon: ActionIcon, href, onClick, isExternal }) => (
          <li key={label}>
            {href ? (
              <a
                href={href}
                className={styles.quickAction}
                aria-label={label}
                title={label}
                {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <ActionIcon weight='fill' aria-hidden />
              </a>
            ) : (
              <button
                type='button'
                className={styles.quickAction}
                aria-label={label}
                title={label}
                onClick={onClick}
              >
                <ActionIcon weight='fill' aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      <ButtonLink
        size='md'
        className={styles.bookButton}
        data-place-book
        // Opens the booking form itself (the side sheet over this page); scrolling to the menu
        // just below looked like the button did nothing.
        render={<NextLink href={`/${business.slug}/book`} />}
      >
        {t('Записаться')}
      </ButtonLink>
    </div>
  )
}
