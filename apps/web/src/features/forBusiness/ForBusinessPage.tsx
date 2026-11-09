import { ButtonLink } from '@awaisa/ui/Button'
import { CaretDown } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { DragVisual, ReminderVisual, SlotsVisual } from './components/FeatureVisuals'
import { ProductShowcase } from './components/ProductShowcase'
import styles from './ForBusinessPage.module.css'
import { FAQ, STATS, STEPS } from './forBusinessContent'

const FEATURES = [
  {
    eyebrow: 'Онлайн-запись',
    title: 'Клиенты выбирают время сами.',
    text: 'Только свободные окна с учётом графика, перерывов и длительности услуги. Двойная запись невозможна.',
    visual: <SlotsVisual />,
  },
  {
    eyebrow: 'Напоминания',
    title: 'Меньше пустых кресел.',
    text: 'Подтверждение сразу после записи и напоминание за два часа. Отменить можно в один тап — время освободится.',
    visual: <ReminderVisual />,
  },
  {
    eyebrow: 'Расписание',
    title: 'День как в Календаре.',
    text: 'Колонка на мастера, записи по длительности. Перенесите запись перетаскиванием или добавьте клиента с улицы.',
    visual: <DragVisual />,
  },
]

export const ForBusinessPage = () => (
  <main className={styles.page}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Awaisa для бизнеса</p>
      <h1 className={styles.title}>Записи идут сами.</h1>
      <p className={styles.lead}>
        Страница с онлайн-записью, расписание мастеров и напоминания клиентам. Бесплатно.
      </p>
      <div className={styles.actions}>
        <ButtonLink render={<NextLink href='/business/new' />} size='lg'>
          Создать страницу
        </ButtonLink>
        <NextLink href='/manage' className={styles.link}>
          Войти в кабинет ›
        </NextLink>
      </div>
    </header>

    <ProductShowcase />

    <section className={styles.stats} aria-label='В цифрах'>
      {STATS.map((stat) => (
        <div key={stat.value} className={styles.stat}>
          <p className={styles.statValue}>{stat.value}</p>
          <p className={styles.statLabel}>{stat.label}</p>
        </div>
      ))}
    </section>

    <section className={styles.features} aria-label='Возможности'>
      {FEATURES.map((feature) => (
        <article key={feature.title} className={styles.feature}>
          <div className={styles.featureText}>
            <p className={styles.eyebrow}>{feature.eyebrow}</p>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p className={styles.featureLead}>{feature.text}</p>
          </div>
          {feature.visual}
        </article>
      ))}
    </section>

    <section className={styles.steps} aria-labelledby='steps-title'>
      <h2 id='steps-title' className={styles.sectionTitle}>
        Три шага<span className={styles.titleMuted}> до первой записи.</span>
      </h2>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden='true'>
              {index + 1}
            </span>
            <span className={styles.stepTitle}>{step.title}</span>
            <span className={styles.stepText}>{step.text}</span>
          </li>
        ))}
      </ol>
    </section>

    <section className={styles.faq} aria-labelledby='faq-title'>
      <h2 id='faq-title' className={styles.sectionTitle}>
        Вопросы<span className={styles.titleMuted}> и ответы.</span>
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
      <ButtonLink variant='contrast' size='lg' render={<NextLink href='/business/new' />}>
        Начать бесплатно
      </ButtonLink>
    </section>
  </main>
)
