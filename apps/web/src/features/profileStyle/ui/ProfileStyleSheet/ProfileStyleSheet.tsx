'use client'

import { Input } from '@awaisa/ui/Input'
import { Menu, MenuItem } from '@awaisa/ui/Menu'
import { Select } from '@awaisa/ui/Select'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import type { MessageDescriptor } from '@lingui/core'
import { msg, ph } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import {
  CaretUpDown,
  ChatCircleText,
  Check,
  Eye,
  EyeSlash,
  Globe,
  LinkSimple,
  MapPin,
  Medal,
  Palette,
  Smiley,
  TextAlignLeft,
  TiktokLogo,
  User,
} from '@phosphor-icons/react/ssr'
import { type ComponentType, type FormEvent, useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import {
  ACCENTS,
  achievementLook,
  achievementTitle,
  ProfileHead,
  ProfileHeadText,
  profileStyle,
  STATUS_EMOJI,
} from '@/entities/profile'
import { getErrorMessage } from '@/shared/api/apiError'
import type { ProfileLinkKind, ProfileSettings, PublicProfile } from '@/shared/api/types'
import { InstagramMark, TelegramMark } from '@/shared/ui/BrandLogo/BrandLogo'
import { RowNote } from '@/shared/ui/RowNote/RowNote'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import styles from './ProfileStyleSheet.module.css'

const LINK_FIELDS: {
  kind: ProfileLinkKind
  label: MessageDescriptor
  placeholder: MessageDescriptor
}[] = [
  { kind: 'instagram', label: msg`Instagram`, placeholder: msg`@handle` },
  { kind: 'telegram', label: msg`Telegram`, placeholder: msg`@handle` },
  { kind: 'tiktok', label: msg`TikTok`, placeholder: msg`@handle` },
  { kind: 'website', label: msg`Website`, placeholder: msg`example.kg` },
]

const MAX_FEATURED = 3
const STATUS_MAX = 80
const ABOUT_MAX = 160

const LINK_GLYPHS: Record<ProfileLinkKind, ComponentType> = {
  instagram: InstagramMark,
  telegram: TelegramMark,
  tiktok: TiktokLogo,
  website: Globe,
}

// What is left of a field's length, shown only near its end (the owner asked for a limit).
const Counter = ({ value, max }: { value: string; max: number }) =>
  value.length >= max * 0.7 ? (
    <span className={styles.counter} aria-live='polite'>
      {max - value.length}
    </span>
  ) : null

interface ProfileStyleFormProps {
  /** The form's id: the sheet's «Done» submits it from the bar. */
  formId: string
  settings: ProfileSettings
  profile: PublicProfile | null
  name: string
  avatarUrl: string | null
  onSave: (input: Partial<Omit<ProfileSettings, 'id'>>) => Promise<void>
  /** Saved: the caller closes the sheet or goes back to the profile. */
  onDone: () => void
  onSavingChange?: (isSaving: boolean) => void
}

interface ProfileStyleSheetProps
  extends Omit<ProfileStyleFormProps, 'formId' | 'onDone' | 'onSavingChange'> {
  onClose: () => void
}

const SHEET_FORM_ID = 'profile-style-form'

// How the profile looks to others: a live preview, the colour, a short status and who sees it.
// A sheet of its own on the profile page; inside the profile's own sheet the same form takes its
// place (the owner wanted the look changed right there), so there is no sheet over a sheet.
export const ProfileStyleSheet = ({ onClose, ...props }: ProfileStyleSheetProps) => {
  const { t } = useLingui()
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Sheet
      title={t`Profile`}
      onClose={onClose}
      action={{
        label: isSaving ? t`Saving…` : t`Done`,
        form: SHEET_FORM_ID,
        disabled: isSaving,
      }}
    >
      <ProfileStyleForm
        {...props}
        formId={SHEET_FORM_ID}
        onDone={onClose}
        onSavingChange={setIsSaving}
      />
    </Sheet>
  )
}

export const ProfileStyleForm = ({
  formId,
  settings,
  profile,
  name,
  avatarUrl,
  onSave,
  onDone,
  onSavingChange,
}: ProfileStyleFormProps) => {
  const { t } = useLingui()
  const toast = useToast()
  const [accent, setAccent] = useState(settings.accent)
  const [status, setStatus] = useState(settings.status)
  const [statusEmoji, setStatusEmoji] = useState(settings.statusEmoji)
  const [about, setAbout] = useState(settings.about)
  const [handle, setHandle] = useState(settings.handle ?? '')
  const [links, setLinks] = useState(settings.links ?? {})
  const setLink = (kind: ProfileLinkKind, value: string) =>
    setLinks((current) => ({ ...current, [kind]: value }))
  const [featured, setFeatured] = useState(settings.featuredBadges)
  const [favoriteMasterId, setFavoriteMasterId] = useState(settings.favoriteMasterId)
  const earned = profile?.achievements.filter((item) => item.earned) ?? []
  const masters = profile?.masters ?? []

  // Up to three, in the order picked; a tap on a shown one takes it off.
  const toggleFeatured = (id: string) =>
    setFeatured((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < MAX_FEATURED
          ? [...current, id]
          : current,
    )
  const [isPublic, setIsPublic] = useState(settings.isPublic)
  const [showPlaces, setShowPlaces] = useState(settings.showPlaces)
  const save = async (event: FormEvent) => {
    event.preventDefault()
    onSavingChange?.(true)
    try {
      await onSave({
        accent,
        status: status.trim(),
        statusEmoji,
        about: about.trim(),
        links: Object.fromEntries(
          LINK_FIELDS.map(({ kind }) => [kind, (links[kind] ?? '').trim()]),
        ),
        handle: handle.trim() ? handle.trim().toLowerCase() : null,
        featuredBadges: featured,
        favoriteMasterId,
        isPublic,
        showPlaces,
      })
      toast.show({ title: t`Profile updated`, type: 'success' })
      onSavingChange?.(false)
      onDone()
    } catch (error) {
      toast.show({
        title: t`Could not save`,
        description: getErrorMessage(error),
        type: 'error',
      })
      onSavingChange?.(false)
    }
  }

  return (
    <form id={formId} className={styles.form} onSubmit={(event) => void save(event)}>
      {/* The preview is the profile's own head (`ProfileHead`), in the chosen colour. */}
      <div style={profileStyle(accent)} aria-hidden>
        <ProfileHead face={<PersonAvatar name={name} src={avatarUrl ?? undefined} size='xl' />}>
          <ProfileHeadText
            name={name}
            emoji={statusEmoji}
            meta={
              <span className={styles.previewLevel}>
                {t`Level ${ph({ level: profile?.level.level ?? 1 })}`}
                {featured.map((id) => (
                  <span key={id} className={styles.previewBadge}>
                    {achievementLook(id).emoji}
                  </span>
                ))}
              </span>
            }
          >
            {status.trim() && <p className={styles.previewStatus}>{status.trim()}</p>}
            {about.trim() && <p className={styles.previewAbout}>{about.trim()}</p>}
          </ProfileHeadText>
        </ProfileHead>
      </div>

      {/* Laid out like the cabinet's sheets (the owner asked for the dashboard look): rows right on the
          sheet, a thin glyph before each label, the control on the right, a ↳ note under a group. */}
      <div className={styles.group}>
        <div className={styles.row}>
          <Palette className={styles.glyph} aria-hidden />
          <span className={styles.label}>{t`Colour`}</span>
          <Select
            variant='plain'
            aria-label={t`Profile colour`}
            items={Object.entries(ACCENTS).map(([key, item]) => ({
              value: key,
              label: (
                <span className={styles.option}>
                  <span className={styles.swatch} style={profileStyle(key)} aria-hidden />
                  {t(item.label)}
                </span>
              ),
            }))}
            value={accent}
            onValueChange={(value) => value && setAccent(value)}
          />
        </div>
        <div className={styles.row}>
          <Smiley className={styles.glyph} aria-hidden />
          <span className={styles.label}>{t`Emoji`}</span>
          <Select
            variant='plain'
            aria-label={t`Status emoji`}
            items={[
              { value: '', label: t`No emoji` },
              ...STATUS_EMOJI.map((emoji) => ({ value: emoji, label: emoji })),
            ]}
            value={statusEmoji}
            onValueChange={(value) => setStatusEmoji(value ?? '')}
          />
        </div>
        <label className={styles.row}>
          <ChatCircleText className={styles.glyph} aria-hidden />
          <span className={styles.field}>
            <Input
              variant='plain'
              aria-label={t`Status`}
              placeholder={t`Status, e.g. “Going to Azamat since 2024”`}
              value={status}
              maxLength={STATUS_MAX}
              onValueChange={setStatus}
            />
          </span>
          <Counter value={status} max={STATUS_MAX} />
        </label>
        <label className={`${styles.row} ${styles.rowTop}`}>
          <TextAlignLeft className={styles.glyph} aria-hidden />
          <textarea
            className={styles.about}
            aria-label={t`About me`}
            placeholder={t`About you: what you love, who you go to`}
            value={about}
            maxLength={ABOUT_MAX}
            rows={2}
            onChange={(event) => setAbout(event.target.value)}
          />
          <Counter value={about} max={ABOUT_MAX} />
        </label>
      </div>

      <div className={styles.group}>
        <label className={styles.row}>
          <LinkSimple className={styles.glyph} aria-hidden />
          <span className={styles.addressPrefix}>awaisa.kg/u/</span>
          <span className={styles.field}>
            <Input
              variant='plain'
              aria-label={t`Profile address`}
              placeholder={t`your-handle`}
              value={handle}
              maxLength={20}
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              onValueChange={(value) => setHandle(value.replace(/[^a-zA-Z0-9_.]/g, ''))}
            />
          </span>
        </label>
        <RowNote>
          {t`Latin letters, digits, “_” and “.”, 3 or more: a short link for your bio and stories.`}
        </RowNote>
      </div>

      <div className={styles.group}>
        {LINK_FIELDS.map(({ kind, label, placeholder }) => {
          const Glyph = LINK_GLYPHS[kind]
          return (
            <label key={kind} className={styles.row}>
              <span className={styles.glyph} aria-hidden>
                <Glyph />
              </span>
              <span className={styles.label}>{t(label)}</span>
              <span className={styles.value}>
                <Input
                  variant='plain'
                  aria-label={t(label)}
                  placeholder={t(placeholder)}
                  value={links[kind] ?? ''}
                  maxLength={200}
                  inputMode={kind === 'website' ? 'url' : 'text'}
                  autoCapitalize='none'
                  autoCorrect='off'
                  spellCheck={false}
                  onValueChange={(value) => setLink(kind, value)}
                />
              </span>
            </label>
          )
        })}
        <RowNote>{t`A handle or a link: shown as icons on your page.`}</RowNote>
      </div>

      {earned.length > 0 && (
        // The showcase as options too (the owner: options work here too): one row, the chosen medals
        // as emoji on its right, a menu that ticks up to three and stays open while you pick.
        <div className={styles.group}>
          <div className={styles.row}>
            <Medal className={styles.glyph} aria-hidden />
            <span className={styles.label}>{t`Showcase`}</span>
            <Menu
              label={t`Showcase: achievements by your level`}
              className={styles.menuTrigger}
              trigger={
                <>
                  <span className={styles.menuValue}>
                    {featured.length > 0
                      ? featured.map((id) => achievementLook(id).emoji).join(' ')
                      : t`None`}
                  </span>
                  <CaretUpDown aria-hidden />
                </>
              }
            >
              {earned.map((item) => {
                const isOn = featured.includes(item.id)
                return (
                  <MenuItem
                    key={item.id}
                    closeOnClick={false}
                    disabled={!isOn && featured.length >= MAX_FEATURED}
                    icon={isOn ? <Check /> : undefined}
                    onClick={() => toggleFeatured(item.id)}
                  >
                    {achievementLook(item.id).emoji} {achievementTitle(item.title, t)}
                  </MenuItem>
                )
              })}
            </Menu>
          </div>
          <RowNote>{t`Up to three achievements, next to your level.`}</RowNote>
        </div>
      )}

      <div className={styles.group}>
        {masters.length > 0 && (
          <div className={styles.row}>
            <User className={styles.glyph} aria-hidden />
            <span className={styles.label}>{t`My specialist`}</span>
            <Select
              variant='plain'
              aria-label={t`My specialist`}
              items={[
                { value: '', label: t`Do not show` },
                ...masters.map((master) => ({
                  value: master.id,
                  label: `${master.name.split(' ')[0]} · ${master.businessName}`,
                })),
              ]}
              value={favoriteMasterId ?? ''}
              onValueChange={(value) => setFavoriteMasterId(value || null)}
            />
          </div>
        )}
        <label className={styles.row}>
          {isPublic ? (
            <Eye className={styles.glyph} aria-hidden />
          ) : (
            <EyeSlash className={styles.glyph} aria-hidden />
          )}
          <span className={styles.label}>{t`Public profile`}</span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
        <label className={styles.row}>
          <MapPin className={styles.glyph} aria-hidden />
          <span className={styles.label}>{t`Specialists and places`}</span>
          <Switch checked={showPlaces} onCheckedChange={setShowPlaces} />
        </label>
        <RowNote>
          {t`A public profile is seen by its link and from your reviews. Level and achievements come from visits and reviews.`}
        </RowNote>
      </div>
    </form>
  )
}
