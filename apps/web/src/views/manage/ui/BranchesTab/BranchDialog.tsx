import { Input } from '@awaisa/ui/Input'
import { Switch } from '@awaisa/ui/Switch'
import dynamic from 'next/dynamic'
import { type FormEvent, useRef, useState } from 'react'
import { reverseAddress, searchAddress } from '@/shared/api/clientApi'
import type { Branch, BranchInput, GeoPlace } from '@/shared/api/types'
import { useT } from '@/shared/i18n'
import { maskPhoneInput } from '@/shared/lib/inputMasks'
import { HoldButton } from '@/shared/ui/HoldButton/HoldButton'
import type { Point } from '@/shared/ui/MapView/MapView'
import { SectionCaption } from '@/shared/ui/SectionCaption/SectionCaption'
import { Sheet } from '@/shared/ui/Sheet/Sheet'
import sheet from '@/shared/ui/Sheet/Sheet.module.css'
import styles from './BranchDialog.module.css'

// Leaflet needs the browser.
const LocationPicker = dynamic(
  () => import('@/shared/ui/MapView/LocationPicker').then((module) => module.LocationPicker),
  { ssr: false },
)

interface BranchDialogProps {
  branch: Branch | null
  canDelete: boolean
  onClose: () => void
  onSave: (input: BranchInput) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

const FORM_ID = 'branch-form'
const SEARCH_DELAY_MS = 350
const REVERSE_DELAY_MS = 500
const MIN_QUERY = 3

export const BranchDialog = ({
  branch,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: BranchDialogProps) => {
  const t = useT()
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [isActive, setIsActive] = useState(branch?.isActive ?? true)
  const [point, setPoint] = useState<Point | null>(
    branch?.latitude != null && branch.longitude != null
      ? { latitude: branch.latitude, longitude: branch.longitude }
      : null,
  )
  const [isSaving, setIsSaving] = useState(false)
  // The address and the pin are one thing: a picked address moves the pin, a moved pin fills an
  // empty address or offers its own ("don't type it separately every time").
  const [places, setPlaces] = useState<GeoPlace[]>([])
  const [target, setTarget] = useState<Point | null>(null)
  const [pinPlace, setPinPlace] = useState<GeoPlace | null>(null)
  const addressRef = useRef(address)
  const searchTimer = useRef<number | undefined>(undefined)
  const searchAbort = useRef<AbortController | null>(null)
  const reverseTimer = useRef<number | undefined>(undefined)
  const reverseAbort = useRef<AbortController | null>(null)

  const changeAddress = (value: string) => {
    setAddress(value)
    addressRef.current = value
    window.clearTimeout(searchTimer.current)
    searchAbort.current?.abort()
    if (value.trim().length < MIN_QUERY) {
      setPlaces([])
      return
    }
    searchTimer.current = window.setTimeout(() => {
      const controller = new AbortController()
      searchAbort.current = controller
      searchAddress(value.trim(), controller.signal)
        .then(setPlaces)
        // No suggestions when the service is away: the owner types the address as before.
        .catch(() => undefined)
    }, SEARCH_DELAY_MS)
  }

  const pickPlace = (place: GeoPlace) => {
    const next = { latitude: place.latitude, longitude: place.longitude }
    setAddress(place.address)
    addressRef.current = place.address
    setPlaces([])
    setPinPlace(null)
    setPoint(next)
    setTarget(next)
  }

  const changePoint = (next: Point, source: 'user' | 'target') => {
    setPoint(next)
    if (source === 'target') return
    window.clearTimeout(reverseTimer.current)
    reverseAbort.current?.abort()
    reverseTimer.current = window.setTimeout(() => {
      const controller = new AbortController()
      reverseAbort.current = controller
      reverseAddress(next, controller.signal)
        .then(({ place }) => {
          if (!place) {
            setPinPlace(null)
            return
          }
          if (!addressRef.current.trim()) {
            setAddress(place.address)
            addressRef.current = place.address
            setPinPlace(null)
            return
          }
          setPinPlace(place.address === addressRef.current.trim() ? null : place)
        })
        .catch(() => undefined)
    }, REVERSE_DELAY_MS)
  }

  const applyPinAddress = () => {
    if (!pinPlace) return
    setAddress(pinPlace.address)
    addressRef.current = pinPlace.address
    setPinPlace(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    const saved = await onSave({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      isActive,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
    })
    setIsSaving(false)
    if (saved) onClose()
  }

  const handleDelete = async () => {
    if (!branch) return
    if (await onDelete(branch.id)) onClose()
  }

  return (
    <Sheet
      title={branch ? t('Branch') : t('New branch')}
      onClose={onClose}
      action={{ label: t('Save'), form: FORM_ID, disabled: !name.trim() || isSaving }}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className={sheet.form}>
        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Name')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                placeholder={t('Centre, Dzhal, Asanbai')}
                value={name}
                onValueChange={setName}
                maxLength={120}
                autoFocus={!branch}
              />
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Address')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                placeholder={t('125 Toktogul St')}
                value={address}
                onValueChange={changeAddress}
                maxLength={200}
                autoComplete='off'
              />
            </span>
          </label>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Phone')}</span>
            <span className={sheet.rowControl}>
              <Input
                variant='plain'
                type='tel'
                inputMode='tel'
                placeholder={t('Same as the business')}
                value={phone}
                onValueChange={(value) => setPhone(maskPhoneInput(value))}
              />
            </span>
          </label>
        </div>

        {places.length > 0 && (
          <section className={sheet.group} aria-label={t('Addresses found')}>
            <ul className={sheet.list}>
              {places.map((place) => (
                <li key={`${place.address}-${place.latitude}`}>
                  <button
                    type='button'
                    className={`${sheet.row} ${styles.place}`}
                    onClick={() => pickPlace(place)}
                  >
                    <span className={styles.placeText}>
                      <span className={styles.placeAddress}>{place.address}</span>
                      {place.area && <span className={styles.placeArea}>{place.area}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className={sheet.groupFooter}>
              {t('Pick an address and the pin will move on the map by itself.')}
            </p>
          </section>
        )}

        <section className={sheet.group} aria-label={t('Map pin')}>
          <SectionCaption>{t('Map pin')}</SectionCaption>
          <LocationPicker value={point} onChange={changePoint} target={target} />
          {pinPlace ? (
            <p className={sheet.groupFooter}>
              {t('From the pin: {address}.', { address: pinPlace.address })}{' '}
              <button type='button' className={styles.useAddress} onClick={applyPinAddress}>
                {t('Use this address')}
              </button>
            </p>
          ) : (
            <p className={sheet.groupFooter}>
              {point
                ? t('Move the map so the pin points at the entrance: the address fills itself in.')
                : t(
                    'Start typing the address or move the map: the address and the pin fill each other in.',
                  )}
            </p>
          )}
        </section>

        <div className={sheet.list}>
          <label className={sheet.row}>
            <span className={sheet.rowLabel}>{t('Accepts clients')}</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </label>
        </div>

        {branch && canDelete && (
          <HoldButton onConfirm={handleDelete}>{t('Delete branch')}</HoldButton>
        )}
      </form>
    </Sheet>
  )
}
