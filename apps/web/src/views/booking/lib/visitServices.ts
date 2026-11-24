import { ANY_SPECIALIST_ID } from '@/entities/booking'
import type { Service, Specialist } from '@/shared/api/types'
import { MAX_VISIT_SERVICES } from '../config/visit'

// A visit of several services done one after another by one master (a manicure and a pedicure).

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
 * The visit as one service for everything that shows a service: names joined with “ + ”, the
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
  /** A master already chosen (any or none: anyone who does everything counts). */
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

// Service names are stored in Russian, so the words below are matched as data.
// What a service is, by its head words, to tell the same thing under another name (“Классический
// массаж” and “Массаж спины”, “Женская стрижка” and “Детская стрижка”). Words that only describe it
// are left out: adjectives (“классический”, “мужская”) and what follows “с”, “без”, “для”, “на”
// (“с покрытием”), or “Маникюр с покрытием” and “Педикюр с покрытием” would read as one thing.
// The roots: words of four letters and more, their first five letters, “ё” read as “е”.
const DESCRIBING_ENDING = /(ий|ый|ой|ая|яя|ое|ые)$/
const PREPOSITIONS = new Set(['с', 'со', 'без', 'для', 'на'])

const wordRoots = (name: string) => {
  const words = name
    .toLowerCase()
    .replaceAll('ё', 'е')
    .split(/[^a-zа-я]+/)
    .filter(Boolean)
  const tail = words.findIndex((word) => PREPOSITIONS.has(word))
  return (tail === -1 ? words : words.slice(0, tail))
    .filter((word) => word.length >= 4 && !DESCRIBING_ENDING.test(word))
    .map((word) => word.slice(0, 5))
}

/**
 * The one service offered for the visit, like a side dish under the main one: an add-on, never an
 * alternative to what is chosen. Not the same kind (another category, when the menu has more than
 * one) and not the same thing under another name (a shared word); of the rest, what the place
 * sells most first, else the menu's own order. Nothing fits, nothing is offered. Once per visit:
 * a visit that already took one is not offered another (the line goes once it is accepted).
 */
const pickOfferedService = (addable: Service[], chosen: Service[], menu: Service[]) => {
  if (chosen.length !== 1) return undefined
  const hasCategories = new Set(menu.map((service) => service.categoryId)).size > 1
  const chosenCategories = new Set(chosen.map((service) => service.categoryId))
  const chosenRoots = new Set(chosen.flatMap((service) => wordRoots(service.name)))
  const addOns = addable.filter(
    (service) =>
      !(hasCategories && chosenCategories.has(service.categoryId)) &&
      !wordRoots(service.name).some((root) => chosenRoots.has(root)),
  )
  return [...addOns].sort((left, right) => Number(right.isPopular) - Number(left.isPopular))[0]
}

export { combineServices, getAddableServices, getMastersForAll, pickOfferedService }
