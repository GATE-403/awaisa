'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import { useLingui } from '@lingui/react/macro'
import { ChatCircleText, NavigationArrow, Phone, ShareNetwork } from '@phosphor-icons/react/ssr'
import { type ComponentType, useEffect } from 'react'
import type { Business } from '@/shared/api/types'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { shareLink } from '@/shared/lib/share'
import { trackStep } from '@/shared/lib/telemetry'
import { GlyphButton, GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import styles from './Place.module.css'

interface PlaceActionsProps {
  business: Business
}

type Action = {
  label: string
  icon: ComponentType<{ 'aria-hidden'?: boolean }>
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

// One primary action (book) and the quiet ones beside it: call, write, route, share.
export const PlaceActions = ({ business }: PlaceActionsProps) => {
  const toast = useToast()
  const { t } = useLingui()
  const directions = directionsOf(business)

  useEffect(() => {
    trackStep('business', business.slug)
  }, [business.slug])

  const handleShare = async () => {
    // A sheet that failed or was closed says nothing.
    const result = await shareLink({ title: business.name, url: window.location.href })
    if (result === 'copied') toast.show({ title: t`Link copied`, type: 'success' })
  }

  const actions: Action[] = [
    business.phone ? { label: t`Call`, icon: Phone, href: `tel:${business.phone}` } : null,
    business.whatsapp
      ? {
          label: t({ message: 'Message', context: 'verb: write to someone' }),
          icon: ChatCircleText,
          href: toWhatsappHref(business.whatsapp),
          isExternal: true,
        }
      : null,
    directions
      ? { label: t`Directions`, icon: NavigationArrow, href: directions, isExternal: true }
      : null,
    { label: t`Share`, icon: ShareNetwork, onClick: handleShare },
  ].filter((action) => action !== null)

  return (
    // Across from the logo, like the owner's «Edit»: one primary capsule and the quiet
    // actions as thin glyphs in one capsule of the same height.
    <>
      <ButtonLink
        size='sm'
        data-place-book
        // Opens the booking form itself (the side sheet over this page); scrolling to the menu
        // just below looked like the button did nothing.
        render={<NextLink href={`/${business.slug}/book`} />}
      >
        {t`Book`}
      </ButtonLink>
      <GlyphGroup label={t`Contact`}>
        {actions.map(({ label, icon: ActionIcon, href, onClick, isExternal }) =>
          href ? (
            <a
              key={label}
              href={href}
              className={styles.contactGlyph}
              aria-label={label}
              title={label}
              {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <ActionIcon aria-hidden />
            </a>
          ) : (
            <GlyphButton
              key={label}
              className={styles.contactGlyph}
              icon={<ActionIcon aria-hidden />}
              label={label}
              onClick={onClick}
            />
          ),
        )}
      </GlyphGroup>
    </>
  )
}
