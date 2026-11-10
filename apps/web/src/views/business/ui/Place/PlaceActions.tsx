'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { ChatCircleText, NavigationArrow, Phone, ShareNetwork } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { ComponentType } from 'react'
import type { Business } from '@/shared/api/types'
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

// One primary action (book) and the Maps-style row of quick ones under it.
export const PlaceActions = ({ business }: PlaceActionsProps) => {
  const toast = useToast()
  const directions = directionsOf(business)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: business.name, url }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(url)
    toast.show({ title: 'Ссылка скопирована', type: 'success' })
  }

  const actions: Action[] = [
    business.phone ? { label: 'Позвонить', icon: Phone, href: `tel:${business.phone}` } : null,
    business.whatsapp
      ? {
          label: 'Написать',
          icon: ChatCircleText,
          href: toWhatsappHref(business.whatsapp),
          isExternal: true,
        }
      : null,
    directions
      ? { label: 'Маршрут', icon: NavigationArrow, href: directions, isExternal: true }
      : null,
    { label: 'Поделиться', icon: ShareNetwork, onClick: handleShare },
  ].filter((action) => action !== null)

  return (
    <div className={styles.actions}>
      <ButtonLink
        size='lg'
        className={styles.bookButton}
        render={<NextLink href={`/${business.slug}/book`} />}
      >
        Записаться
      </ButtonLink>
      <ul className={styles.quickActions}>
        {actions.map(({ label, icon: ActionIcon, href, onClick, isExternal }) => (
          <li key={label}>
            {href ? (
              <a
                href={href}
                className={styles.quickAction}
                {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <ActionIcon weight='fill' aria-hidden />
                {label}
              </a>
            ) : (
              <button type='button' className={styles.quickAction} onClick={onClick}>
                <ActionIcon weight='fill' aria-hidden />
                {label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
