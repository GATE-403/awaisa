import NextLink from 'next/link'
import { UPDATES, type UpdateAudience } from '@/shared/config/updates'
import { PageTitle } from '@/shared/ui/PageTitle/PageTitle'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import styles from './UpdatesPage.module.css'
import { BackToCabinet } from './ui/BackToCabinet'
import { MarkUpdatesSeen } from './ui/MarkUpdatesSeen'

const AUDIENCE_LABELS: Record<UpdateAudience, string | null> = {
  clients: 'Для клиентов',
  business: 'For business',
  everyone: null,
}

// Day keys are calendar days: read them at noon UTC so no clock moves them to the day before.
const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const formatDay = (key: string) => dayFormatter.format(new Date(`${key}T12:00:00Z`))

// The days in order, each with what changed that day.
const groupByDay = () => {
  const days = new Map<string, typeof UPDATES>()
  for (const entry of UPDATES) days.set(entry.date, [...(days.get(entry.date) ?? []), entry])
  return [...days.entries()]
}

// «Что нового»: one quiet column like the profile - a caption per day, then each change as a
// title and a line or two, with a link to try it.
export const UpdatesPage = () => (
  <main className={styles.page}>
    <BackToCabinet />
    <MarkUpdatesSeen />
    <div className={styles.column}>
      <header className={styles.head}>
        <PageTitle title='Что нового.' subtitle='Обновления Awaisa.' />
      </header>
      {groupByDay().map(([day, entries]) => (
        <section key={day} className={styles.day} aria-labelledby={`day-${day}`}>
          <SectionCaption as='h2' id={`day-${day}`} isInset={false}>
            {formatDay(day)}
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
                      {audience && <span className={styles.audience}>{audience}</span>}
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
