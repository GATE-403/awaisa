'use client'

import { Check, NavigationArrow } from '@phosphor-icons/react/ssr'
import { useState } from 'react'
import { BISHKEK_AREAS } from '@/shared/config/areas'
import { type MyPlace, saveMyPlace, useMyPlace } from '@/shared/lib/myPlace'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './PlacePickerSheet.module.css'

interface PlacePickerSheetProps {
  onClose: () => void
  onPicked?: (place: MyPlace) => void
}

// «Где вы?» — the browser's location in one tap, or a district by name for those who do not
// share it (or do not know how). The choice stays on the device for the map, branches and picks.
export const PlacePickerSheet = ({ onClose, onPicked }: PlacePickerSheetProps) => {
  const current = useMyPlace()
  const [state, setState] = useState<'idle' | 'locating' | 'denied'>('idle')

  const pick = (place: MyPlace) => {
    saveMyPlace(place)
    onPicked?.(place)
    onClose()
  }

  const locate = () => {
    if (!navigator.geolocation) {
      setState('denied')
      return
    }
    setState('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        pick({ label: 'Моё место', lat: coords.latitude, lng: coords.longitude, source: 'gps' }),
      () => setState('denied'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  return (
    <Sheet title='Где вы?' cancelLabel='Закрыть' onClose={onClose}>
      <div className={sheet.group}>
        <div className={sheet.list}>
          <button
            type='button'
            className={`${sheet.row} ${styles.locate}`}
            onClick={locate}
            disabled={state === 'locating'}
          >
            <NavigationArrow weight='fill' aria-hidden className={styles.locateIcon} />
            <span>{state === 'locating' ? 'Определяем…' : 'Определить автоматически'}</span>
          </button>
        </div>
        <p className={sheet.groupFooter}>
          {state === 'denied'
            ? 'Телефон не дал узнать место — выберите район ниже.'
            : 'Телефон спросит разрешение. Можно и без него — выберите район.'}
        </p>
      </div>

      <div className={sheet.group}>
        <SectionCaption>Район Бишкека</SectionCaption>
        <div className={sheet.list}>
          {BISHKEK_AREAS.map((area) => {
            const isChosen = current?.source === 'area' && current.label === area.label
            return (
              <button
                key={area.label}
                type='button'
                className={`${sheet.row} ${styles.area}`}
                aria-pressed={isChosen}
                onClick={() => pick({ ...area, source: 'area' })}
              >
                <span>{area.label}</span>
                {isChosen && <Check weight='bold' aria-hidden className={styles.check} />}
              </button>
            )
          })}
        </div>
      </div>

      {current && (
        <div className={sheet.group}>
          <div className={sheet.list}>
            <button
              type='button'
              className={`${sheet.row} ${sheet.danger}`}
              onClick={() => {
                saveMyPlace(null)
                onClose()
              }}
            >
              Не учитывать место
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
