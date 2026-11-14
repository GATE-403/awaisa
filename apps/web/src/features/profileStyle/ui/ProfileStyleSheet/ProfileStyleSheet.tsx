'use client'

import { Input } from '@awaisa/ui/Input'
import { Switch } from '@awaisa/ui/Switch'
import { useToast } from '@awaisa/ui/Toast'
import { Check } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { PersonAvatar } from '@/entities/business'
import { ACCENTS, achievementLook, profileStyle, STATUS_EMOJI } from '@/entities/profile'
import { getErrorMessage } from '@/shared/api/apiError'
import type { ProfileSettings, PublicProfile } from '@/shared/api/types'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './ProfileStyleSheet.module.css'

const MAX_FEATURED = 3

interface ProfileStyleSheetProps {
  settings: ProfileSettings
  profile: PublicProfile | null
  name: string
  avatarUrl: string | null
  onSave: (input: Partial<Omit<ProfileSettings, 'id'>>) => Promise<void>
  onClose: () => void
}

// How the profile looks to others: a live preview, the colour, a short status and who sees it.
export const ProfileStyleSheet = ({
  settings,
  profile,
  name,
  avatarUrl,
  onSave,
  onClose,
}: ProfileStyleSheetProps) => {
  const toast = useToast()
  const [accent, setAccent] = useState(settings.accent)
  const [status, setStatus] = useState(settings.status)
  const [statusEmoji, setStatusEmoji] = useState(settings.statusEmoji)
  const [about, setAbout] = useState(settings.about)
  const [handle, setHandle] = useState(settings.handle ?? '')
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
  const [isSaving, setIsSaving] = useState(false)

  const save = async () => {
    setIsSaving(true)
    try {
      await onSave({
        accent,
        status: status.trim(),
        statusEmoji,
        about: about.trim(),
        handle: handle.trim() ? handle.trim().toLowerCase() : null,
        featuredBadges: featured,
        favoriteMasterId,
        isPublic,
        showPlaces,
      })
      toast.show({ title: 'Профиль обновлён', type: 'success' })
      onClose()
    } catch (error) {
      toast.show({
        title: 'Не получилось сохранить',
        description: getErrorMessage(error),
        type: 'error',
      })
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      title='Профиль'
      onClose={onClose}
      action={{ label: isSaving ? 'Сохраняем…' : 'Готово', onClick: save, disabled: isSaving }}
    >
      <div className={styles.preview} style={profileStyle(accent)} aria-hidden>
        <PersonAvatar name={name} src={avatarUrl ?? undefined} size='xl' className={styles.face} />
        <p className={styles.previewName}>{name}</p>
        {(status.trim() || statusEmoji) && (
          <p className={styles.previewStatus}>
            {statusEmoji} {status.trim()}
          </p>
        )}
        <p className={styles.previewLevel}>
          Уровень {profile?.level.level ?? 1}
          {featured.map((id) => (
            <span key={id} className={styles.previewBadge}>
              {achievementLook(id).emoji}
            </span>
          ))}
        </p>
        {about.trim() && <p className={styles.previewAbout}>{about.trim()}</p>}
      </div>

      <div className={sheet.group}>
        <h3 className={sheet.groupTitle}>Цвет</h3>
        <div className={styles.accents} role='radiogroup' aria-label='Цвет профиля'>
          {Object.entries(ACCENTS).map(([key, item]) => (
            <label key={key} className={styles.accentOption} style={profileStyle(key)}>
              <input
                type='radio'
                name='accent'
                className={styles.input}
                checked={accent === key}
                onChange={() => setAccent(key)}
                aria-label={item.label}
              />
              <Check className={styles.check} weight='bold' aria-hidden />
            </label>
          ))}
        </div>
      </div>

      <div className={sheet.group}>
        <h3 className={sheet.groupTitle}>Статус</h3>
        <div className={styles.emojis} role='radiogroup' aria-label='Эмодзи статуса'>
          <label className={styles.emojiOption} data-none=''>
            <input
              type='radio'
              name='status-emoji'
              className={styles.input}
              checked={statusEmoji === ''}
              onChange={() => setStatusEmoji('')}
              aria-label='Без эмодзи'
            />
            <span aria-hidden>—</span>
          </label>
          {STATUS_EMOJI.map((emoji) => (
            <label key={emoji} className={styles.emojiOption}>
              <input
                type='radio'
                name='status-emoji'
                className={styles.input}
                checked={statusEmoji === emoji}
                onChange={() => setStatusEmoji(emoji)}
                aria-label={`Эмодзи ${emoji}`}
              />
              <span aria-hidden>{emoji}</span>
            </label>
          ))}
        </div>
        <div className={sheet.list}>
          <label className={`${sheet.row} ${sheet.textRow}`}>
            <Input
              variant='plain'
              aria-label='Статус'
              placeholder='Статус, например «Хожу к Азамату с 2024»'
              value={status}
              maxLength={80}
              onValueChange={setStatus}
            />
          </label>
        </div>
      </div>

      <div className={sheet.group}>
        <h3 className={sheet.groupTitle}>Адрес профиля</h3>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={styles.addressPrefix}>awaisa.kg/u/</span>
            <Input
              variant='plain'
              aria-label='Адрес профиля'
              placeholder='ваш-ник'
              value={handle}
              maxLength={20}
              autoCapitalize='none'
              autoCorrect='off'
              spellCheck={false}
              onValueChange={(value) => setHandle(value.replace(/[^a-zA-Z0-9_.]/g, ''))}
            />
          </label>
        </div>
        <p className={sheet.groupFooter}>
          Латиница, цифры, «_» и «.», от 3 символов — короткая ссылка для био и сторис.
        </p>
      </div>

      <div className={sheet.group}>
        <h3 className={sheet.groupTitle}>О себе</h3>
        <div className={sheet.list}>
          <textarea
            className={styles.about}
            aria-label='О себе'
            placeholder='Пара строк: что любите, к кому ходите'
            value={about}
            maxLength={160}
            rows={3}
            onChange={(event) => setAbout(event.target.value)}
          />
        </div>
      </div>

      {earned.length > 0 && (
        <div className={sheet.group}>
          <h3 className={sheet.groupTitle}>Витрина</h3>
          <div className={styles.showcase}>
            {earned.map((item) => {
              const isOn = featured.includes(item.id)
              return (
                <button
                  key={item.id}
                  type='button'
                  className={styles.showcaseChip}
                  aria-pressed={isOn}
                  disabled={!isOn && featured.length >= MAX_FEATURED}
                  onClick={() => toggleFeatured(item.id)}
                >
                  <span aria-hidden>{achievementLook(item.id).emoji}</span>
                  {item.title}
                </button>
              )
            })}
          </div>
          <p className={sheet.groupFooter}>До трёх достижений — рядом с вашим уровнем.</p>
        </div>
      )}

      {masters.length > 0 && (
        <div className={sheet.group}>
          <h3 className={sheet.groupTitle}>Мой мастер</h3>
          <div className={styles.masters} role='radiogroup' aria-label='Мой мастер'>
            <label className={styles.masterOption}>
              <input
                type='radio'
                name='favorite-master'
                className={styles.input}
                checked={favoriteMasterId === null}
                onChange={() => setFavoriteMasterId(null)}
                aria-label='Не показывать'
              />
              <span className={styles.masterNone} aria-hidden>
                —
              </span>
              <span className={styles.masterName}>Никто</span>
            </label>
            {masters.map((master) => (
              <label key={master.id} className={styles.masterOption}>
                <input
                  type='radio'
                  name='favorite-master'
                  className={styles.input}
                  checked={favoriteMasterId === master.id}
                  onChange={() => setFavoriteMasterId(master.id)}
                  aria-label={`${master.name}, ${master.businessName}`}
                />
                <PersonAvatar name={master.name} src={master.photoUrl ?? undefined} size='lg' />
                <span className={styles.masterName}>{master.name.split(' ')[0]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className={sheet.group}>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Открытый профиль</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>Мастера и места</span>
            <Switch checked={showPlaces} onCheckedChange={setShowPlaces} />
          </label>
        </div>
        <p className={sheet.groupFooter}>
          Открытый профиль видят по ссылке и из ваших отзывов. Уровень и достижения — за визиты и
          отзывы.
        </p>
      </div>
    </Sheet>
  )
}
