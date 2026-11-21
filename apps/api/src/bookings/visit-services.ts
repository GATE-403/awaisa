// A visit of one or several services done one after another by one master: pure helpers,
// unit-tested in visit-services.spec.ts.
import { ANY_SPECIALIST_ID } from './booking-rules.js'

type Priced = { price: number; durationMinutes: number }

/** The visit's length: every service one after another. */
const visitLength = (services: Priced[]) =>
  services.reduce((sum, service) => sum + service.durationMinutes, 0)

const visitCost = (services: Priced[]) => services.reduce((sum, service) => sum + service.price, 0)

/** Masters who do every service, in the order of the first service's list. */
const mastersForAll = <Master extends { id: string }>(perService: Master[][]) => {
  const [first = [], ...rest] = perService
  return first.filter((master) =>
    rest.every((masters) => masters.some((other) => other.id === master.id)),
  )
}

const noMasterMessage = (specialistId: string, isSeveral: boolean) => {
  if (specialistId === ANY_SPECIALIST_ID) {
    return isSeveral
      ? 'Нет мастера, который делает все выбранные услуги'
      : 'В этом филиале нет мастеров на эту услугу'
  }
  return isSeveral
    ? 'Этот мастер не делает все выбранные услуги'
    : 'Этот мастер не выполняет выбранную услугу'
}

export { mastersForAll, noMasterMessage, visitCost, visitLength }
