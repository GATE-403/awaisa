import { ButtonLink } from '@awaisa/ui/Button'
import NextLink from 'next/link'
import { StoreCard } from '@/common/components/StoreCard/StoreCard'
import { StoreShelf } from '@/common/components/StoreShelf/StoreShelf'
import styles from './ForBusinessPage.module.css'

const BENEFITS = [
  {
    eyebrow: 'Пять минут',
    title: 'Своя страница с записью.',
    description: 'Услуги, цены, мастера и график — клиенты видят только свободное время.',
  },
  {
    eyebrow: 'Без звонков',
    title: 'Клиенты записываются сами.',
    description: 'Днём и ночью, с телефона или компьютера. Двойная запись невозможна.',
  },
  {
    eyebrow: 'Напоминания',
    title: 'Меньше неявок.',
    description: 'Клиент получает подтверждение и напоминание за два часа до визита.',
  },
  {
    eyebrow: 'Расписание',
    title: 'Весь день перед глазами.',
    description: 'Записи по мастерам, перерывы и выходные, отмена с уведомлением клиента.',
  },
]

const STEPS = [
  'Войдите по номеру телефона.',
  'Укажите название и адрес — ссылка готова.',
  'Добавьте услуги, мастеров и график.',
]

export const ForBusinessPage = () => (
  <main className={styles.page}>
    <header className={styles.hero}>
      <h1 className={styles.title}>
        Для бизнеса
        <span className={styles.titleMuted}>. Онлайн-запись для вашего салона — бесплатно.</span>
      </h1>
      <div className={styles.actions}>
        <ButtonLink render={<NextLink href='/business/new' />} size='lg'>
          Создать страницу
        </ButtonLink>
        <NextLink href='/manage' className={styles.link}>
          У меня уже есть страница ›
        </NextLink>
      </div>
    </header>

    <StoreShelf
      id='benefits'
      title='Что вы получаете.'
      subtitle='Всё в одном месте.'
      label='Преимущества'
    >
      {BENEFITS.map((item) => (
        <li key={item.title}>
          <StoreCard
            eyebrow={item.eyebrow}
            title={item.title}
            description={item.description}
            height='sm'
          />
        </li>
      ))}
    </StoreShelf>

    <section className={styles.steps} aria-labelledby='steps-title'>
      <h2 id='steps-title' className={styles.stepsTitle}>
        Три шага<span className={styles.titleMuted}> до первой записи.</span>
      </h2>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => (
          <li key={step} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden='true'>
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  </main>
)
