import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { UPDATES, type UpdateAudience } from '@/shared/config/updates'
import { formatDate } from '@/shared/i18n/format'
import { DEFAULT_LOCALE, isLocale } from '@/shared/i18n/locales'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from './UpdatesPage.module.css'
import { BackToCabinet } from './ui/BackToCabinet'
import { MarkUpdatesSeen } from './ui/MarkUpdatesSeen'

const AUDIENCE_LABELS: Record<UpdateAudience, MessageDescriptor | null> = {
  clients: msg`For clients`,
  business: msg`For business`,
  everyone: null,
}

// Day keys are calendar days: read them at noon UTC so no clock moves them to the day before.
const formatDay = (key: string, locale: string) =>
  formatDate(isLocale(locale) ? locale : DEFAULT_LOCALE, `${key}T12:00:00Z`, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })

// The days in order, each with what changed that day.
const groupByDay = () => {
  const days = new Map<string, typeof UPDATES>()
  for (const entry of UPDATES) days.set(entry.date, [...(days.get(entry.date) ?? []), entry])
  return [...days.entries()]
}

// "What's new": one quiet column like the profile - a caption per day, then each change as a
// title and a line or two, with a link to try it.
export const UpdatesPage = () => {
  const { t, i18n } = useLingui()

  return (
    <main className={styles.page}>
      <BackToCabinet />
      <MarkUpdatesSeen />
      <div className={styles.column}>
        <header className={styles.head}>
          <PageTitle title={t`What's new.`} subtitle={t`Awaisa updates.`} />
        </header>
        {groupByDay().map(([day, entries]) => (
          <section key={day} className={styles.day} aria-labelledby={`day-${day}`}>
            <SectionCaption as='h2' id={`day-${day}`} isInset={false}>
              {formatDay(day, i18n.locale)}
            </SectionCaption>
            <ul className={styles.list}>
              {entries.map((entry) => {
                const audience = AUDIENCE_LABELS[entry.audience]
                return (
                  <li key={entry.id} className={styles.entry}>
                    <h3 className={styles.title}>{entry.title}</h3>
                    <p className={styles.text}>{entry.text}</p>
                    {(audience || entry.link) && (
                      <p className={styles.meta}>
                        {audience && <span className={styles.audience}>{t(audience)}</span>}
                        {entry.link && (
                          <NextLink href={entry.link.href} className={styles.link}>
                            {entry.link.label} ›
                          </NextLink>
                        )}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
