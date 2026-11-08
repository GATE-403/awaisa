'use client'

import { ButtonLink } from '@awaisa/ui/Button'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import { useToday } from '@/common/hooks/useToday'
import { getOpeningStatus } from '@/common/utils/openingHours'
import { COMPANY } from '@/constants/company'
import styles from './HomeShelves.module.css'

export const VisitShelf = () => {
  const today = useToday()
  const status = today ? getOpeningStatus(today.minutes) : null

  return (
    <StoreShelf
      id='visit'
      title='Как нас найти.'
      subtitle={COMPANY.hours}
      label='Контакты'
      size='wide'
    >
      <li>
        <StoreCard
          tone='dark'
          height='sm'
          eyebrow={status?.label ?? COMPANY.hours}
          isHighlighted={status?.isOpen === false}
          title={COMPANY.address}
          description={`${COMPANY.name} · рейтинг ${COMPANY.rating.toFixed(1)}, ${COMPANY.reviewsCount} отзывов`}
          footer={
            <span className={styles.actions}>
              <ButtonLink
                variant='primary'
                size='sm'
                render={
                  // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
                  <a href={COMPANY.mapUrl} target='_blank' rel='noreferrer' />
                }
              >
                Маршрут
              </ButtonLink>
            </span>
          }
        />
      </li>
      <li>
        <StoreCard
          height='sm'
          eyebrow='Связь'
          title='Остались вопросы?'
          description='Ответим в WhatsApp или по телефону в рабочее время.'
          footer={
            <span className={styles.actions}>
              <ButtonLink
                variant='secondary'
                size='sm'
                render={
                  // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
                  <a href={COMPANY.whatsappHref} target='_blank' rel='noreferrer' />
                }
              >
                WhatsApp
              </ButtonLink>
              <ButtonLink
                variant='ghost'
                size='sm'
                // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
                render={<a href={COMPANY.phoneHref} />}
              >
                {COMPANY.phone}
              </ButtonLink>
            </span>
          }
        />
      </li>
    </StoreShelf>
  )
}
