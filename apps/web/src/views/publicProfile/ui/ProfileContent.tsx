'use client'

import { ph, plural } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { CaretRight, Globe, Star, TiktokLogo } from '@phosphor-icons/react/ssr'
import { type ComponentType, type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BusinessTile, PersonAvatar } from '@/entities/business'
import {
  Achievements,
  achievementLook,
  achievementTitle,
  ProfileHead,
  ProfileHeadText,
} from '@/entities/profile'
import { EditProfileButton } from '@/features/profileStyle'
import { ReportMenu } from '@/features/report'
import type { ProfileLinkKind, PublicProfile } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink } from '@/shared/i18n/navigation'
import { InstagramMark, TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { GlyphGroup } from '@/shared/ui/GlyphGroup/GlyphGroup'
import { ProfileTabs } from '@/shared/ui/ProfileTabs/ProfileTabs'
import { Wreath } from '@/shared/ui/Wreath/Wreath'
import { describeGoal, pickNextGoal } from '../lib/goals'
import { useProfileActionsSlot } from '../model/profileActionsSlot'
import styles from '../ProfilePage.module.css'
import { AchievementCard } from './AchievementCard'
import { NextGoal } from './NextGoal'
import { PlacesMap } from './PlacesMap'
import { ProfileMasters } from './ProfileMasters'
import { ProfileRate } from './ProfileRate'
import { ProfileReviews } from './ProfileReviews'
import { ShareProfile } from './ShareProfile'
import { StoryButton } from './StoryButton'
import { VisitYear } from './VisitYear'

interface ProfileContentProps {
  profile: PublicProfile
}

type ProfileSection = 'medals' | 'masters' | 'places' | 'reviews'

// Each tab's panel is also an anchor that opens it («Rate» leads to `#profile-reviews`).
const PANELS: Record<ProfileSection, string> = {
  medals: 'profile-medals',
  masters: 'profile-masters',
  places: 'profile-places',
  reviews: 'profile-reviews',
}

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
  const { t } = useLingui()
  const format = useFormat()
  const actionsSlot = useProfileActionsSlot()
  const earned = profile.achievements.filter((item) => item.earned).length
  const [awaiting, setAwaiting] = useState(profile.isOwn ? (profile.awaitingReview ?? 0) : 0)
  const [opened, setOpened] = useState<{
    achievement: PublicProfile['achievements'][number]
    anchor: HTMLElement
  } | null>(null)
  // The closest medal on one's own profile, with what is left and where to go for it.
  const nextAchievement = profile.isOwn ? pickNextGoal(profile.achievements) : null
  const goal = nextAchievement ? describeGoal(nextAchievement, profile.places, t) : null
  const [tab, setTab] = useState<ProfileSection>('medals')
  // «Rate» and old links lead to a section by its anchor: it opens that tab.
  useEffect(() => {
    const open = () => {
      const found = (Object.keys(PANELS) as ProfileSection[]).find(
        (section) => `#${PANELS[section]}` === window.location.hash,
      )
      if (found) setTab(found)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  const yearMonths = profile.activity?.filter((month) => month.visits > 0).length ?? 0
  const facts = [
    t`Level ${ph({ level: profile.level.level })}`,
    t`${plural(profile.stats.visits, { one: '# visit', other: '# visits' })}`,
    t`${plural(profile.stats.places, { one: '# place', other: '# places' })}`,
  ]
  // The data rows, as in Telegram: the value over a small caption, only what is filled in.
  const rows: {
    key: string
    value: ReactNode
    caption: string
    href?: string
    glyph?: ProfileLinkKind
  }[] = [
    ...(profile.status ? [{ key: 'status', value: profile.status, caption: t`status` }] : []),
    ...(profile.about ? [{ key: 'about', value: profile.about, caption: t`about` }] : []),
    ...(profile.links ?? []).map((link) => ({
      key: link.kind,
      value: link.text,
      // Named by the API (Instagram, Website), shown as it comes.
      caption: link.label,
      href: link.url,
      glyph: link.kind,
    })),
  ]
  const master = profile.favoriteMaster

  const tabs = [
    {
      value: 'medals' as const,
      label: t`Medals`,
      count: earned,
      panelId: PANELS.medals,
      panel: (
        <div className={styles.tabPanel}>
          {goal && <NextGoal goal={goal} />}
          <Achievements
            items={profile.achievements}
            onSelect={(achievement, anchor) => setOpened({ achievement, anchor })}
          />
          <AchievementCard
            achievement={opened?.achievement ?? null}
            anchor={opened?.anchor ?? null}
            places={profile.places}
            isOwn={profile.isOwn}
            onClose={() => setOpened(null)}
          />
        </div>
      ),
    },
    ...(profile.masters.length > 0
      ? [
          {
            value: 'masters' as const,
            label: t`Specialists`,
            count: profile.masters.length,
            panelId: PANELS.masters,
            panel: <ProfileMasters masters={profile.masters} />,
          },
        ]
      : []),
    ...(profile.places.length > 0
      ? [
          {
            value: 'places' as const,
            label: t`Places`,
            count: profile.stats.places,
            panelId: PANELS.places,
            panel: (
              <div className={`${styles.tabPanel} ${styles.placesPanel}`}>
                {/* The places first, as one plain line that scrolls sideways (no capsules), then
                    the map the whole width with square edges (the owner: the map full width,
                    the places above it in one line). */}
                <ul className={styles.placesLine} data-edge-fade=''>
                  {profile.places.map((place) => (
                    <li key={place.slug}>
                      <NextLink href={`/${place.slug}`} className={styles.placeItem}>
                        <BusinessTile name={place.name} logoUrl={place.logoUrl} size='xs' />
                        {place.name}
                        <span className={styles.placeCount}>{place.visits}</span>
                      </NextLink>
                    </li>
                  ))}
                </ul>
                {/* Drawn once its tab is open: a map laid out while hidden fits a box of nothing. */}
                {tab === 'places' && <PlacesMap places={profile.places} />}
                {/* Drawn once visits span two months: one lit column says nothing more. */}
                {yearMonths >= 2 && profile.activity && <VisitYear months={profile.activity} />}
              </div>
            ),
          },
        ]
      : []),
    ...(profile.reviews.length > 0 || awaiting > 0
      ? [
          {
            value: 'reviews' as const,
            label: t`Reviews`,
            count: profile.reviews.length || undefined,
            panelId: PANELS.reviews,
            panel: (
              <div className={styles.tabPanel}>
                {profile.stats.average !== null && (
                  <p className={styles.average}>
                    <Star weight='fill' aria-hidden className={styles.star} />
                    {format.number(profile.stats.average)}
                  </p>
                )}
                {/* The latest visit waiting for stars, rated right here; the rest by the count. */}
                {awaiting > 0 && (
                  <ProfileRate onRated={() => setAwaiting((value) => Math.max(0, value - 1))} />
                )}
                {awaiting > 1 && (
                  <NextLink href='/bookings' className={styles.awaiting}>
                    {t`Awaiting rating: ${plural(awaiting, { one: '# visit', other: '# visits' })} ›`}
                  </NextLink>
                )}
                {profile.reviews.length > 0 && (
                  <ProfileReviews reviews={profile.reviews} authorName={profile.name} />
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  const actions = (
    <GlyphGroup label={t`Profile actions`}>
      <ShareProfile
        name={profile.name}
        address={profile.handle ?? profile.id}
        isOwn={profile.isOwn}
      />
      <StoryButton address={profile.handle ?? profile.id} />
      {profile.isOwn ? (
        <EditProfileButton />
      ) : (
        <ReportMenu
          targetType='profile'
          targetId={profile.id}
          label={t`Report profile: ${ph({ name: profile.name })}`}
          className=''
        />
      )}
    </GlyphGroup>
  )

  return (
    <>
      <div className={styles.top}>
        {/* Laid out like a profile in Telegram (the owner: like Telegram): the face,
          the name and one quiet line; three action tiles; the data as one group of rows; the
          rest behind tabs instead of one long page. */}
        <header>
          <ProfileHead
            className={styles.pageHead}
            face={
              // The three most active clients on the platform wear a laurel wreath.
              profile.rank ? (
                <Wreath rank={profile.rank}>
                  <PersonAvatar
                    name={profile.name}
                    src={profile.avatarUrl ?? undefined}
                    size='xl'
                  />
                </Wreath>
              ) : (
                <PersonAvatar name={profile.name} src={profile.avatarUrl ?? undefined} size='xl' />
              )
            }
            end={actionsSlot ? undefined : <div className={styles.corner}>{actions}</div>}
          >
            <ProfileHeadText
              name={profile.name}
              emoji={profile.statusEmoji}
              isHeading
              meta={
                <>
                  {facts.join(' · ')}
                  {/* The showcase: the achievements the client chose to wear by the level. */}
                  {profile.featured.map((item) => (
                    <span
                      key={item.id}
                      className={styles.featured}
                      title={achievementTitle(item.title, t)}
                    >
                      {achievementLook(item.id).emoji}
                    </span>
                  ))}
                </>
              }
            >
              {profile.isOwn && !profile.isPublic && (
                <p className={styles.hidden}>{t`Profile hidden: only you can see it`}</p>
              )}
            </ProfileHeadText>
          </ProfileHead>
        </header>

        {/* The actions in the corner as one capsule of thin glyphs (the owner: move them to the
            corner as capsule buttons): in the sheet's bar when the profile is a sheet, else at the
            head row's end. */}
        {actionsSlot && createPortal(actions, actionsSlot)}

        {(rows.length > 0 || master) && (
          <ul className={styles.info} aria-label={t`About the profile`}>
            {rows.map((row) => (
              <li key={row.key}>
                {row.href ? (
                  <a
                    href={row.href}
                    target='_blank'
                    rel='noreferrer nofollow ugc'
                    className={styles.infoRow}
                    aria-label={`${row.caption}: ${String(row.value)}`}
                  >
                    <span className={styles.infoValue} data-link=''>
                      {row.value}
                    </span>
                    <span className={styles.infoCaption}>{row.caption}</span>
                    {row.glyph &&
                      (() => {
                        const Glyph = LINK_GLYPHS[row.glyph]
                        return (
                          <span className={styles.infoMark}>
                            <Glyph aria-hidden />
                          </span>
                        )
                      })()}
                  </a>
                ) : (
                  <div className={styles.infoRow}>
                    <span className={styles.infoValue}>{row.value}</span>
                    <span className={styles.infoCaption}>{row.caption}</span>
                  </div>
                )}
              </li>
            ))}
            {master && (
              <li>
                <NextLink
                  href={`/${master.slug}/book?specialist=${master.id}`}
                  className={styles.infoRow}
                  data-with-face=''
                >
                  <PersonAvatar
                    name={master.name}
                    src={master.photoUrl ?? undefined}
                    size='sm'
                    className={styles.infoFace}
                  />
                  <span className={styles.infoValue}>
                    {master.name.split(' ')[0]} · {master.businessName}
                  </span>
                  <span className={styles.infoCaption}>{t`my master`}</span>
                  <CaretRight aria-hidden className={styles.infoChevron} />
                </NextLink>
              </li>
            )}
          </ul>
        )}
      </div>

      <section className={styles.tabs}>
        <ProfileTabs
          label={t`Profile sections`}
          items={tabs}
          value={tabs.some((item) => item.value === tab) ? tab : 'medals'}
          onChange={setTab}
        />
      </section>
    </>
  )
}
