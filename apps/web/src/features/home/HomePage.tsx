import { Button } from '@awaisa/ui/Button'
import { Clock, MapPin, MessageCircle, Phone, Star } from 'lucide-react'
import NextLink from 'next/link'
import { Suspense } from 'react'
import { Container } from '@/common/components/Container/Container'
import { Section } from '@/common/components/Section/Section'
import { ShelfSkeleton } from '@/common/components/Shelf/ShelfSkeleton'
import { COMPANY } from '@/constants/company'
import { PopularServices } from './components/PopularServices'
import { SpecialistsShelf } from './components/SpecialistsShelf'
import styles from './HomePage.module.css'

export const HomePage = () => (
  <main className={styles.page}>
    <Container className={styles.hero}>
      <p className={styles.rating}>
        <Star className={styles.star} aria-hidden />
        <span>
          {COMPANY.rating.toFixed(1)} · {COMPANY.reviewsCount} отзывов
        </span>
      </p>
      <h1 className={styles.title}>{COMPANY.name}</h1>
      <p className={styles.tagline}>{COMPANY.tagline}</p>
      <div className={styles.actions}>
        <Button render={<NextLink href='/book' />} nativeButton={false} size='lg'>
          Записаться онлайн
        </Button>
        <Button
          render={
            // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
            <a href={COMPANY.phoneHref} />
          }
          nativeButton={false}
          size='lg'
          variant='secondary'
        >
          <Phone className={styles.buttonIcon} aria-hidden />
          Позвонить
        </Button>
      </div>
      <ul className={styles.facts}>
        <li>
          <a href={COMPANY.mapUrl} target='_blank' rel='noreferrer' className={styles.fact}>
            <MapPin className={styles.factIcon} aria-hidden />
            {COMPANY.address}
          </a>
        </li>
        <li className={styles.fact}>
          <Clock className={styles.factIcon} aria-hidden />
          {COMPANY.hours}
        </li>
      </ul>
    </Container>

    <Container className={styles.sections}>
      <Section title='Популярное' actionHref='/services' actionLabel='Все услуги'>
        <Suspense fallback={<ShelfSkeleton />}>
          <PopularServices />
        </Suspense>
      </Section>

      <Section title='Мастера' description='Выберите мастера — покажем его свободное время'>
        <Suspense fallback={<ShelfSkeleton height={88} />}>
          <SpecialistsShelf />
        </Suspense>
      </Section>

      <Section title='Как нас найти'>
        <div className={styles.contact}>
          <dl className={styles.contactList}>
            <div>
              <dt>Адрес</dt>
              <dd>{COMPANY.address}</dd>
            </div>
            <div>
              <dt>Время работы</dt>
              <dd>{COMPANY.hours}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{COMPANY.phone}</dd>
            </div>
          </dl>
          <div className={styles.contactActions}>
            <Button
              render={
                // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
                <a href={COMPANY.mapUrl} target='_blank' rel='noreferrer' />
              }
              nativeButton={false}
              variant='outline'
            >
              <MapPin className={styles.buttonIcon} aria-hidden />
              Маршрут
            </Button>
            <Button
              render={
                // biome-ignore lint/a11y/useAnchorContent: content comes from Button children via render
                <a href={COMPANY.whatsappHref} target='_blank' rel='noreferrer' />
              }
              nativeButton={false}
              variant='outline'
            >
              <MessageCircle className={styles.buttonIcon} aria-hidden />
              WhatsApp
            </Button>
          </div>
        </div>
      </Section>
    </Container>
  </main>
)
