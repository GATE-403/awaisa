import NextLink from 'next/link'
import type { Business, Catalog } from '@/shared/api/types'
import type { ManageTab } from '@/views/manage/manageTabs'
import styles from './SetupProgress.module.css'

interface SetupProgressProps {
  business: Business
  catalog: Catalog
}

export const SetupProgress = ({ business, catalog }: SetupProgressProps) => {
  const steps: { label: string; tab: ManageTab; isDone: boolean }[] = [
    {
      label: 'Добавьте услуги',
      tab: 'services',
      isDone: catalog.services.some((service) => service.isActive !== false),
    },
    {
      label: 'Добавьте мастеров',
      tab: 'masters',
      isDone: catalog.specialists.some(
        (master) => master.isActive !== false && master.serviceIds.length > 0,
      ),
    },
    { label: 'Проверьте график', tab: 'hours', isDone: business.hours.length > 0 },
  ]
  const doneCount = steps.filter((step) => step.isDone).length
  const next = steps.find((step) => !step.isDone)
  if (!next) return null

  return (
    <section className={styles.card} aria-labelledby='setup-title'>
      <div className={styles.top}>
        <h2 id='setup-title' className={styles.title}>
          Запуск записи
        </h2>
        <span className={styles.count}>
          {doneCount} из {steps.length}
        </span>
      </div>
      <progress
        className={styles.bar}
        value={doneCount}
        max={steps.length}
        aria-label='Готовность'
      />
      <NextLink
        href={`/manage/${business.slug}?tab=${next.tab}`}
        scroll={false}
        className={styles.next}
      >
        Дальше: {next.label.toLowerCase()} ›
      </NextLink>
    </section>
  )
}
