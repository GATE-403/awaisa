'use client'

import { useState } from 'react'
import type { ModerationDecision } from '@/shared/api/types'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { pluralize } from '@/shared/lib/plural'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { CabinetBar } from '@/widgets/CabinetBar'
import { ACTION_LABELS, TARGET_LABELS } from './config/labels'
import styles from './ModerationPage.module.css'
import { type InitialModeration, keyOf, useModeration } from './model/useModeration'
import { QueueItem } from './ui/QueueItem'

interface ModerationPageProps {
  initial: InitialModeration
}

type Tab = 'queue' | 'log'

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIME_ZONE,
})

const describeDecision = (decision: ModerationDecision) =>
  [
    TARGET_LABELS[decision.targetType],
    decision.preview?.business?.name,
    decision.reports ? pluralize(decision.reports, ['жалоба', 'жалобы', 'жалоб']) : null,
    decision.adminName,
  ]
    .filter(Boolean)
    .join(' · ')

// Platform admins work through what viewers reported: the most reported first, each shown as it
// looks on the site, decided with one glyph; the journal keeps what was decided and by whom.
export const ModerationPage = ({ initial }: ModerationPageProps) => {
  const moderation = useModeration(initial)
  const [tab, setTab] = useState<Tab>('queue')

  return (
    <>
      <CabinetBar title='Модерация' />
      <main className={styles.page}>
        <Container size='md' className={styles.content}>
          <PageTitle title='Модерация.' subtitle=' Жалобы на фото, отзывы и профили.' />
          <TextTabs
            label='Модерация'
            items={[
              {
                label: 'Жалобы',
                count: moderation.items.length,
                isActive: tab === 'queue',
                onSelect: () => setTab('queue'),
              },
              { label: 'Журнал', isActive: tab === 'log', onSelect: () => setTab('log') },
            ]}
          />

          {tab === 'queue' &&
            (moderation.items.length === 0 ? (
              <EmptyState
                title={moderation.hasError ? 'Не удалось загрузить' : 'Жалоб нет'}
                text={
                  moderation.hasError
                    ? 'Обновите страницу.'
                    : 'Когда на фото, отзыв или профиль пожалуются, они появятся здесь.'
                }
              />
            ) : (
              <ul className={styles.list} aria-label='Жалобы'>
                {moderation.items.map((item) => (
                  <QueueItem
                    key={keyOf(item)}
                    item={item}
                    isPending={moderation.isPending(item)}
                    onDecide={(action) => void moderation.decide(item, action)}
                  />
                ))}
              </ul>
            ))}

          {tab === 'log' &&
            (moderation.log.length === 0 ? (
              <EmptyState title='Решений пока нет' text='Здесь будет видно, что и кто решил.' />
            ) : (
              <ul className={styles.list} aria-label='Журнал решений'>
                {moderation.log.map((decision) => (
                  <li key={decision.id} className={styles.logRow}>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>
                        {ACTION_LABELS[decision.action]}: {decision.preview?.title ?? 'без превью'}
                      </span>
                      <span className={styles.meta}>{describeDecision(decision)}</span>
                    </span>
                    <time className={styles.time} dateTime={decision.createdAt}>
                      {timeFormatter.format(new Date(decision.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            ))}
        </Container>
      </main>
    </>
  )
}
