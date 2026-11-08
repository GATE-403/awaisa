import { Check } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { Business, Catalog } from '@/common/api/types'
import styles from './SetupChecklist.module.css'

interface SetupChecklistProps {
  business: Business
  catalog: Catalog
}

export const SetupChecklist = ({ business, catalog }: SetupChecklistProps) => {
  const activeServices = catalog.services.filter((service) => service.isActive !== false)
  const steps = [
    { label: 'Добавьте услуги', tab: 'services', isDone: activeServices.length > 0 },
    {
      label: 'Добавьте мастеров и отметьте их услуги',
      tab: 'masters',
      isDone: catalog.specialists.some(
        (master) => master.isActive !== false && master.serviceIds.length > 0,
      ),
    },
    { label: 'Проверьте график работы', tab: 'hours', isDone: business.hours.length > 0 },
  ]
  if (steps.every((step) => step.isDone)) return null

  return (
    <section className={styles.card} aria-labelledby='setup-title'>
      <h2 id='setup-title' className={styles.title}>
        Чтобы клиенты могли записаться
      </h2>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.tab} className={styles.step} data-done={step.isDone || undefined}>
            <span className={styles.mark} aria-hidden='true'>
              {step.isDone && <Check weight='bold' />}
            </span>
            {step.isDone ? (
              <span>{step.label}</span>
            ) : (
              <NextLink href={`?tab=${step.tab}`} scroll={false} className={styles.link}>
                {step.label}
              </NextLink>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
