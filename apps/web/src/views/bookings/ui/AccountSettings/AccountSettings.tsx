'use client'

import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  CalendarCheck,
  CaretRight,
  ChartBar,
  CircleHalf,
  DownloadSimple,
  Flag,
  Globe,
  Images,
  Phone,
  PlusCircle,
  SignOut,
  Sparkle,
  Storefront,
  User,
  UserMinus,
} from '@phosphor-icons/react/ssr'
import { useEffect, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { useSession } from '@/entities/session'
import { useFavorites } from '@/features/favorites'
import { useFollows } from '@/features/followMaster'
import { INTERESTS, type Preferences, PreferencesSheet, usePreferences } from '@/features/forYou'
import { LanguageSwitcher } from '@/features/language'
import { getErrorMessage } from '@/shared/api/apiError'
import { deleteMyAccount, exportMyData, getMasterPlaces } from '@/shared/api/clientApi'
import { refreshBusiness } from '@/shared/api/revalidate'
import type { MasterPlace } from '@/shared/api/types'
import { useFormat } from '@/shared/i18n'
import { Link as NextLink, useRouter } from '@/shared/i18n/navigation'
import { formatPhone } from '@/shared/lib/formatPhone'
import { useTheme } from '@/shared/lib/hooks/useTheme'
import { saveFile } from '@/shared/lib/share'
import type { Theme } from '@/shared/lib/theme'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { NameDialog } from '../NameDialog'
import styles from './AccountSettings.module.css'

const THEMES: { value: Theme; label: MessageDescriptor }[] = [
  { value: 'system', label: msg({ message: 'System', context: 'appearance setting, neuter' }) },
  { value: 'light', label: msg({ message: 'Light', context: 'appearance setting, neuter' }) },
  { value: 'dark', label: msg({ message: 'Dark', context: 'appearance setting, neuter' }) },
]

// The account's settings right on the profile, at its foot like iOS Settings - no sheet to open:
// name and number, the theme, the business side, one's data, signing out and deleting the account.
// What «what matters most» reads as in the settings' summary line.
const PRIORITY_WORDS: Record<NonNullable<Preferences['priorities']>[number], MessageDescriptor> = {
  near: msg`Nearby`,
  soon: msg`Free today`,
  rating: msg`Top rated`,
  price: msg`Cheaper`,
}

interface AccountSettingsProps {
  /** Inside the «Settings» tab the tab names it. */
  isTitleHidden?: boolean
}

export const AccountSettings = ({ isTitleHidden = false }: AccountSettingsProps) => {
  const session = useSession()
  const { t } = useLingui()
  const format = useFormat()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [places, setPlaces] = useState<MasterPlace[]>([])
  const [isNaming, setIsNaming] = useState(false)
  const [isTuning, setIsTuning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const preferences = usePreferences()
  const favorites = useFavorites()
  const follows = useFollows()

  // One switch for every followed master: a list of switches read as settings per person.
  const followWorks = async (isOn: boolean) => {
    try {
      for (const master of follows.items) {
        if (master.notifyWorks !== isOn) await follows.follow(master.id, isOn)
      }
    } catch (error) {
      toast.show({
        title: t`Something went wrong`,
        description: getErrorMessage(error),
        type: 'error',
      })
    }
  }
  const toast = useToast()
  const customer = session.customer

  useEffect(() => {
    if (!customer) return
    const controller = new AbortController()
    getMasterPlaces(controller.signal)
      .then(setPlaces)
      .catch(() => undefined)

    return () => controller.abort()
  }, [customer])

  if (!customer) return null

  // «Woman · manicure, brows · up to 2,500»: what the picks go by, at a glance.
  const tasteSummary = preferences
    ? [
        preferences.gender === 'female' ? t`Woman` : preferences.gender === 'male' ? t`Man` : null,
        preferences.interests
          .slice(0, 2)
          .map((value) => INTERESTS.find((item) => item.value === value)?.label)
          .filter((label) => label !== undefined)
          .map((label) => t(label).toLowerCase())
          .filter(Boolean)
          .join(', ') || null,
        preferences.budget ? t`up to ${ph({ amount: format.price(preferences.budget) })}` : null,
        (preferences.priorities ?? [])
          .map((value) => t(PRIORITY_WORDS[value]).toLowerCase())
          .join(', ') || null,
      ]
        .filter(Boolean)
        .join(' · ') || t`No preferences`
    : t`Not set`

  const handleSignOut = async () => {
    await session.signOut()
    router.replace('/')
  }

  // One JSON file of what we keep; hearted services live on the device, so they are added here.
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await exportMyData()
      const blob = new Blob(
        [JSON.stringify({ ...data, deviceFavorites: { serviceIds: favorites.ids } }, null, 2)],
        { type: 'application/json' },
      )
      const file = new File([blob], `awaisa-${data.exportedAt.slice(0, 10)}.json`, {
        type: 'application/json',
      })
      await saveFile(file, 'My Awaisa data')
    } catch (error) {
      toast.show({ title: t`Download failed`, description: getErrorMessage(error), type: 'error' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { slugs } = await deleteMyAccount()
      await Promise.all(slugs.map((slug) => refreshBusiness(slug))).catch(() => undefined)
      session.setCustomer(null)
      toast.show({ title: t`Account deleted`, type: 'success' })
      router.replace('/')
    } catch (error) {
      setIsDeleting(false)
      toast.show({ title: t`Not deleted`, description: getErrorMessage(error), type: 'error' })
    }
  }

  return (
    // With the title hidden the screen around it names the section (one `settings-title` id).
    <section
      className={styles.settings}
      aria-labelledby={isTitleHidden ? undefined : 'settings-title'}
    >
      {!isTitleHidden && (
        <h2 id='settings-title' className={styles.title}>
          {t`Settings`}
        </h2>
      )}

      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsNaming(true)}>
          <span className={styles.glyph} aria-hidden>
            <User />
          </span>
          <span className={styles.label}>{t`Name`}</span>
          <span className={styles.value}>
            {customer.name || t({ message: 'Add', context: 'empty value, prompt to fill in' })}
          </span>
          <CaretRight className={styles.chevron} aria-hidden />
        </button>
        <div className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <Phone />
          </span>
          <span className={styles.label}>{t`Phone`}</span>
          <span className={styles.value}>{formatPhone(customer.phone)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <CircleHalf />
          </span>
          <span className={styles.label}>{t`Appearance`}</span>
          <Select
            variant='plain'
            aria-label={t`Appearance`}
            items={THEMES.map((item) => ({ ...item, label: t(item.label) }))}
            value={theme}
            onValueChange={(value) => value && setTheme(value as Theme)}
          />
        </div>
        <div className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <Globe />
          </span>
          <span className={styles.label}>{t`Language`}</span>
          <LanguageSwitcher variant='plain' />
        </div>
      </div>

      <SectionCaption className={styles.caption}>{t`Picks`}</SectionCaption>
      <div className={styles.list}>
        <button type='button' className={styles.row} onClick={() => setIsTuning(true)}>
          <span className={styles.glyph} aria-hidden>
            <Sparkle />
          </span>
          <span className={styles.label}>{t`For you`}</span>
          <span className={styles.value}>{tasteSummary}</span>
          <CaretRight className={styles.chevron} aria-hidden />
        </button>
      </div>
      <p className={styles.footnote}>
        {t`Who it is for, your interests and budget: we pick services by them in the catalogue and after booking.`}
      </p>

      {follows.items.length > 0 && (
        <>
          <SectionCaption className={styles.caption}>{t`My masters`}</SectionCaption>
          <div className={styles.list}>
            {follows.items.map((master) => (
              <div key={master.id} className={styles.row}>
                <NextLink
                  href={`/${master.business.slug}/book?specialist=${master.id}`}
                  className={styles.followLink}
                >
                  <PersonAvatar
                    name={master.name}
                    src={master.photoUrl ?? undefined}
                    size='sm'
                    className={styles.face}
                  />
                  <span className={styles.label}>{master.name.split(' ')[0]}</span>
                  <span className={styles.value}>{master.business.name}</span>
                </NextLink>
                <button
                  type='button'
                  className={styles.unfollow}
                  onClick={() => void follows.unfollow(master.id)}
                >
                  {t`Unfollow`}
                  <span className={styles.srOnly}>{` ${master.name}`}</span>
                </button>
              </div>
            ))}
            <label className={styles.row}>
              <span className={styles.glyph} aria-hidden>
                <Images />
              </span>
              <span className={styles.label}>{t`New works`}</span>
              <Switch
                checked={follows.items.every((master) => master.notifyWorks)}
                onCheckedChange={(checked) => void followWorks(checked)}
              />
            </label>
          </div>
          <p className={styles.footnote}>
            {t`We will write when a master has free time or moves to another place. At most once a week.`}
          </p>
        </>
      )}

      <SectionCaption className={styles.caption}>{t`Business`}</SectionCaption>
      <div className={styles.list}>
        {places.length > 0 && (
          <NextLink href='/master' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <CalendarCheck />
            </span>
            <span className={styles.label}>{t`My day`}</span>
            <span className={styles.value}>
              {places.length === 1
                ? places[0]?.businessName
                : t`${ph({ count: places.length })} places`}
            </span>
            <CaretRight className={styles.chevron} aria-hidden />
          </NextLink>
        )}
        <NextLink href='/manage' className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <Storefront />
          </span>
          <span className={styles.label}>{t`My businesses`}</span>
          <CaretRight className={styles.chevron} aria-hidden />
        </NextLink>
        <NextLink href='/business/new' className={styles.row}>
          <span className={styles.glyph} aria-hidden>
            <PlusCircle />
          </span>
          <span className={styles.label}>{t`Add your business`}</span>
          <CaretRight className={styles.chevron} aria-hidden />
        </NextLink>
        {/* Platform admins: where people drop out of each scenario, on which devices. */}
        {customer.isAdmin && (
          <NextLink href='/insights' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <ChartBar />
            </span>
            <span className={styles.label}>{t`Funnels`}</span>
            <CaretRight className={styles.chevron} aria-hidden />
          </NextLink>
        )}
        {/* Platform admins: what viewers reported and what was decided about it. */}
        {customer.isAdmin && (
          <NextLink href='/moderation' className={styles.row}>
            <span className={styles.glyph} aria-hidden>
              <Flag />
            </span>
            <span className={styles.label}>{t`Moderation`}</span>
            <CaretRight className={styles.chevron} aria-hidden />
          </NextLink>
        )}
      </div>

      <SectionCaption className={styles.caption}>{t`Your data`}</SectionCaption>
      <div className={styles.list}>
        <button
          type='button'
          className={styles.row}
          disabled={isExporting}
          onClick={() => void handleExport()}
        >
          <span className={styles.glyph} aria-hidden>
            <DownloadSimple />
          </span>
          <span className={styles.label}>{t`Download my data`}</span>
          <span className={styles.value}>{isExporting ? t`Preparing…` : 'JSON'}</span>
        </button>
        {/* Signing out is a row of this group in red, not a lone word under it (the owner: off in a
            corner it looked out of place). It signs out at once: a menu of one «Sign out of account»
            was a second tap asking the same thing (the owner: the extra confirmation was bad). */}
        <button
          type='button'
          className={`${styles.row} ${styles.signOutRow}`}
          onClick={() => void handleSignOut()}
        >
          <span className={styles.glyph} aria-hidden>
            <SignOut />
          </span>
          <span className={styles.label}>{t`Sign out`}</span>
        </button>
      </div>
      <p className={styles.footnote}>
        {t`Your profile, bookings, reviews, bonuses, notifications and favourites in one file.`}{' '}
        {t`Bookings made on this phone stay on it after you sign out.`}
      </p>

      {/* Deleting is held, not confirmed in a dialog (HoldButton), and says what happens. */}
      <div className={styles.deleteAccount}>
        <HoldButton
          icon={<UserMinus aria-hidden />}
          disabled={isDeleting}
          onConfirm={() => void handleDelete()}
        >
          {t`Delete account`}
        </HoldButton>
        <p className={styles.footnote}>
          {t`We delete your profile, photo, sign-in and notifications and cancel upcoming bookings. Past visits stay in the places’ records, and your reviews will be signed “Client”.`}
        </p>
      </div>

      {isTuning && <PreferencesSheet initial={preferences} onClose={() => setIsTuning(false)} />}
      {isNaming && (
        <NameDialog
          name={customer.name}
          onClose={() => setIsNaming(false)}
          onSaved={session.setCustomer}
        />
      )}
    </section>
  )
}
