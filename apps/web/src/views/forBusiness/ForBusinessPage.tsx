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
    title: 'Онлайн-запись',
    text: 'Только свободные окна с учётом графика и длительности. Двойная запись невозможна.',
    visual: <SlotsVisual />,
  },
  {
    id: 'reminders',
    icon: Bell,
    tint: 'var(--system-orange)',
    title: 'Напоминания',
    text: 'Подтверждение сразу и напоминание за два часа — меньше пустых кресел.',
    visual: <ReminderVisual />,
  },
  {
    id: 'schedule',
    icon: Columns,
    tint: 'var(--system-green)',
    title: 'Расписание',
    text: 'Колонка на мастера. Перенос перетаскиванием, запись с улицы — нажатием на время.',
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
          <T>Онлайн-запись, которая работает сама</T>
        </h1>
        <div className={styles.actions}>
          <ButtonLink size='lg' className={styles.pill} render={<NextLink href='/business/new' />}>
            <T>Создать страницу</T>
            <ArrowRight weight='bold' aria-hidden />
          </ButtonLink>
          <ButtonLink
            size='lg'
            variant='secondary'
            className={styles.pill}
            render={<NextLink href='/manage' />}
          >
            <T>Войти в кабинет</T>
          </ButtonLink>
        </div>
      </div>

      <OrbitScene />

      <div className={styles.heroAside}>
        <NextLink href='/map' className={styles.news}>
          <span className={styles.newsBadge}>
            <T>Новое</T>
          </span>
          <T>Филиалы и карта</T>
          <ArrowRight weight='bold' aria-hidden />
        </NextLink>
        <p className={styles.lead}>
          <T>
            {
              'Страница с услугами и ценами, расписание мастеров, напоминания клиентам и талоны в Wallet. Бесплатно, без абонплаты и комиссии.'
            }
          </T>
        </p>
      </div>
    </header>

    <TrustRow />

    <section className={styles.panel} aria-labelledby='blocks-title'>
      <h2 id='blocks-title' className={styles.panelTitle}>
        <T>Всё для записи</T>
        <span className={styles.titleMuted}>
          <T>{' — из коробки'}</T>
        </span>
      </h2>
      <ProductShowcase />
      <div className={styles.bento}>
        {BLOCKS.map(({ id, icon: Icon, tint, title, text, visual }) => (
          <TiltCard key={id} className={styles.bentoItem}>
            <div className={styles.bentoCopy} style={{ '--tint': tint } as CSSProperties}>
              <span className={styles.bentoIcon} aria-hidden='true'>
                <Icon weight='fill' />
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

    <LabelledSection className={styles.stats} label='В цифрах'>
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
        <T>Три шага</T>
        <span className={styles.titleMuted}>
          <T>{' до первой записи'}</T>
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
        <T>Вопросы</T>
        <span className={styles.titleMuted}>
          <T>{' и ответы'}</T>
        </span>
      </h2>
      <div className={styles.faqList}>
        {FAQ.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <T>{item.question}</T>
              <CaretDown className={styles.faqCaret} weight='bold' aria-hidden />
            </summary>
            <p className={styles.faqAnswer}>
              <T>{item.answer}</T>
            </p>
          </details>
        ))}
      </div>
    </section>

    <LabelledSection className={styles.closing} label='Начать'>
      <h2 className={styles.closingTitle}>
        <T>Первая запись — уже сегодня.</T>
      </h2>
      <ButtonLink
        variant='contrast'
        size='lg'
        className={styles.pill}
        render={<NextLink href='/business/new' />}
      >
        <T>Начать бесплатно</T>
      </ButtonLink>
    </LabelledSection>
  </main>
)
