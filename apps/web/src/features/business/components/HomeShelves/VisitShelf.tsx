'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import type { Business } from '@/common/api/types'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { useToday } from '@/common/hooks/useToday'
import { formatPhone } from '@/common/utils/formatPhone'
import { formatWeekSchedule, getOpeningStatus } from '@/common/utils/workingHours'
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

  return (
    <StoreShelf id='visit' title='Как нас найти.' subtitle={schedule} label='Контакты' size='wide'>
      <li>
        <StoreCard
          tone='dark'
          height='sm'
          eyebrow={status?.label ?? schedule}
          isHighlighted={status?.isOpen === false}
          title={[business.city, business.address].filter(Boolean).join(', ')}
          description={business.name}
          footer={
            business.mapUrl && (
              <span className={styles.actions}>
                <ButtonLink
                  variant='primary'
                  size='sm'
                  render={
                    // biome-ignore lint/a11y/useAnchorContent: content comes from ButtonLink children via render
                    <a href={business.mapUrl} target='_blank' rel='noreferrer' />
                  }
                >
                  Маршрут
                </ButtonLink>
              </span>
            )
          }
        />
      </li>
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
