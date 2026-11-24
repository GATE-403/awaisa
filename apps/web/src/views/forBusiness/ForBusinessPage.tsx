import { ButtonLink } from '@awaisa/ui/Button'
import { ArrowRight, Bell, CalendarCheck, CaretDown, Columns } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import { T } from '@/shared/i18n'
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
    title: 'Online booking',
    text: 'Only free slots that respect schedules and durations. Double bookings can’t happen.',
    visual: <SlotsVisual />,
  },
  {
    id: 'reminders',
    icon: Bell,
    tint: 'var(--system-orange)',
    title: 'Reminders',
    text: 'Instant confirmation and a reminder two hours ahead: fewer empty chairs.',
    visual: <ReminderVisual />,
  },
  {
    id: 'schedule',
    icon: Columns,
    tint: 'var(--system-green)',
    title: 'Schedule',
    text: 'A column per specialist. Drag to reschedule, tap a time to book a walk-in.',
    visual: <DragVisual />,
  },
]

// Static at build time (SSG): only the list of places in TrustRow loads in the browser.
export const ForBusinessPage = () => (
  <main className={styles.page}>
    <TrackStep step='business_landing' />
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1 className={styles.title}>
          <T>Online booking that runs itself</T>
        </h1>
        <div className={styles.actions}>
          <ButtonLink size='lg' className={styles.pill} render={<NextLink href='/business/new' />}>
            <T>Create a page</T>
            <ArrowRight aria-hidden />
          </ButtonLink>
          <ButtonLink
            size='lg'
            variant='secondary'
            className={styles.pill}
            render={<NextLink href='/manage' />}
          >
            <T>Sign in to the dashboard</T>
          </ButtonLink>
        </div>
      </div>

      <OrbitScene />

      <div className={styles.heroAside}>
        <NextLink href='/map' className={styles.news}>
          <span className={styles.newsBadge}>
            <T>New</T>
          </span>
          <T>Branches and map</T>
          <ArrowRight aria-hidden />
        </NextLink>
        <p className={styles.lead}>
          <T>
            {
              'A page with services and prices, specialists’ schedules, client reminders and Wallet passes. Free, with no subscription fee or commission.'
            }
          </T>
        </p>
      </div>
    </header>

    <TrustRow />

    <section className={styles.panel} aria-labelledby='blocks-title'>
      <h2 id='blocks-title' className={styles.panelTitle}>
        <T>Everything for bookings</T>
        <span className={styles.titleMuted}>
          <T>{', out of the box'}</T>
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
              <h3 className={styles.bentoTitle}>
                <T>{title}</T>
              </h3>
              <p className={styles.bentoText}>
                <T>{text}</T>
              </p>
            </div>
            {visual}
          </TiltCard>
        ))}
      </div>
    </section>

    <LabelledSection className={styles.stats} label='In numbers'>
      {STATS.map((stat) => (
        <div key={stat.value} className={styles.stat}>
          <p className={styles.statValue}>
            <T>{stat.value}</T>
          </p>
          <p className={styles.statLabel}>
            <T>{stat.label}</T>
          </p>
        </div>
      ))}
    </LabelledSection>

    <section className={styles.steps} aria-labelledby='steps-title'>
      <h2 id='steps-title' className={styles.sectionTitle}>
        <T>Three steps</T>
        <span className={styles.titleMuted}>
          <T>{' to the first booking'}</T>
        </span>
      </h2>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden='true'>
              0{index + 1}
            </span>
            <span className={styles.stepTitle}>
              <T>{step.title}</T>
            </span>
            <span className={styles.stepText}>
              <T>{step.text}</T>
            </span>
          </li>
        ))}
      </ol>
    </section>

    <section className={styles.faq} aria-labelledby='faq-title'>
      <h2 id='faq-title' className={styles.sectionTitle}>
        <T>Questions</T>
        <span className={styles.titleMuted}>
          <T>{' and answers'}</T>
        </span>
      </h2>
      <div className={styles.faqList}>
        {FAQ.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <T>{item.question}</T>
              <CaretDown className={styles.faqCaret} aria-hidden />
            </summary>
            <p className={styles.faqAnswer}>
              <T>{item.answer}</T>
            </p>
          </details>
        ))}
      </div>
    </section>

    <LabelledSection className={styles.closing} label='Get started'>
      <h2 className={styles.closingTitle}>
        <T>Your first booking, today.</T>
      </h2>
      <ButtonLink
        variant='contrast'
        size='lg'
        className={styles.pill}
        render={<NextLink href='/business/new' />}
      >
        <T>Start for free</T>
      </ButtonLink>
    </LabelledSection>
  </main>
)
