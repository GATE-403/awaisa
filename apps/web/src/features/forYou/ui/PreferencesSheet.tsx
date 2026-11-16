'use client'

import { useToast } from '@awaisa/ui/Toast'
import { Check } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { SegmentedControl } from '@/shared/ui/SegmentedControl/SegmentedControl'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import { INTERESTS, type Interest, type Preferences, savePreferences } from '../lib/preferences'
import styles from './ForYou.module.css'

interface PreferencesSheetProps {
  initial: Preferences | null
  onClose: () => void
}

type GenderChoice = 'male' | 'female' | 'any'
type BudgetChoice = '1000' | '2500' | 'any'

const GENDERS: { value: GenderChoice; label: string }[] = [
  { value: 'female', label: 'Женщине' },
  { value: 'male', label: 'Мужчине' },
  { value: 'any', label: 'Не важно' },
]

const BUDGETS: { value: BudgetChoice; label: string }[] = [
  { value: '1000', label: 'До 1 000' },
  { value: '2500', label: 'До 2 500' },
  { value: 'any', label: 'Не важно' },
]

// Three quick questions, all optional: who it is for, what they like, how much a visit may cost.
// The answers stay on the device and shape «Для вас»; they can be changed any time.
export const PreferencesSheet = ({ initial, onClose }: PreferencesSheetProps) => {
  const toast = useToast()
  const [gender, setGender] = useState<GenderChoice>(initial?.gender ?? 'any')
  const [interests, setInterests] = useState<Interest[]>(initial?.interests ?? [])
  const [budget, setBudget] = useState<BudgetChoice>(
    initial?.budget ? (String(initial.budget) as BudgetChoice) : 'any',
  )
  const shown = INTERESTS.filter((item) => !item.for || gender === 'any' || item.for === gender)

  const toggle = (value: Interest) =>
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    )

  const save = () => {
    savePreferences({
      gender: gender === 'any' ? null : gender,
      interests: interests.filter((item) => shown.some((option) => option.value === item)),
      budget: budget === 'any' ? null : Number(budget),
    })
    toast.show({
      title: 'Подборка обновлена',
      description: 'Смотрите «Для вас» в профиле',
      type: 'success',
    })
    onClose()
  }

  return (
    <Sheet title='Подберём для вас' onClose={onClose} action={{ label: 'Готово', onClick: save }}>
      <div className={sheet.form}>
        <section className={sheet.group}>
          <SectionCaption>Для кого</SectionCaption>
          <SegmentedControl label='Для кого' value={gender} items={GENDERS} onChange={setGender} />
        </section>

        <section className={sheet.group}>
          <SectionCaption>Что интересно</SectionCaption>
          {/* Two columns of checkmark rows: nine choices in five rows. */}
          <div className={styles.interestGrid}>
            {shown.map((item) => (
              <label key={item.value} className={styles.interestCell}>
                {item.label}
                <input
                  type='checkbox'
                  checked={interests.includes(item.value)}
                  onChange={() => toggle(item.value)}
                />
                <Check className={sheet.check} weight='bold' aria-hidden />
              </label>
            ))}
          </div>
        </section>

        <section className={sheet.group}>
          <SectionCaption>Бюджет за визит, сом</SectionCaption>
          <SegmentedControl
            label='Бюджет за визит'
            value={budget}
            items={BUDGETS}
            onChange={setBudget}
          />
          <p className={sheet.groupFooter}>
            Ответы остаются на этом телефоне и вместе с вашими визитами решают, что попадёт в «Для
            вас».
          </p>
        </section>
      </div>
    </Sheet>
  )
}
