import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { Translate } from '@/shared/i18n'

// The units a stock item is counted in: the keys are stored with the item, the labels are shown.
const UNIT_LABELS: Record<string, MessageDescriptor> = {
  pcs: msg`pcs`,
  ml: msg`ml`,
  g: msg`g`,
  pair: msg`pair`,
  pack: msg`pack`,
}

const UNITS = Object.keys(UNIT_LABELS)

/** The unit in the page's language; one typed before the fixed list is shown as it is. */
const unitLabel = (unit: string, t: Translate) => {
  const label = UNIT_LABELS[unit]
  return label ? t(label) : unit
}

export { UNITS, unitLabel }
