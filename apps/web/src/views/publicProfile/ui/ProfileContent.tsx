'use client'

import { Globe, Star, TiktokLogo } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import type { ComponentType } from 'react'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import { Achievements, achievementLook, achievementTitle } from '@/entities/profile'
import { EditProfileButton } from '@/features/profileStyle'
import type { ProfileLinkKind, PublicProfile } from '@/shared/api/types'
import { type Translate, useT } from '@/shared/i18n'
import { BUSINESS_TIME_ZONE } from '@/shared/lib/businessTime'
import { InstagramMark, TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import styles from '../ProfilePage.module.css'
import { ProfileReviews } from './ProfileReviews'
import { ShareProfile } from './ShareProfile'
import { StoryButton } from './StoryButton'

interface ProfileContentProps {
  profile: PublicProfile
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: BUSINESS_TIME_ZONE,
})
const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})
const yearFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  timeZone: BUSINESS_TIME_ZONE,
})

// «с сентября 2026» (the genitive month comes from a day-and-month format), «since September
// 2026», «2026-жылдан бери».
const formatSince = (iso: string, t: Translate) => {
  const date = new Date(iso)
  const year = yearFormatter.format(date)
  if (t.language === 'en') return t('с {date}', { date: monthFormatter.format(date) })
  if (t.language === 'ky') return t('с {date}', { date: `${year}-жылдан` })
  return t('с {date}', { date: `${dateFormatter.format(date).split(' ')[1] ?? ''} ${year}` })
}

const MAX_MASTERS = 6
const MAX_PLACES = 4

const LINK_GLYPHS: Record<
  ProfileLinkKind,
  ComponentType<{ weight?: 'bold'; 'aria-hidden'?: boolean }>
> = {
  instagram: InstagramMark,
  telegram: TelegramMark,
  tiktok: TiktokLogo,
  website: Globe,
}

export const ProfileContent = ({ profile }: ProfileContentProps) => {
  const t = useT()
  const countWord = (count: number, forms: [string, string, string]) =>
    t.count(count, forms).replace(/^\d+ /, '')
  const earned = profile.achievements.filter((item) => item.earned).length
  const awaiting = profile.isOwn ? (profile.awaitingReview ?? 0) : 0
  const facts = [
    {
      value: profile.stats.visits,
      label: countWord(profile.stats.visits, ['визит', 'визита', 'визитов']),
    },
    {
      value: profile.stats.places,
      label: countWord(profile.stats.places, ['место', 'места', 'мест']),
    },
    {
      value: profile.stats.reviews,
      label: countWord(profile.stats.reviews, ['отзыв', 'отзыва', 'отзывов']),
    },
    ...(profile.stats.friends > 0
      ? [
          {
            value: profile.stats.friends,
            label: countWord(profile.stats.friends, ['друг', 'друга', 'друзей']),
          },
        ]
      : []),
  ]

  return (
    <>
      <header className={styles.head}>
        {/* The three most active clients on the platform wear a laurel wreath. */}
        {profile.rank ? (
          <Wreath rank={profile.rank} className={styles.wreath}>
            <PersonAvatar
              name={profile.name}
              src={profile.avatarUrl ?? undefined}
              size='xl'
              className={styles.face}
            />
          </Wreath>
        ) : (
          <PersonAvatar
            name={profile.name}
            src={profile.avatarUrl ?? undefined}
            size='xl'
            className={styles.face}
          />
        )}
        <h1 className={styles.name}>{profile.name}</h1>
        {(profile.status || profile.statusEmoji) && (
          <p className={styles.status}>
            {profile.statusEmoji && (
              <span className={styles.statusEmoji}>{profile.statusEmoji}</span>
            )}
            {profile.status}
          </p>
        )}
        {profile.about && <p className={styles.about}>{profile.about}</p>}
        {profile.links && profile.links.length > 0 && (
          // Quiet glyph links under the words, like a bio's: the API built each address.
          <ul className={styles.links} aria-label={t('Ссылки')}>
            {profile.links.map((link) => {
              const Glyph = LINK_GLYPHS[link.kind]
              return (
                <li key={link.kind}>
                  <a
                    href={link.url}
                    target='_blank'
                    rel='noreferrer nofollow ugc'
                    className={styles.link}
                    aria-label={`${t(link.label)}: ${link.text}`}
                  >
                    <Glyph weight='bold' aria-hidden />
                    <span className={styles.linkText}>{link.text}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
        <p className={styles.facts}>
          {facts.map((fact, index) => (
            <span key={fact.label}>
              {index > 0 && ' · '}
              <strong>{fact.value}</strong> {fact.label}
            </span>
          ))}
        </p>
        <p className={styles.level}>
          {t('Уровень {level}', { level: profile.level.level })}
          {/* The showcase: the achievements the client chose to wear by the level. */}
          {profile.featured.map((item) => (
            <span key={item.id} className={styles.featured} title={achievementTitle(item.title, t)}>
              {achievementLook(item.id).emoji}
            </span>
          ))}
          <span className={styles.levelMuted}>
            {profile.level.next !== null
              ? ` · ${t('{points} очков до следующего', { points: profile.level.next - profile.level.xp })}`
              : ` · ${t('максимальный')}`}
            {' · '}
            {formatSince(profile.since, t)}
          </span>
        </p>
        {profile.favoriteMaster && (
          <NextLink
            href={`/${profile.favoriteMaster.slug}/book?specialist=${profile.favoriteMaster.id}`}
            className={styles.myMaster}
          >
            <PersonAvatar
              name={profile.favoriteMaster.name}
              src={profile.favoriteMaster.photoUrl ?? undefined}
              size='sm'
            />
            <span>
              {t('Мой мастер —')} <strong>{profile.favoriteMaster.name.split(' ')[0]}</strong> ·{' '}
              {profile.favoriteMaster.businessName}
            </span>
          </NextLink>
        )}
        {profile.isOwn && !profile.isPublic && (
          <p className={styles.hidden}>{t('Профиль скрыт — его видите только вы')}</p>
        )}
        <div className={styles.actions}>
          <ShareProfile
            name={profile.name}
            address={profile.handle ?? profile.id}
            isOwn={profile.isOwn}
          />
          <StoryButton address={profile.handle ?? profile.id} />
          {profile.isOwn && <EditProfileButton />}
        </div>
      </header>

      <section className={styles.section} aria-labelledby='profile-achievements'>
        <SectionCaption as='h2' isInset={false} id='profile-achievements'>
          {t('Достижения')}{' '}
          <span className={styles.captionCount}>
            {t('{earned} из {total}', { earned, total: profile.achievements.length })}
          </span>
        </SectionCaption>
        <Achievements items={profile.achievements} />
      </section>

      {profile.masters.length > 0 && (
        <section className={styles.section} aria-labelledby='profile-masters'>
          <SectionCaption as='h2' isInset={false} id='profile-masters'>
            {t('Мастера')}
          </SectionCaption>
          <ul className={styles.faces}>
            {profile.masters.slice(0, MAX_MASTERS).map((master) => (
              <li key={master.id}>
                <NextLink
                  href={`/${master.slug}/book?specialist=${master.id}`}
                  className={styles.faceLink}
                  aria-label={t('{name}, {place}: записаться', {
                    name: master.name,
                    place: master.businessName,
                  })}
                >
                  {master.rank ? (
                    <Wreath rank={master.rank} hasNumber={false}>
                      <PersonAvatar
                        name={master.name}
                        src={master.photoUrl ?? undefined}
                        size='lg'
                      />
                    </Wreath>
                  ) : (
                    <PersonAvatar name={master.name} src={master.photoUrl ?? undefined} size='lg' />
                  )}
                  <span className={styles.faceName}>{master.name.split(' ')[0]}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.places.length > 0 && (
        <section className={styles.section} aria-labelledby='profile-places'>
          <SectionCaption as='h2' isInset={false} id='profile-places'>
            {t('Чаще всего')}
          </SectionCaption>
          <ul className={styles.places}>
            {profile.places.slice(0, MAX_PLACES).map((place) => (
              <li key={place.slug}>
                <NextLink href={`/${place.slug}`} className={styles.place}>
                  <BusinessTile name={place.name} logoUrl={place.logoUrl} size='xs' />
                  {place.name}
                  <span className={styles.placeCount}>{place.visits}</span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(profile.reviews.length > 0 || awaiting > 0) && (
        <section className={styles.section} aria-labelledby='profile-reviews'>
          <SectionCaption as='h2' isInset={false} id='profile-reviews'>
            {t('Отзывы')}
            {profile.stats.average !== null && (
              <span className={styles.captionCount}>
                <Star weight='fill' aria-hidden className={styles.star} />
                {profile.stats.average.toLocaleString('ru-RU')}
              </span>
            )}
          </SectionCaption>
          {/* Only the owner sees it: recent visits still waiting for their stars. */}
          {awaiting > 0 && (
            <NextLink href='/bookings' className={styles.awaiting}>
              {t('Ждут оценки: {visits} ›', {
                visits: t.count(awaiting, ['визит', 'визита', 'визитов']),
              })}
            </NextLink>
          )}
          {profile.reviews.length > 0 && (
            <ProfileReviews reviews={profile.reviews} authorName={profile.name} />
          )}
        </section>
      )}
    </>
  )
}
