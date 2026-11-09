import { ButtonLink } from '@awaisa/ui/Button'
import { ArrowRight, Bell, CalendarCheck, CaretDown, Columns } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { CSSProperties } from 'react'
import styles from './ForBusinessPage.module.css'
import { FAQ, STATS, STEPS } from './forBusinessContent'
import { DragVisual, ReminderVisual, SlotsVisual } from './ui/FeatureVisuals'
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
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1 className={styles.title}>Онлайн-запись, которая работает сама</h1>
        <div className={styles.actions}>
          <ButtonLink size='lg' className={styles.pill} render={<NextLink href='/business/new' />}>
            Создать страницу
            <ArrowRight weight='bold' aria-hidden />
          </ButtonLink>
          <ButtonLink
            size='lg'
            variant='secondary'
            className={styles.pill}
            render={<NextLink href='/manage' />}
          >
            Войти в кабинет
          </ButtonLink>
        </div>
      </div>

      <OrbitScene />

      <div className={styles.heroAside}>
        <NextLink href='/map' className={styles.news}>
          <span className={styles.newsBadge}>Новое</span>
          Филиалы и карта
          <ArrowRight weight='bold' aria-hidden />
        </NextLink>
        <p className={styles.lead}>
          Страница с услугами и ценами, расписание мастеров, напоминания клиентам и талоны в Wallet.
          Бесплатно, без абонплаты и комиссии.
        </p>
      </div>
    </header>

    <TrustRow />

    <section className={styles.panel} aria-labelledby='blocks-title'>
      <h2 id='blocks-title' className={styles.panelTitle}>
        Всё для записи<span className={styles.titleMuted}> — из коробки</span>
      </h2>
      <ProductShowcase />
      <div className={styles.bento}>
        {BLOCKS.map(({ id, icon: Icon, tint, title, text, visual }) => (
          <TiltCard key={id} className={styles.bentoItem}>
            <div className={styles.bentoCopy} style={{ '--tint': tint } as CSSProperties}>
              <span className={styles.bentoIcon} aria-hidden='true'>
                <Icon weight='fill' />
              </span>
              <h3 className={styles.bentoTitle}>{title}</h3>
              <p className={styles.bentoText}>{text}</p>
            </div>
            {visual}
          </TiltCard>
        ))}
      </div>
    </section>

    <section className={styles.stats} aria-label='В цифрах'>
      {STATS.map((stat) => (
        <div key={stat.value} className={styles.stat}>
          <p className={styles.statValue}>{stat.value}</p>
          <p className={styles.statLabel}>{stat.label}</p>
        </div>
      ))}
    </section>

    <section className={styles.steps} aria-labelledby='steps-title'>
      <h2 id='steps-title' className={styles.sectionTitle}>
        Три шага<span className={styles.titleMuted}> до первой записи</span>
      </h2>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden='true'>
              0{index + 1}
            </span>
            <span className={styles.stepTitle}>{step.title}</span>
            <span className={styles.stepText}>{step.text}</span>
          </li>
        ))}
      </ol>
    </section>

    <section className={styles.faq} aria-labelledby='faq-title'>
      <h2 id='faq-title' className={styles.sectionTitle}>
        Вопросы<span className={styles.titleMuted}> и ответы</span>
      </h2>
      <div className={styles.faqList}>
        {FAQ.map((item) => (
          <details key={item.question} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              {item.question}
              <CaretDown className={styles.faqCaret} weight='bold' aria-hidden />
            </summary>
            <p className={styles.faqAnswer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>

    <section className={styles.closing} aria-label='Начать'>
      <h2 className={styles.closingTitle}>Первая запись — уже сегодня.</h2>
      <ButtonLink
        variant='contrast'
        size='lg'
        className={styles.pill}
        render={<NextLink href='/business/new' />}
      >
        Начать бесплатно
      </ButtonLink>
    </section>
  </main>
)
