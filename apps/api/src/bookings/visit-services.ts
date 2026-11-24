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
      ? 'No specialist does all the chosen services'
      : 'No specialist at this branch does this service'
  }
  return isSeveral
    ? "This specialist doesn't do all the chosen services"
    : "This specialist doesn't do the chosen service"
}

export { mastersForAll, noMasterMessage, visitCost, visitLength }
