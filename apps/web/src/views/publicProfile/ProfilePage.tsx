import { Star } from '@phosphor-icons/react/ssr'
import NextLink from 'next/link'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import { Achievements, achievementLook, profileStyle } from '@/entities/profile'
import { EditProfileButton } from '@/features/profileStyle'
import type { PublicProfile } from '@/shared/api/types'
import { pluralize, pluralWord } from '@/shared/lib/plural'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import styles from './ProfilePage.module.css'
import { ProfileReviews } from './ui/ProfileReviews'
import { ShareProfile } from './ui/ShareProfile'
import { StoryButton } from './ui/StoryButton'

interface ProfilePageProps {
  profile: PublicProfile
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

// «с сентября 2026»: the genitive month comes from a day-and-month format.
const formatSince = (iso: string) => {
  const date = new Date(iso)
  return `С ${dateFormatter.format(date).split(' ')[1] ?? ''} ${date.getFullYear()}`
}

const MAX_MASTERS = 6
const MAX_PLACES = 4

// A client's page in the app's own voice, like a contact card in iOS: the face centred on a soft
// wash of their colour, name and status, one line of facts, the level as a line of text; then
// achievements as medals and short rows of masters, places and reviews — on the page, no cards.
export const ProfilePage = ({ profile }: ProfilePageProps) => {
  const earned = profile.achievements.filter((item) => item.earned).length
  const awaiting = profile.isOwn ? (profile.awaitingReview ?? 0) : 0
  const facts = [
    {
      value: profile.stats.visits,
      label: pluralWord(profile.stats.visits, ['визит', 'визита', 'визитов']),
    },
    {
      value: profile.stats.places,
      label: pluralWord(profile.stats.places, ['место', 'места', 'мест']),
    },
    {
      value: profile.stats.reviews,
      label: pluralWord(profile.stats.reviews, ['отзыв', 'отзыва', 'отзывов']),
    },
    ...(profile.stats.friends > 0
      ? [
          {
            value: profile.stats.friends,
            label: pluralWord(profile.stats.friends, ['друг', 'друга', 'друзей']),
          },
        ]
      : []),
  ]

  return (
    <main className={styles.page} style={profileStyle(profile.accent)}>
      <div className={styles.column}>
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
          <p className={styles.facts}>
            {facts.map((fact, index) => (
              <span key={fact.label}>
                {index > 0 && ' · '}
                <strong>{fact.value}</strong> {fact.label}
              </span>
            ))}
          </p>
          <p className={styles.level}>
            Уровень {profile.level.level}
            {/* The showcase: the achievements the client chose to wear by the level. */}
            {profile.featured.map((item) => (
              <span key={item.id} className={styles.featured} title={item.title}>
                {achievementLook(item.id).emoji}
              </span>
            ))}
            <span className={styles.levelMuted}>
              {profile.level.next !== null
                ? ` · ${profile.level.next - profile.level.xp} очков до следующего`
                : ' · максимальный'}
              {' · '}
              {formatSince(profile.since).toLowerCase()}
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
                Мой мастер — <strong>{profile.favoriteMaster.name.split(' ')[0]}</strong> ·{' '}
                {profile.favoriteMaster.businessName}
              </span>
            </NextLink>
          )}
          {profile.isOwn && !profile.isPublic && (
            <p className={styles.hidden}>Профиль скрыт — его видите только вы</p>
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
          <h2 id='profile-achievements' className={styles.caption}>
            Достижения{' '}
            <span className={styles.captionCount}>
              {earned} из {profile.achievements.length}
            </span>
          </h2>
          <Achievements items={profile.achievements} />
        </section>

        {profile.masters.length > 0 && (
          <section className={styles.section} aria-labelledby='profile-masters'>
            <h2 id='profile-masters' className={styles.caption}>
              Мастера
            </h2>
            <ul className={styles.faces}>
              {profile.masters.slice(0, MAX_MASTERS).map((master) => (
                <li key={master.id}>
                  <NextLink
                    href={`/${master.slug}/book?specialist=${master.id}`}
                    className={styles.faceLink}
                    aria-label={`${master.name}, ${master.businessName}: записаться`}
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
                      <PersonAvatar
                        name={master.name}
                        src={master.photoUrl ?? undefined}
                        size='lg'
                      />
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
            <h2 id='profile-places' className={styles.caption}>
              Чаще всего
            </h2>
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
            <h2 id='profile-reviews' className={styles.caption}>
              Отзывы
              {profile.stats.average !== null && (
                <span className={styles.captionCount}>
                  <Star weight='fill' aria-hidden className={styles.star} />
                  {profile.stats.average.toLocaleString('ru-RU')}
                </span>
              )}
            </h2>
            {/* Only the owner sees it: recent visits still waiting for their stars. */}
            {awaiting > 0 && (
              <NextLink href='/bookings' className={styles.awaiting}>
                Ждут оценки: {pluralize(awaiting, ['визит', 'визита', 'визитов'])} ›
              </NextLink>
            )}
            {profile.reviews.length > 0 && (
              <ProfileReviews reviews={profile.reviews} authorName={profile.name} />
            )}
          </section>
        )}
      </div>
    </main>
  )
}
