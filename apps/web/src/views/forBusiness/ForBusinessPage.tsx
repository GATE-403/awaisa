import { ButtonLink } from '@awaisa/ui/Button'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowRight, Bell, CalendarCheck, CaretDown, Columns } from '@phosphor-icons/react/ssr'
import type { CSSProperties } from 'react'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { TrackStep } from '@/shared/ui/TrackStep/TrackStep'
import styles from './ForBusinessPage.module.css'
import { FAQ, STATS, STEPS } from './forBusinessContent'
import { DragVisual, ReminderVisual, SlotsVisual } from './ui/FeatureVisuals'
import { LabelledSection } from './ui/LabelledSection'
import { OrbitScene } from './ui/OrbitScene'
import { ProductShowcase } from './ui/ProductShowcase'
import { TiltCard } from './ui/TiltCard'
import { TrustRow } from './ui/TrustRow'

const BLOCKS = [
  {
    id: 'booking',
    icon: CalendarCheck,
    tint: 'var(--system-blue)',
    title: msg`Online booking`,
    text: msg`Only free slots that respect schedules and durations. Double bookings can’t happen.`,
    visual: <SlotsVisual />,
  },
  {
    id: 'reminders',
    icon: Bell,
    tint: 'var(--system-orange)',
    title: msg`Reminders`,
    text: msg`Instant confirmation and a reminder two hours ahead: fewer empty chairs.`,
    visual: <ReminderVisual />,
  },
  {
    id: 'schedule',
    icon: Columns,
    tint: 'var(--system-green)',
    title: msg`Schedule`,
    text: msg`A column per specialist. Drag to reschedule, tap a time to book a walk-in.`,
    visual: <DragVisual />,
  },
]

// Static at build time (SSG): only the list of places in TrustRow loads in the browser.
export const ForBusinessPage = () => {
  const { t } = useLingui()

  return (
    <main className={styles.page}>
      <TrackStep step='business_landing' />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1 className={styles.title}>
            <Trans>Online booking that runs itself</Trans>
          </h1>
          <div className={styles.actions}>
            <ButtonLink
              size='lg'
              className={styles.pill}
              render={<NextLink href='/business/new' />}
            >
              <Trans>Create a page</Trans>
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink
              size='lg'
              variant='secondary'
              className={styles.pill}
              render={<NextLink href='/manage' />}
            >
              <Trans>Sign in to the dashboard</Trans>
            </ButtonLink>
          </div>
        </div>

        <OrbitScene />

        <div className={styles.heroAside}>
          <NextLink href='/map' className={styles.news}>
            <span className={styles.newsBadge}>
              <Trans>New</Trans>
            </span>
            <Trans>Branches and map</Trans>
            <ArrowRight aria-hidden />
          </NextLink>
          <p className={styles.lead}>
            <Trans>
              {
                'A page with services and prices, specialists’ schedules, client reminders and Wallet passes. Free, with no subscription fee or commission.'
              }
            </Trans>
          </p>
        </div>
      </header>

      <TrustRow />

      <section className={styles.panel} aria-labelledby='blocks-title'>
        <h2 id='blocks-title' className={styles.panelTitle}>
          <Trans>Everything for bookings</Trans>
          <span className={styles.titleMuted}>
            <Trans>{', out of the box'}</Trans>
          </span>
        </h2>
        <ProductShowcase />
        <div className={styles.bento}>
          {BLOCKS.map(({ id, icon: Icon, tint, title, text, visual }) => (
            <TiltCard key={id} className={styles.bentoItem}>
              <div className={styles.bentoCopy} style={{ '--tint': tint } as CSSProperties}>
                <span className={styles.bentoIcon} aria-hidden='true'>
                  <Icon />
                </span>
                <h3 className={styles.bentoTitle}>{t(title)}</h3>
                <p className={styles.bentoText}>{t(text)}</p>
              </div>
              {visual}
            </TiltCard>
          ))}
        </div>
      </section>

      <LabelledSection className={styles.stats} label={msg`In numbers`}>
        {STATS.map((stat) => (
          <div key={stat.value.id} className={styles.stat}>
            <p className={styles.statValue}>{t(stat.value)}</p>
            <p className={styles.statLabel}>{t(stat.label)}</p>
          </div>
        ))}
      </LabelledSection>

      <section className={styles.steps} aria-labelledby='steps-title'>
        <h2 id='steps-title' className={styles.sectionTitle}>
          <Trans>Three steps</Trans>
          <span className={styles.titleMuted}>
            <Trans>{' to the first booking'}</Trans>
          </span>
        </h2>
        <ol className={styles.stepList}>
          {STEPS.map((step, index) => (
            <li key={step.title.id} className={styles.step}>
              <span className={styles.stepNumber} aria-hidden='true'>
                0{index + 1}
              </span>
              <span className={styles.stepTitle}>{t(step.title)}</span>
              <span className={styles.stepText}>{t(step.text)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.faq} aria-labelledby='faq-title'>
        <h2 id='faq-title' className={styles.sectionTitle}>
          <Trans>Questions</Trans>
          <span className={styles.titleMuted}>
            <Trans>{' and answers'}</Trans>
          </span>
        </h2>
        <div className={styles.faqList}>
          {FAQ.map((item) => (
            <details key={item.question.id} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                {t(item.question)}
                <CaretDown className={styles.faqCaret} aria-hidden />
              </summary>
              <p className={styles.faqAnswer}>{t(item.answer)}</p>
            </details>
          ))}
        </div>
      </section>

      <LabelledSection className={styles.closing} label={msg`Get started`}>
        <h2 className={styles.closingTitle}>
          <Trans>Your first booking, today.</Trans>
        </h2>
        <ButtonLink
          variant='contrast'
          size='lg'
          className={styles.pill}
          render={<NextLink href='/business/new' />}
        >
          <Trans>Start for free</Trans>
        </ButtonLink>
      </LabelledSection>
    </main>
  )
}
