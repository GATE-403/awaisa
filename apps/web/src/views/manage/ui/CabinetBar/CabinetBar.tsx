'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { ArrowUpRight, CaretLeft, UserCircle } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { useSession } from '@/entities/session'
import { ThemeToggle } from '@/features/theme'
import { useIsScrolled } from '@/shared/lib/hooks/useIsScrolled'
import styles from './CabinetBar.module.css'

interface CabinetBarProps {
  slug: string
  title: string | null
  isPublished: boolean
}

// The cabinet's own window toolbar (macOS 26): back to the list, the business once scrolled, tools.
export const CabinetBar = ({ slug, title, isPublished }: CabinetBarProps) => {
  const isScrolled = useIsScrolled()
  const { customer } = useSession()

  return (
    <div className={styles.bar} data-scrolled={isScrolled || undefined}>
      <div className={styles.inner}>
        <NextLink href='/manage' className={styles.back}>
          <CaretLeft weight='bold' aria-hidden />
          Все бизнесы
        </NextLink>
        <p className={styles.title} aria-hidden={!isScrolled}>
          {title}
          {!isPublished && <span className={styles.hidden}> · скрыта</span>}
        </p>
        <div className={styles.tools}>
          <ButtonLink
            variant='secondary'
            size='sm'
            className={styles.open}
            render={<NextLink href={`/${slug}`} target='_blank' />}
          >
            Страница
            <ArrowUpRight weight='bold' aria-hidden />
          </ButtonLink>
          <span className={styles.group}>
            <ThemeToggle />
            <NextLink
              href='/bookings'
              className={styles.account}
              aria-label={customer ? `Профиль: ${customer.name || customer.phone}` : 'Профиль'}
            >
              <UserCircle weight='fill' aria-hidden />
            </NextLink>
          </span>
        </div>
      </div>
    </div>
  )
}
