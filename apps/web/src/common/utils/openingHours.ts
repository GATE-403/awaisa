import { COMPANY } from '@/constants/company'

type OpeningStatus = {
  isOpen: boolean
  label: string
}

const formatClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const getOpeningStatus = (minutes: number): OpeningStatus => {
  const isOpen = minutes >= COMPANY.opensAtMinutes && minutes < COMPANY.closesAtMinutes
  if (isOpen) return { isOpen, label: `Открыто до ${formatClock(COMPANY.closesAtMinutes)}` }
  if (minutes < COMPANY.opensAtMinutes) {
    return { isOpen, label: `Откроемся в ${formatClock(COMPANY.opensAtMinutes)}` }
  }

  return { isOpen, label: `Откроемся завтра в ${formatClock(COMPANY.opensAtMinutes)}` }
}
