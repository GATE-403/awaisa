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
import { CITY_AREAS } from '@/shared/config/areas'
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
  gender: { title: 'Для кого подбираем?', note: 'Покажем услуги, которые вам подходят.' },
  interests: { title: 'Что вам интересно?', note: 'Можно несколько: с них начнём подборку.' },
  budget: { title: 'Сколько на визит?', note: 'Дороже почти не покажем.' },
  priority: { title: 'Что важнее при выборе?', note: 'Это поднимем в подборке выше всего.' },
  place: { title: 'Где вам удобно?', note: 'Сначала покажем места рядом.' },
}

const GENDERS: { value: Gender; label: string; glyph: ReactNode }[] = [
  { value: 'female', label: 'Женщине', glyph: <GenderFemale /> },
  { value: 'male', label: 'Мужчине', glyph: <GenderMale /> },
  { value: null, label: 'Не важно', glyph: <Users /> },
]

const BUDGETS: { value: number | null; label: string }[] = [
  { value: 1000, label: 'До 1 000 сом' },
  { value: 2500, label: 'До 2 500 сом' },
  { value: 5000, label: 'До 5 000 сом' },
  { value: null, label: 'Не важно' },
]

const PRIORITIES: { value: Priority; label: string; note: string; glyph: ReactNode }[] = [
  { value: 'near', label: 'Рядом', note: 'Сначала ближайшие места', glyph: <MapPin /> },
  {
    value: 'soon',
    label: 'Свободно сегодня',
    note: 'Чтобы записаться без ожидания',
    glyph: <Clock />,
  },
  { value: 'rating', label: 'Высокий рейтинг', note: 'Места с лучшими отзывами', glyph: <Star /> },
  { value: 'price', label: 'Подешевле', note: 'Сначала недорогие услуги', glyph: <Coins /> },
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
      title: t('Подборка обновлена'),
      description: t('Смотрите «Для вас» в профиле'),
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
    { step: 'gender' as const, text: gender ? t(genderLabel ?? '') : t('Для всех') },
    {
      step: 'interests' as const,
      text:
        interestLabels.length > 2
          ? `${interestLabels.slice(0, 2).join(', ')} +${interestLabels.length - 2}`
          : interestLabels.join(', ') || t('Всё интересно'),
    },
    { step: 'budget' as const, text: budget ? t(budgetLabel ?? '') : t('Любой бюджет') },
    {
      step: 'priority' as const,
      text:
        PRIORITIES.filter((item) => priorities.includes(item.value))
          .map((item) => t(item.label))
          .join(', ') || t('Всё понемногу'),
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
        finish({ label: 'Моё место', lat: coords.latitude, lng: coords.longitude, source: 'gps' }),
      () => setLocating('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <Sheet
      title={t('Подберём для вас')}
      cancelLabel={stepIndex > 0 ? t('Назад') : t('Отмена')}
      onCancel={stepIndex > 0 ? () => setStepIndex((index) => index - 1) : undefined}
      onClose={onClose}
    >
      <div className={styles.steps}>
        <div
          className={styles.stepBar}
          role='progressbar'
          aria-label={t('Вопрос {done} из {total}', {
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
          <ul className={styles.answers} aria-label={t('Ваши ответы')}>
            {answers.map((answer) => (
              <li key={answer.step}>
                <button
                  type='button'
                  className={styles.answer}
                  onClick={() => setStepIndex(STEPS.indexOf(answer.step))}
                  aria-label={t('Изменить: {answer}', { answer: answer.text })}
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
            <ul className={styles.choices} aria-label={t('Для кого')}>
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
              <legend className={styles.srOnly}>{t('Что интересно')}</legend>
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
            <ul className={styles.choices} aria-label={t('Бюджет за визит')}>
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
            <ul className={styles.choices} aria-label={t('Что важнее при выборе?')}>
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
                label={t('Всё понемногу')}
                note={t('Ничего не выделять')}
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
              <ul className={styles.choices} aria-label={t('Где вам удобно?')}>
                <Choice
                  label={locating === 'busy' ? t('Определяем…') : t('Определить автоматически')}
                  note={
                    locating === 'denied'
                      ? t('Не получилось: выберите район ниже')
                      : t('По геолокации телефона')
                  }
                  glyph={<NavigationArrow />}
                  isChosen={myPlace?.source === 'gps'}
                  isBusy={locating === 'busy'}
                  onPick={locate}
                />
              </ul>
              <SectionCaption isInset={false}>{t('Или выберите район')}</SectionCaption>
              <ul className={styles.choices} aria-label={t('Район Бишкека')}>
                {CITY_AREAS.map((area) => (
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
                  label={t('Не учитывать место')}
                  isChosen={initial !== null && !myPlace}
                  onPick={() => finish(null)}
                />
              </ul>
            </>
          )}
        </div>

        <p className={styles.stepFooter}>
          {t(
            'Ответы остаются на этом телефоне и вместе с вашими визитами решают, что попадёт в «Для вас».',
          )}
        </p>

        {/* Back is the bar's left button, as in every sheet with steps; the one-answer steps move
            on by themselves, so a capsule is drawn only where it is needed. */}
        {(step === 'interests' || step === 'priority') && (
          <div className={styles.stepActions}>
            <Button onClick={next}>
              {(step === 'interests' ? interests : priorities).length > 0
                ? t('Далее')
                : t('Пропустить')}
            </Button>
          </div>
        )}
        {step === 'place' && myPlace && (
          <div className={styles.stepActions}>
            <Button onClick={() => finish()}>
              {t('Оставить «{place}»', { place: myPlace.label })}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
