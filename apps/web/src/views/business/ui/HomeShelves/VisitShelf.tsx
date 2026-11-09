'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { formatWeekSchedule, getOpeningStatus } from '@/entities/business'
import type { Business } from '@/shared/api/types'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useToday } from '@/shared/lib/hooks/useToday'
import { StoreCard } from '@/shared/ui/StoreCard/StoreCard'
import { StoreShelf } from '@/shared/ui/StoreShelf/StoreShelf'
import { BranchesMap } from './BranchesMap'
import styles from './HomeShelves.module.css'

interface VisitShelfProps {
  business: Business
}

const toWhatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`

export const VisitShelf = ({ business }: VisitShelfProps) => {
  const today = useToday()
  const schedule = formatWeekSchedule(business.hours)
  const status = today ? getOpeningStatus(business.hours, today.dayKey, today.minutes) : null
  const hasContacts = Boolean(business.phone || business.whatsapp)
  const branches = business.branches ?? []
  const pinned = branches.filter((branch) => branch.latitude !== null && branch.longitude !== null)

  return (
    <StoreShelf id='visit' title='Как нас найти.' subtitle={schedule} label='Контакты' size='wide'>
      {pinned.length > 0 && (
        <li className={styles.mapCard}>
          <BranchesMap business={business} />
        </li>
      )}
      {branches.map((branch) => {
        const directions =
          branch.latitude !== null && branch.longitude !== null
            ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
            : business.mapUrl

        return (
          <li key={branch.id}>
            <StoreCard
              tone='dark'
              height='sm'
              eyebrow={status?.label ?? schedule}
              isHighlighted={status?.isOpen === false}
              title={[business.city, branch.address || business.address].filter(Boolean).join(', ')}
              description={branches.length > 1 ? `Филиал «${branch.name}»` : business.name}
              footer={
                <span className={styles.actions}>
                  {directions && (
                    <ButtonLink
                      variant='primary'
                      size='sm'
                      render={
                        // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                        <a href={directions} target='_blank' rel='noreferrer' />
                      }
                    >
                      Маршрут
                    </ButtonLink>
                  )}
                  {branches.length > 1 && (
                    <ButtonLink
                      variant='secondary'
                      size='sm'
                      render={<NextLink href={`/${business.slug}/book?branch=${branch.id}`} />}
                    >
                      Записаться сюда
                    </ButtonLink>
                  )}
                </span>
              }
            />
          </li>
        )
      })}
      {hasContacts && (
        <li>
          <StoreCard
            height='sm'
            eyebrow='Связь'
            title='Остались вопросы?'
            description='Напишите или позвоните — ответим в рабочее время.'
            footer={
              <span className={styles.actions}>
                {business.whatsapp && (
                  <ButtonLink
                    variant='secondary'
                    size='sm'
                    render={
                      // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                      <a
                        href={toWhatsappHref(business.whatsapp)}
                        target='_blank'
                        rel='noreferrer'
                      />
                    }
                  >
                    WhatsApp
                  </ButtonLink>
                )}
                {business.phone && (
                  <ButtonLink
                    variant='ghost'
                    size='sm'
                    // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                    render={<a href={`tel:${business.phone}`} />}
                  >
                    {formatPhone(business.phone)}
                  </ButtonLink>
                )}
              </span>
            }
          />
        </li>
      )}
    </StoreShelf>
  )
}
