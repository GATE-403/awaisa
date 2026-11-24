'use client'

import { useState } from 'react'
import type { ModerationDecision } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { Container } from '@/shared/ui/Container/Container'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { TextTabs } from '@/shared/ui/TextTabs/TextTabs'
import { CabinetBar } from '@/widgets/CabinetBar'
import { ACTION_LABELS, TARGET_LABELS } from './config/labels'
import { countReports } from './lib/describe'
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

const describeDecision = (decision: ModerationDecision, t: Translate) =>
  [
    t(TARGET_LABELS[decision.targetType]),
    decision.preview?.business?.name,
    decision.reports ? countReports(decision.reports, t) : null,
    decision.adminName,
  ]
    .filter(Boolean)
    .join(' · ')

// Platform admins work through what viewers reported: the most reported first, each shown as it
// looks on the site, decided with one glyph; the journal keeps what was decided and by whom.
export const ModerationPage = ({ initial }: ModerationPageProps) => {
  const t = useT()
  const moderation = useModeration(initial)
  const [tab, setTab] = useState<Tab>('queue')

  return (
    <>
      <CabinetBar title={t('Moderation')} />
      <main className={styles.page}>
        <Container size='md' className={styles.content}>
          <PageTitle
            title={t('Moderation.')}
            subtitle={t(' Reports on photos, reviews and profiles.')}
          />
          <TextTabs
            label={t('Moderation')}
            items={[
              {
                label: t('Reports'),
                count: moderation.items.length,
                isActive: tab === 'queue',
                onSelect: () => setTab('queue'),
              },
              { label: t('Log'), isActive: tab === 'log', onSelect: () => setTab('log') },
            ]}
          />

          {tab === 'queue' &&
            (moderation.items.length === 0 ? (
              <EmptyState
                title={t(moderation.hasError ? 'Couldn’t load' : 'No reports')}
                text={t(
                  moderation.hasError
                    ? 'Reload the page.'
                    : 'When someone reports a photo, review or profile, it shows up here.',
                )}
              />
            ) : (
              <ul className={styles.list} aria-label={t('Reports')}>
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
              <EmptyState
                title={t('No decisions yet')}
                text={t('Here you’ll see what was decided and by whom.')}
              />
            ) : (
              <ul className={styles.list} aria-label={t('Decision log')}>
                {moderation.log.map((decision) => (
                  <li key={decision.id} className={styles.logRow}>
                    <span className={styles.itemBody}>
                      <span className={styles.itemTitle}>
                        {t(ACTION_LABELS[decision.action])}:{' '}
                        {decision.preview?.title ?? t('no preview')}
                      </span>
                      <span className={styles.meta}>{describeDecision(decision, t)}</span>
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
