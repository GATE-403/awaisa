import { formatNationalPhone } from '@awaisa/region'
import { REGION } from '@/shared/config/region'

const { callingCode, nationalDigits } = REGION.phone
const NATIONAL_NUMBER = new RegExp(`^\\+${callingCode}(\\d{${nationalDigits}})$`)

/** «+996555123456» → «+996 555 123 456»; a number of another country stays as it is. */
export const formatPhone = (phone: string) => {
  const national = NATIONAL_NUMBER.exec(phone)?.[1]
  return national ? formatNationalPhone(REGION, national) : phone
}
