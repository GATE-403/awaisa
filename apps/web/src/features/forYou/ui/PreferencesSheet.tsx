'use client'

import { Button } from '@awaisa/ui/Button'
import { useToast } from '@awaisa/ui/Toast'
import {
  CaretRight,
  Check,
  Clock,
  Coins,
  GenderFemale,
  GenderMale,
  MapPin,
  NavigationArrow,
  Shuffle,
  Star,
  Users,
} from '@phosphor-icons/react/ssr'
import { type CSSProperties, type ReactNode, useState } from 'react'
import { BISHKEK_AREAS } from '@/shared/config/areas'
import { useT } from '@/shared/i18n'
import { type MyPlace, saveMyPlace, useMyPlace } from '@/shared/lib/myPlace'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import {
  INTERESTS,
  type Interest,
  type Preferences,
  type Priority,
  savePreferences,
} from '../lib/preferences'
import styles from './ForYou.module.css'

interface PreferencesSheetProps {
  initial: Preferences | null
  onClose: () => void
}

type Step = 'gender' | 'interests' | 'budget' | 'priority' | 'place'
type Gender = Preferences['gender']

const STEPS: Step[] = ['gender', 'interests', 'budget', 'priority', 'place']

const TITLES: Record<Step, { title: string; note: string }> = {
  gender: { title: 'Who are we picking for?', note: 'We will show services that suit you.' },
  interests: { title: 'What are you into?', note: 'Pick a few: the picks start with them.' },
  budget: { title: 'How much per visit?', note: 'We will rarely show pricier ones.' },
  priority: { title: 'What matters most?', note: 'We will put this first in your picks.' },
  place: { title: 'Where suits you?', note: 'We will show places nearby first.' },
}

const GENDERS: { value: Gender; label: string; glyph: ReactNode }[] = [
  { value: 'female', label: 'Woman', glyph: <GenderFemale /> },
  { value: 'male', label: 'Man', glyph: <GenderMale /> },
  { value: null, label: 'Any', glyph: <Users /> },
]

const BUDGETS: { value: number | null; label: string }[] = [
  { value: 1000, label: 'Up to 1 000 som' },
  { value: 2500, label: 'Up to 2 500 som' },
  { value: 5000, label: 'Up to 5 000 som' },
  { value: null, label: 'Any' },
]

const PRIORITIES: { value: Priority; label: string; note: string; glyph: ReactNode }[] = [
  { value: 'near', label: 'Nearby', note: 'Nearest places first', glyph: <MapPin /> },
  {
    value: 'soon',
    label: 'Free today',
    note: 'To book without waiting',
    glyph: <Clock />,
  },
  { value: 'rating', label: 'Top rated', note: 'Places with the best reviews', glyph: <Star /> },
  { value: 'price', label: 'Cheaper', note: 'Affordable services first', glyph: <Coins /> },
]

interface ChoiceProps {
  label: string
  note?: string
  glyph?: ReactNode
  isChosen: boolean
  isBusy?: boolean
  /** One of several that can be ticked: no chevron, the row stays. */
  isMulti?: boolean
  onPick: () => void
}

// One answer as a row, like the kinds in the business setup: a tap picks it and moves on; the
// answer given before carries a check, the others a chevron. Several-answer rows only tick.
const Choice = ({ label, note, glyph, isChosen, isBusy, isMulti, onPick }: ChoiceProps) => (
  <li>
    <button
      type='button'
      className={styles.choice}
      onClick={onPick}
      aria-current={!isMulti && isChosen ? true : undefined}
      aria-pressed={isMulti ? isChosen : undefined}
      disabled={isBusy}
    >
      {glyph && (
        <span className={styles.choiceGlyph} aria-hidden>
          {glyph}
        </span>
      )}
      <span className={styles.choiceBody}>
        <span className={styles.choiceTitle}>{label}</span>
        {note && <span className={styles.choiceNote}>{note}</span>}
      </span>
      {isChosen && <Check className={styles.choiceCheck} aria-hidden />}
      {!isChosen && !isMulti && <CaretRight className={styles.choiceChevron} aria-hidden />}
    </button>
  </li>
)

// «Подберём для вас» as steps, like the business setup: one question a screen, a bar of segments
// for how far along, one tap answers and moves on (several interests or priorities take «Далее»); the answers so far
// ride above the question as capsules back to their step («хотел бы увидеть что я выбрал до»). The answers
// stay on the device and shape «Для вас»; the place is the device's own «Где вы?».
export const PreferencesSheet = ({ initial, onClose }: PreferencesSheetProps) => {
  const t = useT()
  const toast = useToast()
  const myPlace = useMyPlace()
  const [stepIndex, setStepIndex] = useState(0)
  const [gender, setGender] = useState<Gender>(initial?.gender ?? null)
  const [interests, setInterests] = useState<Interest[]>(initial?.interests ?? [])
  const [budget, setBudget] = useState<number | null>(initial?.budget ?? null)
  const [priorities, setPriorities] = useState<Priority[]>(initial?.priorities ?? [])
  const [locating, setLocating] = useState<'idle' | 'busy' | 'denied'>('idle')
  const step = STEPS[stepIndex] ?? 'gender'
  const heading = TITLES[step]
  const shown = INTERESTS.filter((item) => !item.for || !gender || item.for === gender)

  const next = () => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))

  const finish = (place?: MyPlace | null) => {
    if (place !== undefined) saveMyPlace(place)
    savePreferences({
      gender,
      interests: interests.filter((item) => shown.some((option) => option.value === item)),
      budget,
      priorities,
    })
    toast.show({
      title: t('Picks updated'),
      description: t('See «For you» in your profile'),
      type: 'success',
    })
    onClose()
  }

  const toggle = (value: Interest) =>
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )

  const togglePriority = (value: Priority) =>
    setPriorities((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )

  // What was answered on the steps before this one, each a capsule back to its step.
  const genderLabel = GENDERS.find((item) => item.value === gender)?.label
  const budgetLabel = BUDGETS.find((item) => item.value === budget)?.label
  const interestLabels = interests
    .map((value) => INTERESTS.find((item) => item.value === value)?.label)
    .filter((label): label is string => Boolean(label))
    .map((label) => t(label))
  const answers: { step: Step; text: string }[] = [
    { step: 'gender' as const, text: gender ? t(genderLabel ?? '') : t('For everyone') },
    {
      step: 'interests' as const,
      text:
        interestLabels.length > 2
          ? `${interestLabels.slice(0, 2).join(', ')} +${interestLabels.length - 2}`
          : interestLabels.join(', ') || t('Everything'),
    },
    { step: 'budget' as const, text: budget ? t(budgetLabel ?? '') : t('Any budget') },
    {
      step: 'priority' as const,
      text:
        PRIORITIES.filter((item) => priorities.includes(item.value))
          .map((item) => t(item.label))
          .join(', ') || t('A bit of everything'),
    },
  ].filter((answer) => STEPS.indexOf(answer.step) < stepIndex)

  const locate = () => {
    if (!navigator.geolocation) {
      setLocating('denied')
      return
    }
    setLocating('busy')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        finish({
          label: 'My location',
          lat: coords.latitude,
          lng: coords.longitude,
          source: 'gps',
        }),
      () => setLocating('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <Sheet
      title={t('Picks for you')}
      cancelLabel={stepIndex > 0 ? t('Back') : t('Cancel')}
      onCancel={stepIndex > 0 ? () => setStepIndex((index) => index - 1) : undefined}
      onClose={onClose}
    >
      <div className={styles.steps}>
        <div
          className={styles.stepBar}
          role='progressbar'
          aria-label={t('Question {done} of {total}', {
            done: stepIndex + 1,
            total: STEPS.length,
          })}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={stepIndex + 1}
        >
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={styles.stepSegment}
              style={{ '--fill': index <= stepIndex ? 1 : 0 } as CSSProperties}
            />
          ))}
        </div>

        {answers.length > 0 && (
          <ul className={styles.answers} aria-label={t('Your answers')}>
            {answers.map((answer) => (
              <li key={answer.step}>
                <button
                  type='button'
                  className={styles.answer}
                  onClick={() => setStepIndex(STEPS.indexOf(answer.step))}
                  aria-label={t('Change: {answer}', { answer: answer.text })}
                >
                  {answer.text}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div key={step} className={styles.stepBody}>
          <div className={styles.stepHeading}>
            <h3 className={styles.stepTitle}>{t(heading.title)}</h3>
            <p className={styles.stepNote}>{t(heading.note)}</p>
          </div>

          {step === 'gender' && (
            <ul className={styles.choices} aria-label={t('For whom')}>
              {GENDERS.map((item) => (
                <Choice
                  key={item.label}
                  label={t(item.label)}
                  glyph={item.glyph}
                  isChosen={initial !== null && gender === item.value}
                  onPick={() => {
                    setGender(item.value)
                    next()
                  }}
                />
              ))}
            </ul>
          )}

          {step === 'interests' && (
            <fieldset className={styles.interestGrid}>
              <legend className={styles.srOnly}>{t('Interests')}</legend>
              {shown.map((item) => (
                <label key={item.value} className={styles.interestCell}>
                  {t(item.label)}
                  <input
                    type='checkbox'
                    checked={interests.includes(item.value)}
                    onChange={() => toggle(item.value)}
                  />
                  <Check className={styles.interestCheck} aria-hidden />
                </label>
              ))}
            </fieldset>
          )}

          {step === 'budget' && (
            <ul className={styles.choices} aria-label={t('Budget per visit')}>
              {BUDGETS.map((item) => (
                <Choice
                  key={item.label}
                  label={t(item.label)}
                  isChosen={initial !== null && budget === item.value}
                  onPick={() => {
                    setBudget(item.value)
                    next()
                  }}
                />
              ))}
            </ul>
          )}

          {step === 'priority' && (
            <ul className={styles.choices} aria-label={t('What matters most?')}>
              {PRIORITIES.map((item) => (
                <Choice
                  key={item.value}
                  label={t(item.label)}
                  note={t(item.note)}
                  glyph={item.glyph}
                  isMulti
                  isChosen={priorities.includes(item.value)}
                  onPick={() => togglePriority(item.value)}
                />
              ))}
              {/* Nothing in particular: clears the ticks and moves on. */}
              <Choice
                label={t('A bit of everything')}
                note={t('Nothing in particular')}
                glyph={<Shuffle />}
                isChosen={initial !== null && priorities.length === 0}
                onPick={() => {
                  setPriorities([])
                  next()
                }}
              />
            </ul>
          )}

          {step === 'place' && (
            <>
              <ul className={styles.choices} aria-label={t('Where suits you?')}>
                <Choice
                  label={locating === 'busy' ? t('Locating…') : t('Detect automatically')}
                  note={
                    locating === 'denied'
                      ? t('That did not work: pick a district below')
                      : t('By your phone location')
                  }
                  glyph={<NavigationArrow />}
                  isChosen={myPlace?.source === 'gps'}
                  isBusy={locating === 'busy'}
                  onPick={locate}
                />
              </ul>
              <SectionCaption isInset={false}>{t('Or pick a district')}</SectionCaption>
              <ul className={styles.choices} aria-label={t('Bishkek district')}>
                {BISHKEK_AREAS.map((area) => (
                  <Choice
                    key={area.label}
                    label={area.label}
                    isChosen={myPlace?.source === 'area' && myPlace.label === area.label}
                    onPick={() =>
                      finish({ label: area.label, lat: area.lat, lng: area.lng, source: 'area' })
                    }
                  />
                ))}
                <Choice
                  label={t('Ignore my location')}
                  isChosen={initial !== null && !myPlace}
                  onPick={() => finish(null)}
                />
              </ul>
            </>
          )}
        </div>

        <p className={styles.stepFooter}>
          {t(
            'Your answers stay on this phone and, with your visits, decide what goes into «For you».',
          )}
        </p>

        {/* Back is the bar's left button, as in every sheet with steps; the one-answer steps move
            on by themselves, so a capsule is drawn only where it is needed. */}
        {(step === 'interests' || step === 'priority') && (
          <div className={styles.stepActions}>
            <Button onClick={next}>
              {(step === 'interests' ? interests : priorities).length > 0 ? t('Next') : t('Skip')}
            </Button>
          </div>
        )}
        {step === 'place' && myPlace && (
          <div className={styles.stepActions}>
            <Button onClick={() => finish()}>
              {t('Keep «{place}»', { place: myPlace.label })}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
