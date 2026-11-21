import { ANY_SPECIALIST_ID } from '@/entities/booking'
import type { Service, Specialist } from '@/shared/api/types'
import { MAX_VISIT_SERVICES } from '../config/visit'

// A visit of several services done one after another by one master («маникюр и педикюр»).

type MasterLike = Pick<Specialist, 'id' | 'serviceIds' | 'branchId'>

const isInBranch = (master: MasterLike, branchId: string | undefined) =>
  !branchId || !master.branchId || master.branchId === branchId

/** Masters of the branch (or of every branch) who do every one of the services. */
const getMastersForAll = <Master extends MasterLike>(
  masters: Master[],
  serviceIds: string[],
  branchId?: string,
) =>
  serviceIds.length === 0
    ? []
    : masters.filter(
        (master) =>
          isInBranch(master, branchId) && serviceIds.every((id) => master.serviceIds.includes(id)),
      )

/**
 * The visit as one service for everything that shows a service: names joined with « + », the
 * price, length and deposit added up; the first service's id, category and picture.
 */
const combineServices = (services: Service[]): Service | undefined => {
  const [first, ...rest] = services
  if (!first) return undefined
  if (rest.length === 0) return first
  const deposit = services.reduce((sum, service) => sum + (service.deposit ?? 0), 0)
  return {
    ...first,
    name: services.map((service) => service.name).join(' + '),
    price: services.reduce((sum, service) => sum + service.price, 0),
    durationMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
    deposit: deposit || null,
  }
}

/**
 * Services that can join the visit: not chosen yet, and someone who does everything chosen (the
 * chosen master, when one is) does them too. Nothing once the visit is full.
 */
const getAddableServices = <Master extends MasterLike>({
  services,
  masters,
  chosenIds,
  specialistId,
  branchId,
}: {
  services: Service[]
  masters: Master[]
  chosenIds: string[]
  /** A master already chosen («любой» or none: anyone who does everything counts). */
  specialistId: string | null
  branchId?: string
}) => {
  if (chosenIds.length === 0 || chosenIds.length >= MAX_VISIT_SERVICES) return []
  const candidates = masters.filter(
    (master) => !specialistId || specialistId === ANY_SPECIALIST_ID || master.id === specialistId,
  )
  return services.filter(
    (service) =>
      !chosenIds.includes(service.id) &&
      getMastersForAll(candidates, [...chosenIds, service.id], branchId).length > 0,
  )
}

export { combineServices, getAddableServices, getMastersForAll }
